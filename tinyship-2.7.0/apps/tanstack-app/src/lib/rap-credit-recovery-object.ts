import { DurableObject } from 'cloudflare:workers';
import { withD1 } from '@libs/database';
import { reconcileRapCreditOrder } from '@libs/ai/rap-paid-credits';
import { getVideoTaskRecord } from '@libs/ai/video-task-store';
import { paidDanceDependencies } from './paid-dance-service';

type Seed = { orderId: string; version: number };
const RETRY_MS = 60_000;

/** One durable alarm per credit order; never exposes a public recovery endpoint. */
export class RapCreditRecovery extends DurableObject<Env> {
  async wake(orderId: string): Promise<void> {
    if (!/^[A-Za-z0-9_-]{10,100}$/.test(orderId)) throw new Error('Invalid order ID');
    await this.ctx.storage.transaction(async storage => {
      const current = await storage.get<Seed>('seed');
      if (current && current.orderId !== orderId) throw new Error('Order mismatch');
      await storage.put('seed', { orderId, version: (current?.version || 0) + 1 });
      const alarm = await storage.getAlarm();
      if (alarm === null || alarm > Date.now() + RETRY_MS) await storage.setAlarm(Date.now() + RETRY_MS);
    });
  }

  async alarm(): Promise<void> {
    const seed = await this.ctx.storage.transaction(async storage => {
      const current = await storage.get<Seed>('seed');
      // Persist the next retry before any database/provider/Stripe I/O.
      if (current) await storage.setAlarm(Date.now() + RETRY_MS);
      return current;
    });
    if (!seed) return;
    try {
      if (!this.env.DB || !withD1) throw new Error('Database unavailable');
      const order = await withD1(this.env.DB, async () => reconcileRapCreditOrder(seed.orderId, await paidDanceDependencies(undefined, false)));
      if (order && ['pending', 'starting', 'processing', 'refund_pending'].includes(order.state)) return;
      if (order?.taskId) {
        const task = await withD1(this.env.DB, () => getVideoTaskRecord(order.taskId!, order.userId));
        if (task?.status === 'processing') return;
      }
      await this.ctx.storage.transaction(async storage => {
        const current = await storage.get<Seed>('seed');
        if (current?.version !== seed.version) return;
        await storage.delete('seed');
        await storage.deleteAlarm();
      });
    } catch { console.error('Rap credit recovery will retry', { orderId: seed.orderId }); }
  }
}
