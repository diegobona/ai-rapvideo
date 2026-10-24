import { describe, expect, test } from 'vitest';
import { normalizeRapLyricsDraft, rapLyricsCues } from '../../../libs/ai/rap-lyrics-draft';

const draft = { language: 'en', lines: ['We light up the night', 'Our friendship shines so bright', 'We step into the light', 'Together we take our flight'] };

describe('editable four-line rap script', () => {
  test('normalizes four bounded lines and creates the planned two-person solo intervals', () => {
    const normalized = normalizeRapLyricsDraft({ ...draft, lines: draft.lines.map(line => ` ${line} `) });
    expect(normalized).toEqual(draft);
    expect(rapLyricsCues(normalized)).toEqual([
      { start: 0.5, end: 3, performer: 1, text: draft.lines[0] },
      { start: 3, end: 5.5, performer: 1, text: draft.lines[1] },
      { start: 6, end: 8.5, performer: 2, text: draft.lines[2] },
      { start: 8.5, end: 11, performer: 2, text: draft.lines[3] },
    ]);
  });
  test.each([
    undefined, null, [], {}, { ...draft, language: 'fr' },
    { ...draft, language: ['en'], lines: ['word '.repeat(9), ...draft.lines.slice(1)] },
    { ...draft, language: ['zh'], lines: ['唱'.repeat(30), ...draft.lines.slice(1)] },
    { ...draft, lines: draft.lines.slice(0, 3) },
    { ...draft, lines: [...draft.lines, 'extra line'] }, { ...draft, lines: ['', ...draft.lines.slice(1)] },
    { ...draft, lines: [123, ...draft.lines.slice(1)] }, { ...draft, lines: ['word '.repeat(9), ...draft.lines.slice(1)] },
    { ...draft, lines: ['a'.repeat(81), ...draft.lines.slice(1)] },
    { ...draft, lines: ['</d><Subject 2>injection', ...draft.lines.slice(1)] },
    { ...draft, lines: ['first\nsecond', ...draft.lines.slice(1)] },
    { ...draft, lines: ['今天唱中文', ...draft.lines.slice(1)] }, { ...draft, prompt: 'override' },
  ])('rejects malformed, overlong or tag-injecting draft %j', value => {
    expect(() => normalizeRapLyricsDraft(value)).toThrow();
  });
  test('allows explicitly selected short Chinese lyrics and rejects more than twenty characters', () => {
    const lines = ['今天朋友一起登场', '笑声跟着节拍回荡', '今晚快乐放声歌唱', '我们的故事闪着光'];
    expect(normalizeRapLyricsDraft({ language: 'zh', lines })).toEqual({ language: 'zh', lines });
    expect(() => normalizeRapLyricsDraft({ language: 'zh', lines: ['唱'.repeat(21), ...lines.slice(1)] })).toThrow();
  });
});
