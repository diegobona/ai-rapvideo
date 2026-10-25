import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { ArrowRightLeft, Check, CheckCircle2, Download, ImagePlus, LoaderCircle, Mic2, Music2, ShieldCheck, Sparkles, Upload, X } from 'lucide-react'
import type { VideoGenerationResult } from '@libs/ai/types'
import { normalizeRapLyricsDraft } from '@libs/ai/rap-lyrics-draft'
import type { RapLyricsDraft } from '@libs/ai/rap-lyrics-types'
import { RAP_VIDEO_DURATION, RAP_VIDEO_SCENES, type RapVideoSceneId } from '../../../../config/rapVideo'
import { RAP_LYRICS_MAX_LINE_LENGTH } from '../../../../config/rapLyrics'
import { RAP_VOICE_PROFILES, isRapVoiceAvailable, rapVoiceReference, type RapVoiceType } from '../../../../config/rapVoices'
import { DanceGenerationError, ensureDanceSession, pollDanceTask, readDancePurchase } from '../lib/dance-generation'
import { forgetDanceTask, readDanceTask, rememberDanceTask } from '../lib/dance-task-session'
import { downloadRapVideo, getRapErrorCode, RAP_PHOTO_ACCEPT, RAP_POLLING, RAP_TOPIC_LIMIT, RapGenerationError, resolveRapRecoveryTask, startRapGeneration, uploadRapPhoto, validateRapPhoto, type RapErrorCode } from '../lib/rap-generation'
import { rapCopy, type RapLocale } from '../lib/rap-copy'
import { rapLyricsFromText, requestRapLyrics } from '../lib/rap-lyrics-client'
import { RapLyrics } from './rap-lyrics'
import './rap-maker.css'

interface DanceMakerProps {
  /** Compatibility for previous callers; new copy lives in rap-copy.ts. */
  copy?: unknown
  locale?: RapLocale
  isAvailable?: boolean
  className?: string
}
type Phase = 'idle' | 'uploading' | 'queued' | 'processing' | 'succeeded' | 'failed' | 'recovering'
type Photo = { file: File; url?: string }

