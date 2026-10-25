import { useEffect, useId, useMemo, useState, type RefObject } from 'react'
import { rapLyricsCues } from '@libs/ai/rap-lyrics-draft'
import type { RapLyricsDraft } from '@libs/ai/rap-lyrics-types'
import { findActiveRapLyric } from '../lib/rap-lyrics-client'
import { rapCopy, type RapLocale } from '../lib/rap-copy'

/** Highlights the submitted script against the planned performance intervals, not inferred speech. */
export function RapLyrics({ draft, videoRef, videoUrl, locale }: {
  draft?: RapLyricsDraft; videoRef: RefObject<HTMLVideoElement | null>; videoUrl: string; locale: RapLocale
}) {
  const copy = rapCopy[locale].lyrics
  const heading = useId()
  const cues = useMemo(() => draft ? rapLyricsCues(draft) : [], [draft])
  const [active, setActive] = useState(-1)
  useEffect(() => {
    setActive(-1)
    const video = videoRef.current
    if (!video) return
    const update = () => setActive(video.ended ? -1 : findActiveRapLyric(cues, video.currentTime))
    const events = ['timeupdate', 'seeking', 'seeked', 'play', 'pause', 'loadedmetadata', 'ended', 'emptied'] as const
    for (const event of events) video.addEventListener(event, update)
    update()
    return () => { for (const event of events) video.removeEventListener(event, update) }
  }, [cues, videoRef, videoUrl])
  return <section className="rap-duo-lyrics-playback" aria-labelledby={heading} data-testid="rap-playback-lyrics">
    <p id={heading} className="rap-duo-lyrics-title">{copy.playbackTitle}</p>
    {draft ? <>
      <p className="rap-duo-lyrics-note">{copy.approximate}</p>
      <ol lang={draft.language === 'zh' ? 'zh-CN' : 'en'} className="rap-duo-lyrics-lines">
        {cues.map((cue, index) => <li key={index} className={active === index ? 'is-active' : ''} aria-current={active === index ? 'true' : undefined}>
          <span>{cue.performer === 'both' ? copy.both : rapCopy[locale].people[cue.performer - 1]}</span><p>{cue.text}</p>
        </li>)}
      </ol>
    </> : <p className="rap-duo-lyrics-note">{copy.missing}</p>}
  </section>
}
