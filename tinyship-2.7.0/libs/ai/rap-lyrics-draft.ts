import { RAP_LYRICS_LINE_COUNT, RAP_LYRICS_MAX_CHINESE_CHARACTERS, RAP_LYRICS_MAX_ENGLISH_WORDS, RAP_LYRICS_MAX_LINE_LENGTH, RAP_LYRICS_SLOTS } from '../../config/rapLyrics';
import { normalizeRapEndingAction } from '../../config/rapEndings';
import type { RapLyricCue, RapLyricsDraft } from './rap-lyrics-types';

/** Validate edited lyrics before they become literal model dialogue or saved task data. */
export function normalizeRapLyricsDraft(value: unknown): RapLyricsDraft {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid rap lyrics');
  const draft = value as Record<string, unknown>;
  if (Object.keys(draft).some(key => !['language', 'lines', 'endingAction'].includes(key)) || (draft.language !== 'en' && draft.language !== 'zh' && draft.language !== 'auto')
    || !Array.isArray(draft.lines) || draft.lines.length !== RAP_LYRICS_LINE_COUNT) throw new Error('Invalid rap lyrics');
  const lines = draft.lines.map(value => {
    if (typeof value !== 'string' || /[\u0000-\u001f\u007f<>]/.test(value)) throw new Error('Invalid lyric line');
    const line = value.trim();
    if (!line || line.length > RAP_LYRICS_MAX_LINE_LENGTH) throw new Error('Invalid lyric line length');
    if (draft.language === 'en' && (line.split(/\s+/).length > RAP_LYRICS_MAX_ENGLISH_WORDS || /\p{Script=Han}/u.test(line))) throw new Error('English lyrics must be short English lines');
    if (draft.language === 'zh' && (Array.from(line.replace(/\s/g, '')).length > RAP_LYRICS_MAX_CHINESE_CHARACTERS || !/\p{Script=Han}/u.test(line))) throw new Error('Chinese lyrics must be short Chinese lines');
    if (draft.language === 'auto' && line.split(/\s+/).length > RAP_LYRICS_MAX_ENGLISH_WORDS) throw new Error('Lyrics must be short');
    return line;
  });
  return {
    language: draft.language as RapLyricsDraft['language'],
    lines: lines as RapLyricsDraft['lines'],
    ...(Object.prototype.hasOwnProperty.call(draft, 'endingAction') ? { endingAction: normalizeRapEndingAction(draft.endingAction) } : {}),
  };
}

/** These are planned performance intervals, not measured audio or word timestamps. */
export function rapLyricsCues(draft: RapLyricsDraft): RapLyricCue[] {
  const normalized = normalizeRapLyricsDraft(draft);
  return RAP_LYRICS_SLOTS.map<RapLyricCue>((slot, index) => ({
    ...slot,
    text: normalized.lines[index],
    performer: index === 3 && normalized.endingAction !== undefined ? 'both' : slot.performer,
  }));
}