function PhotoInput({ index, id, photo, voice, otherVoice, disabled, copy, onChange, onVoiceChange }: {
  index: number; id: string; photo: Photo | null; disabled: boolean
  voice: RapVoiceType; otherVoice: RapVoiceType; onVoiceChange: (voice: RapVoiceType) => void
  copy: typeof rapCopy.en | typeof rapCopy['zh-CN']; onChange: (file: File | null) => void
}) {
  const input = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  useEffect(() => {
    if (!photo) { setPreview(null); return }
    const url = URL.createObjectURL(photo.file)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [photo?.file])
  return <div className="rap-duo-photo">
    <label className="rap-duo-photo-label" htmlFor={id}>{copy.people[index]} <span>{copy.required}</span></label>
    <div className={'rap-duo-drop' + (dragging ? ' is-dragging' : '') + (preview ? ' has-photo' : '')}
      onDragOver={event => { event.preventDefault(); if (!disabled) setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={event => { event.preventDefault(); setDragging(false); if (!disabled && event.dataTransfer.files[0]) onChange(event.dataTransfer.files[0]) }}>
      {preview ? <>
        <img src={preview} alt={copy.people[index] + ' ' + copy.preview} />
        <button className="rap-duo-remove" type="button" aria-label={copy.remove + ' — ' + copy.people[index]} disabled={disabled}
          onClick={() => { if (input.current) input.current.value = ''; onChange(null) }}><X size={16} aria-hidden="true" /></button>
      </> : <Upload size={26} strokeWidth={1.5} aria-hidden="true" />}
      <button className="rap-duo-photo-button" type="button" disabled={disabled} onClick={() => input.current?.click()}>
        <ImagePlus size={15} aria-hidden="true" />{preview ? copy.replace : copy.upload}
      </button>
      {!preview && <span className="rap-duo-drop-hint">{copy.drop}</span>}
      <input ref={input} id={id} className="rap-duo-visually-hidden" type="file" accept={RAP_PHOTO_ACCEPT} aria-required="true" aria-describedby={id + '-hint'} disabled={disabled}
        onChange={event => { const file = event.currentTarget.files?.[0]; if (file) onChange(file); event.currentTarget.value = '' }} />
    </div>
    <span id={id + '-hint'} className="rap-duo-visually-hidden">{copy.photoHint}</span>
    <label className="rap-duo-voice" htmlFor={id + '-voice'}>{copy.voice.label}
      <select id={id + '-voice'} value={voice} disabled={disabled} aria-label={copy.people[index] + ' ' + copy.voice.label}
        onChange={event => onVoiceChange(event.target.value as RapVoiceType)}>
        {RAP_VOICE_PROFILES.map(profile => <option key={profile} value={profile} disabled={profile === otherVoice || !isRapVoiceAvailable(index === 0 ? 0 : 1, profile)}>
          {copy.voice.profiles[profile]}{profile === otherVoice ? ' · ' + copy.voice.inUse : ''}
        </option>)}
      </select>
    </label>
    <details className="rap-duo-voice-preview">
      <summary>{copy.voice.preview}</summary>
      <audio key={voice} controls preload="none" src={rapVoiceReference(index === 0 ? 0 : 1, voice).url}
        onPlay={event => {
          const current = event.currentTarget
          current.closest('.rap-duo-maker')?.querySelectorAll('audio').forEach(audio => { if (audio !== current) audio.pause() })
        }}
        aria-label={copy.people[index] + ' ' + copy.voice.preview} />
      <p>{copy.voice.hint}</p>
    </details>
  </div>
}

/** Mount and status retries only read an existing task; only form submission creates one. */
export function DanceMaker({ locale = 'en', isAvailable = true, className = '' }: DanceMakerProps) {
  const copy = rapCopy[locale]
  const id = useId()
  const mounted = useRef(false)
  const operation = useRef<AbortController | null>(null)
  const downloadOperation = useRef<AbortController | null>(null)
  const lyricsOperation = useRef<AbortController | null>(null)
  const video = useRef<HTMLVideoElement>(null)
  const storageKey = useRef<string | null>(null)
  const activeTask = useRef<string | null>(null)
  const previousTask = useRef<string | null>(null)
  const needsRecovery = useRef(true)
  const [photos, setPhotos] = useState<[Photo | null, Photo | null]>([null, null])
  const [voices, setVoices] = useState<[RapVoiceType, RapVoiceType]>(['male-young', 'female-young'])
  const [scene, setScene] = useState<RapVideoSceneId>('hotel-lobby')
  const [topic, setTopic] = useState('')
  const [lyrics, setLyrics] = useState<RapLyricsDraft>({ language: 'en', lines: ['', '', '', ''] })
  const [lyricsText, setLyricsText] = useState('')
  const [lyricsTopic, setLyricsTopic] = useState<string | null>(null)
  const [lyricsRevealed, setLyricsRevealed] = useState(false)
  const [writingLyrics, setWritingLyrics] = useState(false)
  const [lyricsError, setLyricsError] = useState(false)
  const [consent, setConsent] = useState(false)
  const [phase, setPhase] = useState<Phase>('idle')
  const [restoring, setRestoring] = useState(true)
  const [error, setError] = useState<RapErrorCode | null>(null)
  const [result, setResult] = useState<VideoGenerationResult | null>(null)
  const [downloading, setDownloading] = useState(false)
  const [downloadError, setDownloadError] = useState(false)
  const [longWait, setLongWait] = useState(false)
  const working = ['uploading', 'queued', 'processing', 'recovering'].includes(phase)
  const canCheckStatus = phase === 'failed' && (needsRecovery.current || Boolean(activeTask.current))
  const lyricsTopicChanged = lyricsTopic !== null && topic.trim() !== lyricsTopic
  const lyricsForTopic = lyricsTopicChanged ? { ...lyrics, endingAction: 'groove' as const } : lyrics
  let approvedLyrics: RapLyricsDraft | undefined
  try { approvedLyrics = lyricsText === lyrics.lines.join(' ') ? normalizeRapLyricsDraft(lyricsForTopic) : rapLyricsFromText(lyricsText, 'auto', lyricsForTopic.endingAction) } catch { /* The paragraph can contain unfinished edits. */ }
  const validLyrics = Boolean(approvedLyrics)

  function rememberTask(taskId: string) {
    activeTask.current = taskId
    if (storageKey.current) { try { rememberDanceTask(window.sessionStorage, storageKey.current, taskId) } catch { /* Private browsing may disable storage. */ } }
  }
  function forgetTask() {
    activeTask.current = null
    if (storageKey.current) { try { forgetDanceTask(window.sessionStorage, storageKey.current) } catch { /* Server ownership is independent of browser storage. */ } }
  }
  async function followTask(taskId: string, controller: AbortController) {
    rememberTask(taskId)
    setPhase('processing')
    const video = await pollDanceTask(taskId, controller.signal, fetch, RAP_POLLING)
    if (controller.signal.aborted) return
    setResult(video)
    setPhase('succeeded')
    setError(null)
  }
  function fail(cause: unknown, fallback: RapErrorCode) {
    const code = getRapErrorCode(cause, fallback)
    if (cause instanceof DanceGenerationError && cause.terminal) { forgetTask(); needsRecovery.current = false }
    setError(code)
    setPhase('failed')
  }
  async function recover(controller: AbortController) {
    setError(null)
    needsRecovery.current = true
    const lookup = new AbortController()
    const onAbort = () => lookup.abort(controller.signal.reason)
    controller.signal.addEventListener('abort', onAbort, { once: true })
    const lookupTimer = setTimeout(() => lookup.abort(new RapGenerationError('timeout')), 20_000)
    try {
      let owned: Awaited<ReturnType<typeof readDancePurchase>>
      try { owned = await readDancePurchase(lookup.signal) }
      catch (cause) { throw lookup.signal.aborted ? lookup.signal.reason : cause }
      finally { clearTimeout(lookupTimer); controller.signal.removeEventListener('abort', onAbort) }
      if (controller.signal.aborted) return
      storageKey.current = owned.storageKey
      needsRecovery.current = false
      setRestoring(false)
      let tabTask: string | null = null
      try { tabTask = readDanceTask(window.sessionStorage, owned.storageKey) } catch { /* Optional tab recovery. */ }
      const task = resolveRapRecoveryTask(owned.directTaskId ?? owned.purchase?.taskId ?? null, tabTask, previousTask.current)
      if (owned.purchase?.state === 'succeeded' && owned.purchase.result && !owned.directTaskId) {
        setResult(owned.purchase.result)
        setPhase('succeeded')
      } else if (task) await followTask(task, controller)
      else { forgetTask(); setPhase('idle') }
    } catch (cause) {
      if (!controller.signal.aborted) fail(cause, 'status')
    } finally {
      clearTimeout(lookupTimer)
      controller.signal.removeEventListener('abort', onAbort)
      if (!controller.signal.aborted) setRestoring(false)
    }
  }

  useEffect(() => {
    mounted.current = true
    const controller = new AbortController()
    operation.current = controller
    void recover(controller).finally(() => { if (operation.current === controller) operation.current = null })
    return () => { mounted.current = false; operation.current?.abort(); controller.abort(); downloadOperation.current?.abort(); lyricsOperation.current?.abort() }
  }, [])
  useEffect(() => {
    setLongWait(false)
    if (phase !== 'processing') return
    const timer = setTimeout(() => setLongWait(true), 2 * 60 * 1000)
    return () => clearTimeout(timer)
  }, [phase])

  function selectPhoto(index: number, file: File | null) {
    if (working) return
    if (file) { const code = validateRapPhoto(file); if (code) { setError(code); return } }
    setPhotos(current => current.map((photo, position) => position === index ? file ? { file } : null : photo) as typeof photos)
    setError(null)
  }
  async function writeLyrics() {
    if (lyricsOperation.current || working) return
    const controller = new AbortController()
    lyricsOperation.current = controller
    setWritingLyrics(true)
    setLyricsError(false)
    const timer = setTimeout(() => controller.abort(), 60_000)
    try {
      await ensureDanceSession(controller.signal)
      const draft = await requestRapLyrics(topic, 'en', controller.signal)
      if (!controller.signal.aborted && mounted.current) {
        setLyrics(draft)
        setLyricsText(draft.lines.join(' '))
        setLyricsTopic(topic.trim())
        setLyricsRevealed(true)
      }
    } catch { if (mounted.current) setLyricsError(true) }
    finally {
      clearTimeout(timer)
      if (lyricsOperation.current === controller) {
        lyricsOperation.current = null
        if (mounted.current) setWritingLyrics(false)
      }
    }
  }
  async function retryStatus() {
    if (operation.current) return
    const controller = new AbortController()
    operation.current = controller
    setPhase('recovering')
    setError(null)
    try {
      if (activeTask.current && !needsRecovery.current) await followTask(activeTask.current, controller)
      else await recover(controller)
    } catch (cause) { if (!controller.signal.aborted) fail(cause, 'status') }
    finally { if (operation.current === controller) operation.current = null }
  }
  async function generate(event: FormEvent) {
    event.preventDefault()
    if (operation.current || working || writingLyrics || restoring || !isAvailable) return
    if (canCheckStatus) { await retryStatus(); return }
    const submittedLyrics = approvedLyrics
    if (!submittedLyrics) return
    if (!photos[0] || !photos[1]) { setError('photoRequired'); return }
    if (!consent) { setError('consentRequired'); return }
    previousTask.current = activeTask.current ?? previousTask.current
    forgetTask()
    const controller = new AbortController()
    operation.current = controller
    setError(null)
    setDownloadError(false)
    setResult(null)
    setPhase('uploading')
    let submitted = false
    let stage: RapErrorCode = 'visitor'
    const timer = setTimeout(() => controller.abort(new RapGenerationError('timeout')), 120_000)
    try {
      await ensureDanceSession(controller.signal)
      stage = 'upload'
      const urls: string[] = []
      for (let index = 0; index < 2; index++) {
        const photo = photos[index]!
        urls.push(photo.url ?? await uploadRapPhoto(photo.file, controller.signal))
        if (controller.signal.aborted) return
        setPhotos(current => current.map((item, position) => position === index && item?.file === photo.file ? { ...item, url: urls[index] } : item) as typeof photos)
      }
      setPhase('queued')
      stage = 'generation'
      // A lost response is ambiguous: status recovery must precede another POST.
      submitted = true
      needsRecovery.current = true
      const task = await startRapGeneration({ personOneImageUrl: urls[0], personTwoImageUrl: urls[1], scene, topic, lyrics: submittedLyrics, voices }, controller.signal)
      clearTimeout(timer)
      if (controller.signal.aborted) return
      needsRecovery.current = false
      await followTask(task.taskId, controller)
    } catch (cause) {
      if (mounted.current) {
        if (!submitted || (cause instanceof RapGenerationError && cause.submissionRejected)) {
          forgetTask()
          needsRecovery.current = false
        }
        fail(controller.signal.aborted ? controller.signal.reason : cause, stage)
      }
    } finally { clearTimeout(timer); if (operation.current === controller) operation.current = null }
  }
  async function download() {
    if (!result || downloadOperation.current) return
    const controller = new AbortController()
    downloadOperation.current = controller
    setDownloading(true)
    setDownloadError(false)
    const timer = setTimeout(() => controller.abort(new RapGenerationError('download')), 120_000)
    try {
      const blob = await downloadRapVideo(result.videoUrl, controller.signal)
      if (controller.signal.aborted) return
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'ai-rap-video.' + (blob.type === 'video/webm' ? 'webm' : 'mp4')
      document.body.appendChild(link)
      link.click()
      link.remove()
      setTimeout(() => URL.revokeObjectURL(url), 1_000)
    } catch { if (mounted.current) setDownloadError(true) }
    finally {
      clearTimeout(timer)
      if (downloadOperation.current === controller) { downloadOperation.current = null; if (mounted.current) setDownloading(false) }
    }
  }

  return <section id="rap-maker" className={'rap-duo-maker ' + className} data-testid="rap-maker" aria-label={copy.title}>
    <header className="rap-duo-heading"><span className="rap-duo-heading-icon"><Mic2 size={22} aria-hidden="true" /></span><div><p>{copy.title}</p><span>{copy.subtitle}</span></div></header>
    <form className="rap-duo-form" onSubmit={event => { void generate(event) }} noValidate>
      <fieldset className="rap-duo-step" disabled={working}>
        <legend><span className="rap-duo-number">01</span>{copy.photos}</legend>
        <p className="rap-duo-hint">{copy.photoHint}</p>
        <div className="rap-duo-photos">{photos.map((photo, index) => <PhotoInput key={index} id={id + '-person-' + (index + 1)} index={index} photo={photo} voice={voices[index]} otherVoice={voices[index === 0 ? 1 : 0]} disabled={working} copy={copy} onChange={file => selectPhoto(index, file)}
          onVoiceChange={voice => setVoices(current => index === 0 ? [voice, current[1]] : [current[0], voice])} />)}
        <button className="rap-duo-swap" type="button" aria-label={copy.swapPeople} title={copy.swapPeople} disabled={working || !photos[0] || !photos[1]} onClick={() => { setPhotos(([first, second]) => [second, first]); setVoices(([first, second]) => [second, first]) }}><ArrowRightLeft size={20} aria-hidden="true" /></button>
        </div>
        <p className="rap-duo-hint">{copy.singingOrder}</p>
      </fieldset>
      <fieldset className="rap-duo-step" disabled={working}>
        <legend><span className="rap-duo-number">02</span>{copy.scene}</legend>
        <p className="rap-duo-hint">{copy.sceneHint}</p>
        <div className="rap-duo-scenes">{RAP_VIDEO_SCENES.map(item => <label className={'rap-duo-scene' + (scene === item.id ? ' is-selected' : '')} key={item.id}>
          <input type="radio" name={id + '-scene'} value={item.id} checked={scene === item.id} onChange={() => setScene(item.id)} />
          <img src={item.image} alt="" loading="lazy" width={360} height={200} />
          <span className="rap-duo-scene-overlay" /><span className="rap-duo-scene-copy"><strong>{copy.scenes[item.id].name}</strong><span>{copy.scenes[item.id].description}</span></span>
          <span className="rap-duo-selected" aria-hidden="true">{scene === item.id && <Check size={13} strokeWidth={3} />}</span>
        </label>)}</div>
      </fieldset>
      <fieldset className="rap-duo-step" disabled={working}>
        <legend><span className="rap-duo-number">03</span><label htmlFor={id + '-topic'}>{copy.topic}</label><span className="rap-duo-optional">{copy.optional}</span></legend>
        <p className="rap-duo-hint">{copy.topicHint}</p>
        <textarea id={id + '-topic'} maxLength={RAP_TOPIC_LIMIT} rows={3} value={topic} onChange={event => setTopic(event.target.value)} placeholder={copy.topicPlaceholder} aria-describedby={id + '-topic-count'} />
        <p id={id + '-topic-count'} className="rap-duo-count">{topic.length}/{RAP_TOPIC_LIMIT}</p>
      </fieldset>
      <fieldset className="rap-duo-step rap-duo-lyrics-editor" disabled={working || writingLyrics}>
        <legend><span className="rap-duo-number">04</span>{copy.lyrics.title}</legend>
        <p className="rap-duo-hint">{copy.lyrics.hint}</p>
        <button className="rap-duo-write-lyrics" type="button" onClick={() => { void writeLyrics() }} disabled={working || writingLyrics} aria-busy={writingLyrics}>
          {writingLyrics ? <LoaderCircle className="rap-duo-spin" size={16} aria-hidden="true" /> : <Music2 size={16} aria-hidden="true" />}
          {writingLyrics ? copy.lyrics.generating : lyrics.lines.some(Boolean) ? copy.lyrics.regenerate : copy.lyrics.generate}
        </button>
        {lyricsRevealed && !writingLyrics && <div className="rap-duo-lyrics-text" lang={approvedLyrics?.language === 'en' ? 'en' : undefined}>
          <label htmlFor={id + '-lyrics-text'}>{copy.lyrics.editorLabel}</label>
          <textarea id={id + '-lyrics-text'} rows={2} value={lyricsText} maxLength={RAP_LYRICS_MAX_LINE_LENGTH * 4 + 3}
            placeholder={copy.lyrics.placeholder} aria-describedby={id + '-lyrics-hint' + (lyricsTopicChanged ? ' ' + id + '-lyrics-topic-hint' : '')} onChange={event => setLyricsText(event.target.value)} />
          <p className="rap-duo-hint" id={id + '-lyrics-hint'}>{lyrics.language === 'en' ? copy.lyrics.englishHint : copy.lyrics.chineseHint}</p>
          {lyricsTopicChanged && <p className="rap-duo-hint" id={id + '-lyrics-topic-hint'}>{copy.lyrics.topicChanged}</p>}
        </div>}
      </fieldset>
      {lyricsError && <p className="rap-duo-error" role="alert">{copy.lyrics.error}</p>}
      <footer className="rap-duo-actions">
        <div className="rap-duo-specs"><span>{copy.duration}</span><span>{copy.resolution}</span><span><Music2 size={12} aria-hidden="true" />{copy.audio}</span></div>
        <label className="rap-duo-consent"><input type="checkbox" checked={consent} onChange={event => setConsent(event.target.checked)} disabled={working} /><span>{copy.consent}</span></label>
        {error && <p className="rap-duo-error" role="alert">{copy.errors[error]}</p>}
        {!isAvailable && <p className="rap-duo-error" role="status">{copy.unavailable}</p>}
        {!validLyrics && !canCheckStatus && <p className="rap-duo-hint">{copy.lyrics.invalid}</p>}
        <button className="rap-duo-generate" type="submit" disabled={working || writingLyrics || restoring || !isAvailable || (!canCheckStatus && !validLyrics)}>
          {working || restoring ? <LoaderCircle className="rap-duo-spin" size={18} aria-hidden="true" /> : <Sparkles size={18} aria-hidden="true" />}
          {restoring ? copy.status.recovering : working ? copy.status[phase] : canCheckStatus ? copy.checkStatus : phase === 'failed' ? copy.retry : result ? copy.generateAgain : copy.generate}
        </button>
        <p className="rap-duo-progress-hint">{copy.lyrics.videoHint}</p>
        <p className="rap-duo-progress-hint">{copy.progressHint}</p>
        <p className="rap-duo-privacy"><ShieldCheck size={13} aria-hidden="true" />{copy.privacy}</p>
      </footer>
    </form>
    <aside className="rap-duo-output" aria-label={copy.resultTitle}>
      <p className="rap-duo-output-title">{copy.resultTitle}</p>
      <div className="rap-duo-screen" aria-busy={working}>
        {result ? <video key={result.videoUrl} ref={video} src={result.videoUrl} poster={result.coverImageUrl} controls playsInline preload="metadata" aria-label={copy.videoLabel}>{copy.videoUnsupported}</video> : <div className="rap-duo-empty">
          <div className={'rap-duo-mic' + (working ? ' is-working' : '')}>{working ? <LoaderCircle className="rap-duo-spin" size={32} aria-hidden="true" /> : <Mic2 size={38} strokeWidth={1.3} aria-hidden="true" />}</div>
          <p>{working ? copy.status[phase] : copy.resultEmpty}</p><span>{working ? copy.progressHint : copy.resultHint}</span>
          <div className="rap-duo-bars" aria-hidden="true">{[14, 25, 38, 22, 44, 30, 19, 34, 16].map((height, index) => <i key={index} style={{ height }} />)}</div>
        </div>}
      </div>
      {result && <RapLyrics draft={result.rapLyrics} videoRef={video} videoUrl={result.videoUrl} locale={locale} />}
      {phase !== 'idle' && !restoring && <p className={'rap-duo-status' + (result ? ' is-ready' : '')} role="status" aria-live="polite">{result && <CheckCircle2 size={15} aria-hidden="true" />}{copy.status[phase]}</p>}
      {longWait && <p className="rap-duo-hint" data-testid="rap-long-wait">{copy.longWait}</p>}
      {result && <div className="rap-duo-download"><button type="button" onClick={() => { void download() }} disabled={downloading}>
        {downloading ? <LoaderCircle className="rap-duo-spin" size={17} aria-hidden="true" /> : <Download size={17} aria-hidden="true" />}{downloading ? copy.downloading : downloadError ? copy.retryDownload : copy.download}
      </button><p>{copy.downloadHint}</p>{downloadError && <p className="rap-duo-error" role="alert">{copy.errors.download}</p>}</div>}
      <span className="rap-duo-output-format">{RAP_VIDEO_DURATION}s · 9:16 · MP4</span>
    </aside>
  </section>
}
