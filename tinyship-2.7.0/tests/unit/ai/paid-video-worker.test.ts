import { expect, test, vi } from 'vitest';
const state = vi.hoisted(() => ({ fetch: vi.fn(async () => new Response('tanstack')) }));
vi.mock('@tanstack/react-start/server-entry', () => ({ default: { fetch: state.fetch } }));
vi.mock('@/lib/paid-video-recovery-object', () => ({ PaidVideoRecovery: class {} }));
import worker, { PaidVideoRecovery } from '../../../apps/tanstack-app/src/worker';
test('Worker preserves TanStack fetch and exports private alarm class without a cron handler', () => {
  expect(worker.fetch).toBe(state.fetch);
  expect(PaidVideoRecovery).toBeTypeOf('function');
  expect(worker).not.toHaveProperty('scheduled');
});
