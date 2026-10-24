/** Public lyric editor limits and planned performance intervals. */
export const RAP_LYRICS_LINE_COUNT = 4;
/** Delivery target shared by lyric drafting and video prompting, not measured output tempo. */
export const RAP_TEMPO_BPM = 96;
export const RAP_LYRICS_MAX_LINE_LENGTH = 80;
export const RAP_LYRICS_MAX_ENGLISH_WORDS = 8;
export const RAP_LYRICS_MAX_CHINESE_CHARACTERS = 20;
export const RAP_LYRICS_SLOTS = [
  { start: 0.5, end: 3.0, performer: 1 },
  { start: 3.0, end: 5.5, performer: 1 },
  { start: 6.0, end: 8.5, performer: 2 },
  { start: 8.5, end: 11.0, performer: 2 },
] as const;
