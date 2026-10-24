import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { MEDIA_RETENTION_MS } from '../../../config/mediaRetention';

const state = vi.hoisted(() => ({ userId: 'owner', get: vi.fn() }));
vi.mock('@libs/auth', () => ({
  auth: { api: { getSession: async () => state.userId ? { user: { id: state.userId } } : null } },
}));
vi.mock('@libs/database', () => ({ isWorkersRuntime: true }));
vi.mock('cloudflare:workers', () => ({
  env: { R2_PUBLIC_URL: 'https://media.test', R2_BUCKET: { get: state.get } },
}));
vi.mock('@tanstack/react-router', () => ({ createFileRoute: () => (options: unknown) => options }));
vi.mock('@/lib/with-request-db', () => ({ withCfDb: (handler: unknown) => handler }));

import { Route } from '../../../apps/tanstack-app/src/routes/api/video-generate/download';

const now = Date.UTC(2026, 9, 20, 16);
const ownedUrl = 'https://media.test/generated-videos/owner/task_123.mp4';
const bytes = new Uint8Array([0, 0, 0, 24, 102, 116, 121, 112]);
const call = (url: unknown, rawBody?: string): Promise<Response> =>
  (Route as unknown as {
    server: { handlers: { POST: (context: { request: Request }) => Promise<Response> } };
  }).server.handlers.POST({ request: new Request('https://app.test/api/video-generate/download', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: rawBody ?? JSON.stringify({ url }),
  }) });

describe('managed R2 video downloads', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.userId = 'owner';
    vi.spyOn(Date, 'now').mockReturnValue(now);
    vi.stubGlobal('fetch', vi.fn(() => { throw new Error('Managed downloads must use the R2 binding'); }));
    state.get.mockResolvedValue({ uploaded: new Date(now - 60_000), body: new Response(bytes).body });
  });
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

  test('streams an owned current video from the native R2 binding', async () => {
    const response = await call(ownedUrl);
    expect(response.status).toBe(200);
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(bytes);
    expect(state.get).toHaveBeenCalledExactlyOnceWith('generated-videos/owner/task_123.mp4');
    expect(fetch).not.toHaveBeenCalled();
    expect(response.headers.get('Content-Type')).toBe('video/mp4');
    expect(response.headers.get('Content-Disposition')).toBe('attachment; filename="rumpelstiltskin-ai.mp4"');
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
  });

  test('rejects another owner before reading any bucket object', async () => {
    const response = await call(ownedUrl.replace('/owner/', '/different-owner/'));
    expect(response.status).toBe(404);
    expect(state.get).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  test('expires videos at exactly 24 hours and afterward and cancels their streams', async () => {
    for (const extraAge of [0, 1, 60_000]) {
      const body = new Response(bytes).body!;
      const cancel = vi.spyOn(body, 'cancel');
      state.get.mockResolvedValueOnce({ uploaded: new Date(now - MEDIA_RETENTION_MS - extraAge), body });
      const response = await call(ownedUrl);
      expect(response.status).toBe(410);
      expect(cancel).toHaveBeenCalledOnce();
    }
    expect(fetch).not.toHaveBeenCalled();
  });

  test('returns a current video one millisecond before its expiry', async () => {
    state.get.mockResolvedValueOnce({ uploaded: new Date(now - MEDIA_RETENTION_MS + 1), body: new Response(bytes).body });
    const response = await call(ownedUrl);
    expect(response.status).toBe(200);
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(bytes);
    expect(fetch).not.toHaveBeenCalled();
  });

  test('returns 410 for an object already removed from R2 without an upstream fallback', async () => {
    state.get.mockResolvedValueOnce(null);
    expect((await call(ownedUrl)).status).toBe(410);
    expect(fetch).not.toHaveBeenCalled();
  });

  test('rejects malformed and unrelated managed URLs without storage or network reads', async () => {
    for (const url of [
      undefined, null, 42, {},
      `${ownedUrl}?signature=ignored`, `${ownedUrl}#fragment`,
      ownedUrl.replace('https:', 'http:'),
      ownedUrl.replace('media.test/', 'media.test.attacker.test/'),
      ownedUrl.replace('https://', 'https://user:password@'),
      ownedUrl.replace('/generated-videos/', '/uploads/'),
      ownedUrl.replace('/owner/', '/owner/../owner/'),
      ownedUrl.replace('/owner/', '/%6fwner/'),
      ownedUrl.replace('.mp4', '.png'),
    ]) expect((await call(url)).status).toBe(400);
    expect(state.get).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  test('requires an authenticated owner before storage or network access', async () => {
    state.userId = '';
    expect((await call(ownedUrl)).status).toBe(401);
    expect(state.get).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  test('returns 400 for malformed JSON without reading storage or the network', async () => {
    expect((await call(undefined, '{')).status).toBe(400);
    expect(state.get).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });
});
