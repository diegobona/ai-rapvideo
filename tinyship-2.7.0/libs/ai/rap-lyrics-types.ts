export type RapLyricsLanguage = 'en' | 'zh';

/** Four editable lines: the first two belong to person 1, the last two to person 2. */
export interface RapLyricsDraft {
  language: RapLyricsLanguage;
  lines: [string, string, string, string];
}

/** Planned line intervals in video playback seconds; not ASR word timings. */
export interface RapLyricCue {
  start: number;
  end: number;
  text: string;
  performer: 1 | 2;
}
