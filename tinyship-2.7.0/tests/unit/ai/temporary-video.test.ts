import { beforeEach, describe, expect, test, vi } from 'vitest';
vi.mock('@libs/database', async () => ({ ...(await import('../../helpers/video-d1')).testDatabase, getDialect: () => 'd1' }));
vi.mock('@libs/database/schema', () => import('../../../libs/database/schema/sqlite'));
vi.mock('../../../libs/ai/video', () => ({ createVideoTask: vi.fn(), queryVideoTask: vi.fn() }));
import { resetVideoDatabase, testDatabase } from '../../helpers/video-d1';
import { createVideoTask, queryVideoTask } from '../../../libs/ai/video';
import { createTemporaryVideo, readTemporaryVideoTask } from '../../../libs/ai/temporary-video';
import { getVideoTaskRecord } from '../../../libs/ai/video-task-store';
import { reserveVideoTrial, trialKeys } from '../../../libs/ai/video-trial';

const options = { provider: 'autodl' as const, model: 'minimax-h3', prompt: 'fixed prompt', referenceImageUrls: ['https://media.test/uploads/owner/a.jpg'], size: '768p横', duration: 10 };
describe('temporary unpaid generation admission', () => {
  beforeEach(() => {
    resetVideoDatabase(); vi.clearAllMocks();
    let counter = 0;
    vi.mocked(createVideoTask).mockImplementation(async () => ({ provider: 'autodl', model: 'minimax-h3', providerTaskId: `temporary-provider-${++counter}` }));
    vi.mocked(queryVideoTask).mockResolvedValue({ status: 'processing' });
  });

  test('twenty concurrent direct submissions create one owner task and no credit or purchase rows', async () => {
    const results = await Promise.allSettled(Array.from({ length: 20 }, () => createTemporaryVideo(options, 'owner', 'browser-a')));
    expect(createVideoTask).toHaveBeenCalledTimes(1);
    const fulfilled = results.filter(result => result.status === 'fulfilled').map(result => result.value);
    expect(fulfilled.length).toBeGreaterThan(0);
    expect(new Set(fulfilled.map(task => task.id)).size).toBe(1);
    expect(testDatabase.sqlite.prepare('SELECT COUNT(*) AS count FROM video_purchase').get()).toEqual({ count: 0 });
    expect(testDatabase.sqlite.prepare('SELECT COUNT(*) AS count FROM credit_transaction').get()).toEqual({ count: 0 });
    expect(testDatabase.sqlite.prepare('SELECT COUNT(*) AS count FROM video_task').get()).toEqual({ count: 1 });
  });

  test.each(['succeeded', 'failed'] as const)('allows another generation after %s and ignores historical one-video usage', async status => {
    const legacyReservation = await reserveVideoTrial(trialKeys('old-browser', 'owner'), 'owner');
    testDatabase.sqlite.prepare("UPDATE video_trial SET state = 'used' WHERE reservation_id = ?").run(legacyReservation);
    const first = await createTemporaryVideo(options, 'owner', 'browser-a');
    vi.mocked(queryVideoTask).mockResolvedValue(status === 'succeeded'
      ? { status, result: { videoUrl: 'https://media.test/output.mp4', provider: 'autodl', model: 'minimax-h3' } }
      : { status, errorMessage: 'provider rejected the request' });
    const refreshed = await readTemporaryVideoTask('owner', 'browser-a');
    expect(refreshed?.status).toBe(status);
    const second = await createTemporaryVideo(options, 'owner', 'browser-a');
    expect(second.id).not.toBe(first.id);
    expect(createVideoTask).toHaveBeenCalledTimes(2);
    expect(testDatabase.sqlite.prepare('SELECT state FROM video_trial WHERE key = ?').get('user:owner')).toEqual({ state: 'used' });
  });

  test('does not expose another owners task on a shared browser or duplicate a running task in a new browser', async () => {
    const first = await createTemporaryVideo(options, 'owner', 'browser-a');
    expect(await readTemporaryVideoTask('different-user', 'browser-a')).toBeUndefined();
    await expect(createTemporaryVideo(options, 'different-user', 'browser-a')).rejects.toMatchObject({ code: 'trial_processing' });
    expect((await readTemporaryVideoTask('owner', 'browser-b'))?.id).toBe(first.id);
    expect((await createTemporaryVideo(options, 'owner', 'browser-b')).id).toBe(first.id);
    expect(await getVideoTaskRecord(first.id, 'different-user')).toBeUndefined();
    expect(createVideoTask).toHaveBeenCalledTimes(1);
  });

  test('an ambiguous submission is not submitted a second time', async () => {
    vi.mocked(createVideoTask).mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(createTemporaryVideo(options, 'owner', 'browser-a')).rejects.toThrow('Failed to fetch');
    await expect(createTemporaryVideo(options, 'owner', 'browser-a')).rejects.toMatchObject({ code: 'trial_processing' });
    expect(createVideoTask).toHaveBeenCalledTimes(1);
  });

  test('a definite provider input rejection releases admission for a corrected request', async () => {
    vi.mocked(createVideoTask).mockRejectedValueOnce(new Error('AutoDL API HTTP error: 422'));
    await expect(createTemporaryVideo(options, 'owner', 'browser-a')).rejects.toThrow('422');
    expect((await createTemporaryVideo(options, 'owner', 'browser-a')).status).toBe('processing');
    expect(createVideoTask).toHaveBeenCalledTimes(2);
  });
});
