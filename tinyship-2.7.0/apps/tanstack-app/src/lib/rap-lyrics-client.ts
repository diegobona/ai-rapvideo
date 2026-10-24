import { normalizeRapLyricsDraft } from '@libs/ai/rap-lyrics-draft'
import type { RapLyricCue, RapLyricsDraft, RapLyricsLanguage } from '@libs/ai/rap-lyrics-types'

/** Keep editing free-form; divide the unchanged words into the server's solo slots. */
export function rapLyricsFromText(text: string, language: RapLyricsLanguage): RapLyricsDraft {
  const tokens = language === 'en' ? text.trim().split(/\s+/u).filter(Boolean) : Array.from(text.trim())
  if (tokens.length < 4) throw new Error('lyrics_too_short')
  const lines: string[] = []
  let offset = 0
  for (let index = 0; index < 4; index++) {
    const count = Math.ceil((tokens.length - offset) / (4 - index))
    lines.push(tokens.slice(offset, offset + count).join(language === 'en' ? ' ' : '').trim())
    offset += count
  }
  return normalizeRapLyricsDraft({ language, lines })
}

/** Lyrics are generated on an explicit editor action, independently of video generation. */
export async function requestRapLyrics(topic: string, language: RapLyricsLanguage, signal: AbortSignal, transport: typeof fetch = fetch): Promise<RapLyricsDraft> {
  signal.throwIfAborted()
  const response = await transport('/api/video-generate/lyrics', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, signal,
    body: JSON.stringify({ topic: topic.trim(), language }),
  })
  if (!response.ok) throw new Error('lyrics_unavailable')
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
