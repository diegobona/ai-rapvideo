import { normalizeRapLyricsDraft } from '@libs/ai/rap-lyrics-draft'
import type { RapLyricCue, RapLyricsDraft, RapLyricsLanguage } from '@libs/ai/rap-lyrics-types'
import type { RapEndingAction } from '../../../../config/rapEndings'
import { RapGenerationError } from './rap-generation'

/** Keep editing free-form; divide the unchanged words into the server's performance slots. */
export function rapLyricsFromText(text: string, language: RapLyricsLanguage, endingAction?: RapEndingAction): RapLyricsDraft {
  const characterBased = language === 'zh' || (language === 'auto' && /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u.test(text))
  const tokens = characterBased ? Array.from(text.trim()) : text.trim().split(/\s+/u).filter(Boolean)
  if (tokens.length < 4) throw new Error('lyrics_too_short')
  const lines: string[] = []
  let offset = 0
  for (let index = 0; index < 4; index++) {
    const count = Math.ceil((tokens.length - offset) / (4 - index))
    lines.push(tokens.slice(offset, offset + count).join(characterBased ? '' : ' ').trim())
    offset += count
  }
  return normalizeRapLyricsDraft({ language, lines, ...(endingAction !== undefined ? { endingAction } : {}) })
}

/** Called by the optional editor or automatically after the user requests a video. */
export async function requestRapLyrics(topic: string, language: RapLyricsLanguage, signal: AbortSignal, transport: typeof fetch = fetch): Promise<RapLyricsDraft> {
  signal.throwIfAborted()
  const response = await transport('/api/video-generate/lyrics', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, signal,
    body: JSON.stringify({ topic: topic.trim(), language }),
  })
  if (!response.ok) {
    const failure = await response.json().catch(() => null)
    throw new RapGenerationError(failure?.error === 'trial_used' ? 'trialUsed' : failure?.error === 'trial_processing' ? 'trialProcessing' : failure?.error === 'preview_ip_unavailable' ? 'previewIp' : response.status === 429 ? 'rateLimited' : 'generation', true)
  }
  const payload = await response.json().catch(() => null)
  if (!payload || payload.success !== true) throw new Error('invalid_lyrics_response')
  const draft = normalizeRapLyricsDraft(payload.data?.lyrics)
  if (draft.language !== language) throw new Error('invalid_lyrics_language')
  return draft
}

export function findActiveRapLyric(cues: RapLyricCue[], time: number): number {
  if (!Number.isFinite(time)) return -1
  return cues.findIndex(cue => time >= cue.start && time < cue.end)
}
