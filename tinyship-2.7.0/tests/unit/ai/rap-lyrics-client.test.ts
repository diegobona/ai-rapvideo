import { describe, expect, test, vi } from 'vitest'
import { findActiveRapLyric, rapLyricsFromText, requestRapLyrics } from '../../../apps/tanstack-app/src/lib/rap-lyrics-client'

const draft = { language: 'en' as const, lines: ['We bring sunshine every day', 'Watch our worries fade away', 'Two bright stars across the night', 'Keep our friendship burning bright'] as [string, string, string, string] }

describe('rap lyrics editor client', () => {
  test('accepts paragraph edits without changing or dropping the English words', () => {
    const text = 'Birthday sunshine lights our way Watch our worries fade away Two bright stars across the night Keep our friendship burning bright'
    expect(rapLyricsFromText(text, 'en').lines.join(' ')).toBe(text)
    expect(() => rapLyricsFromText('word '.repeat(33), 'en')).toThrow()
    expect(() => rapLyricsFromText('', 'en')).toThrow()
  })
  test('accepts a Chinese paragraph without requiring manual line breaks', () => {
    const text = '一起出发迎接阳光我们的梦想在远方每次相聚放声歌唱这份友情闪闪发亮'
    expect(rapLyricsFromText(text, 'zh').lines.join('')).toBe(text)
  })
  test('requests English lyrics explicitly without uploading photos or generating a video', async () => {
    const transport = vi.fn<typeof fetch>(async (url, options) => {
      expect(url).toBe('/api/video-generate/lyrics')
      expect(options?.method).toBe('POST')
      expect(JSON.parse(String(options?.body))).toEqual({ topic: 'Our friendship', language: 'en' })
      return Response.json({ success: true, data: { lyrics: draft } })
    })
    await expect(requestRapLyrics(' Our friendship ', 'en', new AbortController().signal, transport)).resolves.toEqual(draft)
    expect(transport).toHaveBeenCalledTimes(1)
  })

  test('does not turn an unavailable or malformed lyric response into guessed words', async () => {
    const signal = new AbortController().signal
    await expect(requestRapLyrics('', 'en', signal, async () => Response.json({ error: 'lyrics_unavailable' }, { status: 503 }))).rejects.toThrow()
    await expect(requestRapLyrics('', 'en', signal, async () => Response.json({ success: true, data: { lyrics: { ...draft, lines: ['one'] } } }))).rejects.toThrow()
  })

  test('only requests Chinese when it is selected, and never retries a failed request automatically', async () => {
    const transport = vi.fn<typeof fetch>(async (_url, options) => {
      expect(JSON.parse(String(options?.body)).language).toBe('zh')
      return Response.json({ error: 'failed' }, { status: 502 })
    })
    await expect(requestRapLyrics('生日', 'zh', new AbortController().signal, transport)).rejects.toThrow()
    expect(transport).toHaveBeenCalledTimes(1)
  })

  test('selects the planned current line, clears instrumental gaps and updates after a backwards seek', () => {
    const cues = [{ start: 0.5, end: 3, text: 'first', performer: 1 as const }, { start: 3, end: 5.5, text: 'second', performer: 1 as const }, { start: 6, end: 8.5, text: 'third', performer: 2 as const }]
    expect(findActiveRapLyric(cues, 0)).toBe(-1)
    expect(findActiveRapLyric(cues, 2)).toBe(0)
    expect(findActiveRapLyric(cues, 3)).toBe(1)
    expect(findActiveRapLyric(cues, 5.5)).toBe(-1)
    expect(findActiveRapLyric(cues, 7)).toBe(2)
    expect(findActiveRapLyric(cues, 1)).toBe(0)
    expect(findActiveRapLyric(cues, 12)).toBe(-1)
    expect(findActiveRapLyric(cues, Number.NaN)).toBe(-1)
  })
})
