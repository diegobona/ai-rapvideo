import { afterEach, describe, expect, test, vi } from 'vitest';
vi.mock('@tanstack/react-router', () => ({ createFileRoute: () => (options: unknown) => options }));
vi.mock('@/lib/with-request-db', () => ({ withCfDb: (fn: unknown) => fn }));
vi.mock('@libs/auth', () => ({ auth: { api: { getSession: async () => ({ user: { id: 'owner', isAnonymous: true } }) } } }));
vi.mock('@/lib/video-visitor', () => ({ sameOriginMutation: () => true, limitTrialIp: async () => {}, trialErrorResponse: vi.fn() }));
vi.mock('@libs/database', () => ({ isWorkersRuntime: false }));
const upload = vi.hoisted(() => vi.fn(async () => ({ key: 'uploads/owner/portrait.jpg', url: 'https://media.test/uploads/owner/portrait.jpg', size: 11 * 1024 * 1024 })));
vi.mock('@libs/storage', () => ({ createStorageProvider: () => ({ uploadFile: upload }) }));
import { Route } from '../../../apps/tanstack-app/src/routes/api/upload';

const send = (size: number) => {
  const data = new FormData();
  data.set('file', new File([new Uint8Array(size)], 'portrait.jpg', { type: 'image/jpeg' }));
  data.set('provider', 'r2');
  return (Route as any).server.handlers.POST({ request: new Request('http://localhost:7001/api/upload', { method: 'POST', body: data }) }) as Promise<Response>;
};

describe('rap portrait upload size', () => {
  afterEach(() => vi.clearAllMocks());
  test('accepts a photo above the former ten-megabyte cap', async () => {
    expect((await send(11 * 1024 * 1024)).status).toBe(200);
    expect(upload).toHaveBeenCalledOnce();
  });
  test('rejects photos over twenty megabytes before storage', async () => {
    expect((await send(20 * 1024 * 1024 + 1)).status).toBe(400);
    expect(upload).not.toHaveBeenCalled();
  });
});
