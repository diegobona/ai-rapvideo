import { beforeEach, describe, expect, test, vi } from 'vitest';

const state = vi.hoisted(() => ({ userId: 'owner' }));
vi.mock('@libs/auth', () => ({ auth: { api: { getSession: async () => state.userId ? { user: { id: state.userId, isAnonymous: true } } : null } } }));
vi.mock('@libs/database', async () => ({ ...(await import('../../helpers/video-d1')).testDatabase, getDialect: () => 'd1' }));
vi.mock('@libs/database/schema', () => import('../../../libs/database/schema/sqlite'));
vi.mock('@tanstack/react-router', () => ({ createFileRoute: () => (options: unknown) => options }));
vi.mock('@/lib/with-request-db', () => ({ withCfDb: (fn: unknown) => fn }));
vi.mock('../../../libs/ai/deepseek-rap-lyrics', async original => ({ ...await original<typeof import('../../../libs/ai/deepseek-rap-lyrics')>(), generateRapLyricsDraft: vi.fn() }));

import { resetVideoDatabase, testDatabase } from '../../helpers/video-d1';
import { Route } from '../../../apps/tanstack-app/src/routes/api/video-generate/lyrics';
import { generateRapLyricsDraft, RapLyricsDraftError } from '../../../libs/ai/deepseek-rap-lyrics';

const draft = { language: 'en' as const, lines: ['We light up the night', 'Our friendship shines so bright', 'We step into the light', 'Together we take our flight'] as [string, string, string, string] };
const post = (body: unknown, headers: Record<string, string> = {}) => (Route as any).server.handlers.POST({ request: new Request('https://ai-rapvideo.co/api/video-generate/lyrics', { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: typeof body === 'string' ? body : JSON.stringify(body) }) }) as Promise<Response>;

describe('private anonymous-session lyric drafting endpoint', () => {
  beforeEach(() => { resetVideoDatabase(); vi.clearAllMocks(); state.userId = 'owner'; vi.mocked(generateRapLyricsDraft).mockResolvedValue(draft); });
  test('drafts English by default without photos, video jobs, purchases or account registration', async () => {
    const response = await post({ topic: '朋友生日' });
    expect(response.status).toBe(200); expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(await response.json()).toEqual({ success: true, data: { lyrics: draft } });
    expect(generateRapLyricsDraft).toHaveBeenCalledWith({ language: 'en', topic: '朋友生日' });
    expect(testDatabase.sqlite.prepare('SELECT COUNT(*) AS count FROM video_task').get()).toEqual({ count: 0 });
    expect(testDatabase.sqlite.prepare('SELECT COUNT(*) AS count FROM video_purchase').get()).toEqual({ count: 0 });
  });
  test('requires an owned session and same-origin mutation before drafting', async () => {
    state.userId = ''; expect((await post({ topic: 'friends' })).status).toBe(401);
    state.userId = 'owner'; expect((await post({}, { origin: 'https://attacker.test' })).status).toBe(403);
    expect((await post({}, { 'sec-fetch-site': 'cross-site' })).status).toBe(403);
    expect(generateRapLyricsDraft).not.toHaveBeenCalled();
  });
  test.each([{ topic: 'x'.repeat(241) }, { topic: 3 }, { language: 'fr' }, { photo: 'https://photo.test' }, { taskId: 'not-supported' }, 'malformed json', ' '.repeat(2049)])('rejects bounded invalid payload before provider calls: %j', async body => {
    expect((await post(body)).status).toBe(400); expect(generateRapLyricsDraft).not.toHaveBeenCalled();
  });
  test('limits repeat requests durably by owner before paid calls', async () => {
    for (let i = 0; i < 10; i++) expect((await post({})).status).toBe(200);
    expect((await post({})).status).toBe(429); expect(generateRapLyricsDraft).toHaveBeenCalledTimes(10);
  });
  test('missing key and upstream failure return safe codes without internal details', async () => {
    vi.mocked(generateRapLyricsDraft).mockRejectedValueOnce(new RapLyricsDraftError('lyrics_service_unavailable', 503));
    const missing = await post({}); expect(missing.status).toBe(503); expect(await missing.json()).toEqual({ error: 'lyrics_service_unavailable' });
    vi.mocked(generateRapLyricsDraft).mockRejectedValueOnce(new Error('sk-private-provider-detail'));
    const failed = await post({}); expect(failed.status).toBe(503); expect(JSON.stringify(await failed.json())).not.toContain('private');
  });
});
