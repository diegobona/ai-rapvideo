import type { RapEndingAction } from '../../config/rapEndings';

export type RapLyricsLanguage = 'en' | 'zh' | 'auto';

/** Four editable lines: person 1 leads twice, person 2 responds, then both close together. */
export interface RapLyricsDraft {
  language: RapLyricsLanguage;
  lines: [string, string, string, string];
  /** Absent on legacy drafts, whose fourth line remains person 2's solo. */
  endingAction?: RapEndingAction;
}

/** Planned line intervals in video playback seconds; not ASR word timings. */
export interface RapLyricCue {
  start: number;
  end: number;
  text: string;
  performer: 1 | 2 | 'both';
}
