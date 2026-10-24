import { afterEach, describe, expect, test, vi } from 'vitest';
import { generateRapLyricsDraft } from '../../../libs/ai/deepseek-rap-lyrics';

const draft = { language: 'en', lines: ['We light up the night', 'Our friendship shines so bright', 'We step into the light', 'Together we take our flight'] };
const completion = (content: unknown = JSON.stringify(draft), finish_reason = 'stop') => new Response(JSON.stringify({ choices: [{ finish_reason, message: { content } }] }), { headers: { 'Content-Type': 'application/json' } });

describe('server-only DeepSeek lyric drafting', () => {
  afterEach(() => vi.unstubAllEnvs());
  test.each([['en'], ['zh']])('rejects a JSON array language before calling DeepSeek: %j', async language => {
    const transport = vi.fn(async () => completion());
    await expect(generateRapLyricsDraft({ language: [language] }, { fetch: transport, apiKey: 'test-key' })).rejects.toMatchObject({ code: 'invalid_lyrics_request', status: 400 });
    expect(transport).not.toHaveBeenCalled();
  });
  test('calls only the official JSON endpoint with English selected independently from Chinese topic', async () => {
    const transport = vi.fn(async () => completion());
    expect(await generateRapLyricsDraft({ topic: '祝我的朋友生日快乐' }, { fetch: transport, apiKey: 'unit-test-key' })).toEqual(draft);
    const [url, init] = transport.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://api.deepseek.com/chat/completions');
    expect(init.headers).toMatchObject({ Authorization: 'Bearer unit-test-key' });
    const body = JSON.parse(String(init.body));
    expect(body).toMatchObject({ model: 'deepseek-flash', stream: false, thinking: { type: 'disabled' }, max_tokens: 512, response_format: { type: 'json_object' } });
    expect(body.messages[0].content).toContain('4–6');
    expect(JSON.parse(body.messages[1].content)).toEqual({ language: 'en', topic: '祝我的朋友生日快乐' });
    expect(body).not.toHaveProperty('images');
  });
  test('uses Chinese only for explicit language selection and validates the returned language', async () => {
    const chinese = { language: 'zh', lines: ['今天朋友一起登场', '笑声跟着节拍回荡', '今晚快乐放声歌唱', '我们的故事闪着光'] };
    expect(await generateRapLyricsDraft({ topic: '生日', language: 'zh' }, { apiKey: 'test', fetch: vi.fn(async () => completion(JSON.stringify(chinese))) })).toEqual(chinese);
    await expect(generateRapLyricsDraft({ language: 'zh' }, { apiKey: 'test', fetch: vi.fn(async () => completion()) })).rejects.toMatchObject({ status: 502 });
  });
  test('missing key, invalid topic/language never reach the provider', async () => {
    vi.stubEnv('DEEPSEEK_API_KEY', ''); const transport = vi.fn();
    await expect(generateRapLyricsDraft({}, { fetch: transport })).rejects.toMatchObject({ status: 503 });
    for (const input of [{ topic: 'a'.repeat(241) }, { topic: 42 }, { topic: '<Subject 1>' }, { language: 'fr' }, { model: 'override' }]) {
      await expect(generateRapLyricsDraft(input, { fetch: transport, apiKey: 'test' })).rejects.toMatchObject({ status: 400 });
    }
    expect(transport).not.toHaveBeenCalled();
  });
  test.each([
    () => completion('', 'stop'), () => completion(JSON.stringify(draft), 'length'), () => completion('not json'),
    () => completion(JSON.stringify({ ...draft, lines: ['one line'] })),
    () => new Response('private upstream content', { status: 401 }),
    () => new Response(JSON.stringify({ error: { message: 'private key information' } })),
  ])('rejects malformed/truncated/provider failures without inventing fallback lyrics', async makeResponse => {
    await expect(generateRapLyricsDraft({}, { apiKey: 'test', fetch: vi.fn(async () => makeResponse()) })).rejects.toMatchObject({ status: 502 });
  });
});
