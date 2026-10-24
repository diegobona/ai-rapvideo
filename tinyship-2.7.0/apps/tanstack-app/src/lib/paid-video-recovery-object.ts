import { DurableObject } from 'cloudflare:workers';
import { withD1 } from '@libs/database';
import { reconcilePaidVideoPurchase } from '@libs/ai/paid-video';
import { paidDanceDependencies } from './paid-dance-service';

const RETRY_MS = 60_000;
type RecoverySeed = { purchaseId: string; version: number };

/** One SQLite-backed object per server-issued purchase ID. */
export class PaidVideoRecovery extends DurableObject<Env> {
  async wake(purchaseId: string): Promise<void> {
    if (!purchaseId || purchaseId.length > 100) throw new Error('Invalid purchase ID');
    await this.ctx.storage.transaction(async (storage) => {
      const seed = await storage.get<RecoverySeed>('seed');
      if (seed && seed.purchaseId !== purchaseId) throw new Error('Purchase mismatch');
      await storage.put('seed', { purchaseId, version: (seed?.version || 0) + 1 });
      const alarm = await storage.getAlarm();
      const next = Date.now() + RETRY_MS;
      if (alarm === null || alarm > next) await storage.setAlarm(next);
    });
  }

  async alarm(): Promise<void> {
    // Persist the next retry BEFORE D1, Stripe or provider I/O. This survives
    // crashes and repeated outages beyond the platform's finite retry budget.
    const seed = await this.ctx.storage.transaction(async (storage) => {
      const current = await storage.get<RecoverySeed>('seed');
      if (current) await storage.setAlarm(Date.now() + RETRY_MS);
      return current;
    });
    if (!seed) return;
    try {
      if (!this.env.DB || !withD1) throw new Error('D1 unavailable');
      const purchase = await withD1(this.env.DB, async () =>
        reconcilePaidVideoPurchase(seed.purchaseId, {
          // The alarm already owns its recovery schedule. Scheduling through
          // the binding here would RPC back into this same object.
          ...(await paidDanceDependencies(undefined, false)),
          deadline: Date.now() + 45_000,
        }),
      );
      if (purchase && !['succeeded', 'refunded', 'expired'].includes(purchase.state)) return;
      await this.ctx.storage.transaction(async (storage) => {
        const current = await storage.get<RecoverySeed>('seed');
        // External settlement/refund handlers may have persisted a newer wake
        // while this alarm awaited I/O. Never discard that handoff.
        if (current?.version !== seed.version) return;
        await storage.delete('seed');
        await storage.deleteAlarm();
      });
    } catch {
      console.error('Paid video alarm will retry', { purchaseId: seed.purchaseId });
      // The next alarm is already durable; no browser or webhook retry needed.
    }
  }
}
