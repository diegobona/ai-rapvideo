import { beforeEach, describe, expect, test, vi } from 'vitest';
vi.mock('@libs/database', async () => ({
  ...(await import('../../helpers/video-d1')).testDatabase,
  getDialect: () => 'd1',
}));
vi.mock('@libs/database/schema', () => import('../../../libs/database/schema/sqlite'));
import { resetVideoDatabase } from '../../helpers/video-d1';
import * as purchases from '../../../libs/payment/video-purchases';

const options = {
  provider: 'autodl' as const,
  model: 'minimax-h3',
  prompt: 'fixed server prompt',
  referenceImageUrls: ['https://media.test/uploads/owner/a.jpg'],
};
async function draft() {
  return purchases.createVideoPurchaseDraft('owner', options, '/', 'same-input');
}
async function paid() {
  const p = await draft();
  await purchases.attachVideoCheckout(
    p.id,
    'owner',
    'cs_owned',
    'https://checkout.stripe.com/test',
  );
  return (await purchases.settleVideoPurchase(p.id, 'cs_owned', 'pi_owned'))!;
}
describe('durable paid video purchases on real D1-compatible SQL', () => {
  beforeEach(() => resetVideoDatabase());
  test('concurrent identical drafts reuse one fixed-price purchase', async () => {
    const rows = await Promise.all(Array.from({ length: 8 }, draft));
    expect(new Set(rows.map((p) => p.id)).size).toBe(1);
    expect(rows[0]).toMatchObject({ amount: 499, currency: 'usd', state: 'pending', taskId: null });
  });
  test('settlement requires the attached session and cannot be forged', async () => {
    const p = await draft();
    expect(await purchases.settleVideoPurchase(p.id, 'cs_fake', 'pi_fake')).toBeUndefined();
    expect((await purchases.getVideoPurchase(p.id, 'owner'))?.state).toBe('pending');
  });
  test('only one owner-scoped paid claim wins across concurrent requests', async () => {
    const p = await paid();
    expect(await purchases.claimVideoPurchase(p.id, 'different-user')).toBeUndefined();
    const rows = await Promise.all(
      Array.from({ length: 12 }, () => purchases.claimVideoPurchase(p.id, 'owner')),
    );
    expect(rows.filter(Boolean)).toHaveLength(1);
    expect((await purchases.getVideoPurchase(p.id, 'owner'))?.state).toBe('starting');
    expect(await purchases.getVideoPurchase(p.id, 'different-user')).toBeUndefined();
  });
  test('refund revocation prevents late payment or success resurrecting entitlement', async () => {
    const p = await paid();
    await purchases.requestVideoRefund(p.id, 'technical_failure');
    await purchases.settleVideoPurchase(p.id, 'cs_owned', 'pi_owned');
    expect(await purchases.claimVideoPurchase(p.id, 'owner')).toBeUndefined();
    await purchases.completeVideoPurchase(p.id);
    expect((await purchases.getVideoPurchase(p.id))?.state).toBe('refund_pending');
  });
  test('success wins over a late technical failure', async () => {
    const p = await paid();
    await purchases.claimVideoPurchase(p.id, 'owner');
    await purchases.attachVideoPurchaseTask(p.id, 'task-one');
    await purchases.completeVideoPurchase(p.id);
    await purchases.requestVideoRefund(p.id, 'late_failure');
    expect((await purchases.getVideoPurchase(p.id))?.state).toBe('succeeded');
    expect(await purchases.claimVideoPurchase(p.id, 'owner')).toBeUndefined();
    expect((await draft()).id).not.toBe(p.id);
  });
  test('refund leases admit one worker and a completed refund cannot regress', async () => {
    const p = await paid();
    await purchases.requestVideoRefund(p.id, 'failed');
    const leases = await Promise.all(
      Array.from({ length: 8 }, () => purchases.claimVideoRefund(p.id)),
    );
    expect(leases.filter(Boolean)).toHaveLength(1);
    await purchases.recordVideoRefund(p.id, { id: 're_full', status: 'succeeded', amount: 499 });
    await purchases.recordVideoRefund(p.id, { id: 're_full', status: 'pending', amount: 0 });
    expect(await purchases.getVideoPurchase(p.id)).toMatchObject({
      state: 'refunded',
      refundStatus: 'succeeded',
    });
  });
  test('manual partial refunds revoke generation without claiming a full refund', async () => {
    const p = await paid();
    await purchases.recordVideoRefund(p.id, { id: 're_partial', status: 'partial', amount: 200 });
    expect(await purchases.getVideoPurchase(p.id)).toMatchObject({
      state: 'refund_pending',
      refundStatus: 'partial',
    });
    expect(await purchases.claimVideoPurchase(p.id, 'owner')).toBeUndefined();
  });
});
