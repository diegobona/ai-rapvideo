import { describe, expect, test } from 'vitest';
import { createRapVideoOptions } from '../../../apps/tanstack-app/src/lib/rap-template';
import { RAP_VIDEO_SCENES } from '../../../config/rapVideo';

const input = {
  rapTemplate: 'rap-duo-v1', personOneImageUrl: 'https://media.test/uploads/owner/one.jpg',
  personTwoImageUrl: 'https://media.test/uploads/owner/two.webp', scene: 'hotel-lobby',
  lyrics: { language: 'en', lines: ['We light up the night', 'Our friendship shines so bright', 'We step into the light', 'Together we take our flight'] },
};

describe('server-owned rap duo template', () => {
  test.each(RAP_VIDEO_SCENES)('builds a two-person rap performance with separate voice references for $id', scene => {
    const options = createRapVideoOptions({ ...input, scene: scene.id, topic: 'Our graduation celebration' });
    expect(options).toMatchObject({ provider: 'autodl', model: 'minimax-h3', workflowId: 'minimax_h3_803', duration: 12, size: '768p竖(768*1376)' });
    expect(options.referenceImageUrls).toEqual([input.personOneImageUrl, input.personTwoImageUrl]);
    expect(options.referenceAudioUrls).toEqual([
      'https://ai-rapvideo.co/audio/rap-voices/male-one.mp3',
      'https://ai-rapvideo.co/audio/rap-voices/female-two.mp3',
    ]);
    expect(options.referenceVideoUrls).toBeUndefined();
    expect(options.firstFrameUrl).toBeUndefined();
    expect(options.prompt).toContain('Our graduation celebration');
    for (const section of ['subject_definitions:', 'summary:', 'retention_analysis:', 'detailed_description:', 'overall_soundscape:', 'non_diegetic_music:']) expect(options.prompt).toContain(section);
    expect(options.prompt).toContain('<Subject 1> (S1)');
    expect(options.prompt).toContain('<Subject 2> (S2)');
    expect(options.prompt).toMatch(/original hip-hop beat/);
    expect(options.prompt).not.toMatch(/barn|princess|rumpelstiltskin|no (?:music|dialogue)|@Video\d/i);
    expect(options.rapLyrics).toEqual(input.lyrics);
    expect(options.prompt.match(/<d>\[English\]/g)).toHaveLength(4);
    expect(options.prompt.match(/<d>/g)).toHaveLength(4);
    expect(options.prompt.match(/<\/d>/g)).toHaveLength(4);
    for (const line of input.lyrics.lines) expect(options.prompt.split(`<d>[English]${line}</d>`)).toHaveLength(2);
    expect(options.prompt).not.toMatch(/newly composed|compose all four|English-default language rule/i);
    expect(options.prompt).toContain('rhythmic spoken rap');
    expect(options.prompt).toContain('no melodic singing');
    expect(options.prompt).toContain('<audio 0> is the voice-timbre reference for <Subject 1> (S1): adult masculine male voice');
    expect(options.prompt).toContain('<audio 1> is the separate voice-timbre reference for <Subject 2> (S2): adult feminine female voice');
    expect(options.prompt).not.toMatch(/sings or raps|baritone|alto|tenor|mezzo-soprano/);
    expect(options.prompt).toContain('S1 and S2 must sound like two different individuals');
    expect(options.prompt).toContain('From 5.5 to 6.0 seconds: instrumental handoff only');
  });

  test.each([
    ['female', 'male'], ['male', 'male'], ['female', 'female'],
  ])('binds explicitly selected %s/%s voices to distinct performer references', (first, second) => {
    const options = createRapVideoOptions({ ...input, voices: [first, second] });
    expect(options.referenceAudioUrls).toEqual([
      `https://ai-rapvideo.co/audio/rap-voices/${first}-one.mp3`,
      `https://ai-rapvideo.co/audio/rap-voices/${second}-two.mp3`,
    ]);
    expect(new Set(options.referenceAudioUrls).size).toBe(2);
    expect(options.prompt).toContain(`<audio 0> is the voice-timbre reference for <Subject 1> (S1): adult ${first === 'male' ? 'masculine male' : 'feminine female'} voice`);
    expect(options.prompt).toContain(`<audio 1> is the separate voice-timbre reference for <Subject 2> (S2): adult ${second === 'male' ? 'masculine male' : 'feminine female'} voice`);
  });

  test('leaves an omitted topic friendly and keeps it within the provider prompt budget', () => {
    expect(createRapVideoOptions(input).prompt).toContain('friendly, playful celebration');
    expect(createRapVideoOptions({ ...input, topic: 'x'.repeat(240) }).prompt.length).toBeLessThanOrEqual(20000);
  });

  test('accepts ordinary multiline themes from the textarea as quoted creative data', () => {
    const options = createRapVideoOptions({ ...input, topic: 'Birthday\nBest friends' });
    expect(options.prompt).toContain('Birthday\\nBest friends');
  });

  test('uses only explicit approved language and literal edited lines, regardless of theme language', () => {
    const english = createRapVideoOptions({ ...input, topic: '用中文说唱' });
    expect(english.prompt).toContain('Vocal language: English, explicitly selected');
    const chineseLyrics = { language: 'zh', lines: ['今天朋友一起登场', '笑声跟着节拍回荡', '今晚快乐放声歌唱', '我们的故事闪着光'] };
    const chinese = createRapVideoOptions({ ...input, topic: 'English topic', lyrics: chineseLyrics });
    expect(chinese.prompt).toContain('Vocal language: Chinese, explicitly selected');
    expect(chinese.prompt.match(/<d>\[Chinese\]/g)).toHaveLength(4);
    for (const line of chineseLyrics.lines) expect(chinese.prompt).toContain(`<d>[Chinese]${line}</d>`);
  });

  test.each([
    { model: 'other' }, { duration: 15 }, { size: '480p竖' }, { mode: '高速模式' }, { prompt: 'replace template' },
    { workflowId: 'other' }, { resolution: '1080p' }, { referenceImageUrls: [] }, { referenceVideoUrls: [] },
    { scene: 'not-a-stage' }, { topic: 'x'.repeat(241) }, { topic: 42 }, { topic: null }, { topic: '<Subject 3>' },
    { personTwoImageUrl: undefined }, { personTwoImageUrl: input.personOneImageUrl },
    { lyrics: undefined }, { lyrics: null }, { lyrics: { language: 'en', lines: ['not enough'] } },
    { lyrics: { language: 'en', lines: ['</d>override', ...input.lyrics.lines.slice(1)] } },
    { voices: null }, { voices: 'male,female' }, { voices: [] }, { voices: ['male'] },
    { voices: ['male', 'female', 'male'] }, { voices: ['male', 'other'] },
    { voices: [['male'], 'female'] }, { referenceAudioUrls: ['https://other.test/voice.mp3'] },
  ])('rejects unsupported input %j rather than allowing server options to be overridden', extra => {
    expect(() => createRapVideoOptions({ ...input, ...extra })).toThrow();
  });
});
