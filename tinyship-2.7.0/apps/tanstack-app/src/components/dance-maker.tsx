import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { ArrowRightLeft, Check, CheckCircle2, Download, ImagePlus, LoaderCircle, Mic2, Music2, ShieldCheck, Sparkles, Upload, X } from 'lucide-react'
import type { VideoGenerationResult } from '@libs/ai/types'
import { normalizeRapLyricsDraft } from '@libs/ai/rap-lyrics-draft'
import type { RapLyricsDraft } from '@libs/ai/rap-lyrics-types'
import { RAP_LYRICS_UI_ENABLED, RAP_PREVIEW_DURATION, RAP_VIDEO_DURATION, RAP_VIDEO_SCENES, type RapVideoSceneId } from '../../../../config/rapVideo'
import { RAP_LYRICS_MAX_LINE_LENGTH } from '../../../../config/rapLyrics'
import { normalizeRapVoices, type RapVoiceType } from '../../../../config/rapVoices'
import { DanceGenerationError, ensureDanceSession, pollDanceTask, readDancePurchase } from '../lib/dance-generation'
import { forgetDanceTask, readDanceTask, rememberDanceTask } from '../lib/dance-task-session'
import { downloadRapVideo, getRapErrorCode, RAP_PHOTO_ACCEPT, RAP_POLLING, RAP_TOPIC_LIMIT, RapGenerationError, resolveRapRecoveryTask, startRapGeneration, uploadRapPhoto, validateRapPhoto, type RapErrorCode } from '../lib/rap-generation'
import { rapCopy, type RapLocale } from '../lib/rap-copy'
import { rapLyricsFromText, requestRapLyrics } from '../lib/rap-lyrics-client'
import { RapLyrics } from './rap-lyrics'
import { RapVoicePicker } from './rap-voice-picker'
import { RapPreviewNextStep } from './rap-preview-next-step'
import { useRapCredits } from './rap-credit-provider'
import { RapCreditDialog, RapRefundNotice } from './rap-credit-purchase'
import { rapCreditCopy } from '../lib/rap-credit-copy'
import { DuoPhotoError, splitDuoPhoto, type DuoPhotoErrorCode } from '../lib/split-duo-photo'
import { RapDuoPhotoUpload } from './rap-duo-photo-upload'
import { readRapDraft, saveRapDraft, type RapCreatorDraft } from '../lib/rap-draft-session'
import { dismissRapPreview, wasRapPreviewDismissed, rememberRapAccessIntent, hasRapAccessIntent, forgetRapAccessIntent } from '../lib/rap-generation-access'
import './rap-maker.css'

interface DanceMakerProps {
  /** Compatibility for previous callers; new copy lives in rap-copy.ts. */
  copy?: unknown
  locale?: RapLocale
  isAvailable?: boolean
  className?: string
}
type Phase = 'idle' | 'preparing' | 'uploading' | 'queued' | 'processing' | 'succeeded' | 'failed' | 'recovering'
type Photo = { file: File; url?: string }
const DRAFT_STORAGE_KEY = 'ai-rapvideo-maker-draft-v1'

function PhotoInput({ index, id, photo, voice, otherVoice, disabled, previewOnly = false, copy, onChange, onVoiceChange }: {
  index: number; id: string; photo: Photo | null; disabled: boolean
  previewOnly?: boolean
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
    <label className="rap-duo-photo-label" htmlFor={id}>{copy.people[index]}{index === 0 ? ' · ' + copy.singingOrder : ''} <span>{copy.required}</span></label>
    <div className={'rap-duo-drop' + (dragging ? ' is-dragging' : '') + (preview ? ' has-photo' : '')}
      onDragOver={event => { event.preventDefault(); if (!disabled && !previewOnly) setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={event => { event.preventDefault(); setDragging(false); if (!disabled && !previewOnly && event.dataTransfer.files[0]) onChange(event.dataTransfer.files[0]) }}>
      {preview ? <>
        <img src={preview} alt={copy.people[index] + ' ' + copy.preview} />
        {!previewOnly && <button className="rap-duo-remove" type="button" aria-label={copy.remove + ' — ' + copy.people[index]} disabled={disabled}
          onClick={() => { if (input.current) input.current.value = ''; onChange(null) }}><X size={16} aria-hidden="true" /></button>}
      </> : <Upload size={26} strokeWidth={1.5} aria-hidden="true" />}
      {!previewOnly && <button className="rap-duo-photo-button" type="button" disabled={disabled} onClick={() => input.current?.click()}>
        <ImagePlus size={15} aria-hidden="true" />{preview ? copy.replace : copy.upload}
      </button>}
      {!preview && !previewOnly && <span className="rap-duo-drop-hint">{copy.drop}</span>}
      <input ref={input} id={id} className="rap-duo-visually-hidden" type="file" accept={RAP_PHOTO_ACCEPT} aria-required="true" aria-describedby={id + '-hint'} disabled={disabled || previewOnly}
        onChange={event => { const file = event.currentTarget.files?.[0]; if (file) onChange(file); event.currentTarget.value = '' }} />
    </div>
    <span id={id + '-hint'} className="rap-duo-visually-hidden">{copy.photoHint}</span>
    <RapVoicePicker id={id + '-voice'} index={index === 0 ? 0 : 1} voice={voice} otherVoice={otherVoice} disabled={disabled} copy={copy} onChange={onVoiceChange} />
  </div>
}

/** Mount and status retries only read an existing task; only form submission creates one. */
export function DanceMaker({ locale = 'en', isAvailable = true, className = '' }: DanceMakerProps) {
  const copy = rapCopy[locale]
  const creditCopy = rapCreditCopy[locale]
  const billing = useRapCredits()
  const id = useId()
  const mounted = useRef(false)
  const operation = useRef<AbortController | null>(null)
  const downloadOperation = useRef<AbortController | null>(null)
  const lyricsOperation = useRef<AbortController | null>(null)
  const duoPhotoOperation = useRef<AbortController | null>(null)
  const video = useRef<HTMLVideoElement>(null)
  const topicInput = useRef<HTMLTextAreaElement>(null)
  const storageKey = useRef<string | null>(null)
  const activeTask = useRef<string | null>(null)
  const previousTask = useRef<string | null>(null)
  const needsRecovery = useRef(true)
  const fullRequestId = useRef<string | null>(null)
  const submittedMode = useRef<'full' | 'preview' | null>(null)
  const recoveredPaidTask = useRef<string | null>(null)
  const [photos, setPhotos] = useState<[Photo | null, Photo | null]>([null, null])
  const [photoMode, setPhotoMode] = useState<'separate' | 'together'>('separate')
  const [splittingPhoto, setSplittingPhoto] = useState(false)
  const [duoPhotoError, setDuoPhotoError] = useState<DuoPhotoErrorCode | null>(null)
  const [duoPhotoReady, setDuoPhotoReady] = useState(false)
  const [voices, setVoices] = useState<[RapVoiceType, RapVoiceType]>(['male-young', 'female-young'])
  const [scene, setScene] = useState<RapVideoSceneId>('hotel-lobby')
  const [topic, setTopic] = useState('')
  const [draftRestored, setDraftRestored] = useState(false)
  const [draftError, setDraftError] = useState<'save' | 'restore' | null>(null)
  const draftReadFailed = useRef(false)
  const [creditDialogOpen, setCreditDialogOpen] = useState(false)
  const awaitingSignIn = useRef(false)
  const previewDismissedRef = useRef(false)
  const [previewDismissed, setPreviewDismissed] = useState(false)
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
  const [playback, setPlayback] = useState<{ url: string; duration: number; watched: boolean } | null>(null)
  const [downloading, setDownloading] = useState(false)
  const [downloadError, setDownloadError] = useState(false)
  const [longWait, setLongWait] = useState(false)
  const [previewState, setPreviewState] = useState<'available' | 'processing' | 'used'>('available')
  const [complimentaryFullVideo, setComplimentaryFullVideo] = useState(false)
  const fullVideo = complimentaryFullVideo || billing.credits > 0
  const offerFullVideo = fullVideo || billing.signedIn || previewState === 'used'
  const paidOrderBusy = ['starting', 'processing'].includes(billing.order?.state ?? '')
  const working = ['preparing', 'uploading', 'queued', 'processing', 'recovering'].includes(phase)
  const currentPlayback = playback?.url === result?.videoUrl ? playback : null
  const resultDuration = currentPlayback?.duration ?? result?.duration
  // Read actual media duration too: older saved results may not include it.
  // Full-length results should never be presented as free previews.
  const isPreviewResult = Boolean(result && resultDuration && resultDuration <= RAP_PREVIEW_DURATION + 0.25)
  const canCheckStatus = phase === 'failed' && (needsRecovery.current || Boolean(activeTask.current))
  const lyricsTopicChanged = lyricsTopic !== null && topic.trim() !== lyricsTopic
  const lyricsForTopic = lyricsTopicChanged ? { ...lyrics, endingAction: 'groove' as const } : lyrics
  let approvedLyrics: RapLyricsDraft | undefined
  try { approvedLyrics = lyricsText === lyrics.lines.join(' ') ? normalizeRapLyricsDraft(lyricsForTopic) : rapLyricsFromText(lyricsText, 'auto', lyricsForTopic.endingAction) } catch { /* The paragraph can contain unfinished edits. */ }
  const validLyrics = Boolean(approvedLyrics)
  const currentDraft = useRef<RapCreatorDraft | null>(null)
  currentDraft.current = { photos: [photos[0]?.file ?? null, photos[1]?.file ?? null], scene, topic, voices, photoMode, consent }

  function requestFullVideo() {
    setError(null)
    if (fullVideo) { document.querySelector<HTMLButtonElement>('.rap-duo-generate')?.focus({ preventScroll: true }); return }
    if (!billing.signedIn) {
      awaitingSignIn.current = true
      rememberRapAccessIntent()
      window.dispatchEvent(new Event('rap-auth-required'))
    } else setCreditDialogOpen(true)
  }

  function hideOldPreview() {
    previewDismissedRef.current = true
    setPreviewDismissed(true)
    if (storageKey.current) dismissRapPreview(storageKey.current)
  }

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
    const hide = previewDismissedRef.current && Boolean(video.duration && video.duration <= RAP_PREVIEW_DURATION + 0.25)
    setResult(hide ? null : video)
    setPreviewState(current => current === 'processing' ? 'used' : current)
    setPhase(hide ? 'idle' : 'succeeded')
    if (hide) { forgetTask(); previousTask.current = taskId }
    setError(null)
    fullRequestId.current = null
    window.dispatchEvent(new Event('rap-credits-changed'))
  }
  function fail(cause: unknown, fallback: RapErrorCode) {
    const code = getRapErrorCode(cause, fallback)
    if (code === 'trialUsed') setPreviewState('used')
    if (code === 'trialProcessing') setPreviewState('processing')
    if (cause instanceof DanceGenerationError && cause.terminal && code === 'generation') setPreviewState('available')
    if (cause instanceof DanceGenerationError && cause.terminal) { forgetTask(); needsRecovery.current = false }
    setError(code)
    setPhase('failed')
    window.dispatchEvent(new Event('rap-credits-changed'))
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
      const dismissed = owned.paidCredits > 0 || wasRapPreviewDismissed(owned.storageKey)
      previewDismissedRef.current = dismissed
      setPreviewDismissed(dismissed)
      if (owned.paidCredits > 0) dismissRapPreview(owned.storageKey)
      setPreviewState(owned.previewState ?? 'available')
      setComplimentaryFullVideo(owned.complimentaryFullVideo === true)
      needsRecovery.current = false
      setRestoring(false)
      let tabTask: string | null = null
      try { tabTask = readDanceTask(window.sessionStorage, owned.storageKey) } catch { /* Optional tab recovery. */ }
      const paidTask = owned.paidOrder?.taskId
      const activePaidTask = ['starting', 'processing'].includes(owned.paidOrder?.state ?? '') ? paidTask : undefined
      const task = resolveRapRecoveryTask(activePaidTask ?? owned.directTaskId ?? paidTask ?? owned.purchase?.taskId ?? null, tabTask, previousTask.current)
      if (paidTask) { submittedMode.current = 'full'; recoveredPaidTask.current = paidTask }
      if (owned.paidOrder?.state === 'succeeded' && owned.paidOrder.result && (!owned.directTaskId || owned.directTaskId === paidTask)) {
        setResult(owned.paidOrder.result)
        setPhase('succeeded')
      } else if (owned.paidOrder?.state === 'refund_pending' || owned.paidOrder?.state === 'refunded') {
        forgetTask(); fullRequestId.current = null
        setError(owned.paidOrder.refundStatus === 'partially_refunded' ? 'partialRefund' : owned.paidOrder.state === 'refunded' ? 'refunded' : 'refundPending')
        setPhase('failed')
      } else if (owned.paidOrder?.state === 'starting' && !paidTask) {
        needsRecovery.current = true
        setError('paidProcessing'); setPhase('failed')
      } else if (owned.purchase?.state === 'succeeded' && owned.purchase.result && !owned.directTaskId) {
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
    let cancelled = false
    const ready = readRapDraft().then(saved => {
      if (cancelled) return
      if (saved) {
        setPhotos(saved.photos.map(file => file ? { file } : null) as typeof photos)
        setScene(saved.scene); setTopic(saved.topic); setVoices(saved.voices)
        setPhotoMode(saved.photoMode); setConsent(saved.consent)
        setDuoPhotoReady(saved.photoMode === 'together' && saved.photos.every(Boolean))
        currentDraft.current = saved
      } else {
        // One-time migration of older non-photo settings.
        try {
          const old = JSON.parse(sessionStorage.getItem(DRAFT_STORAGE_KEY) ?? 'null')
          if (old && typeof old === 'object') {
            if (RAP_VIDEO_SCENES.some(item => item.id === old.scene)) setScene(old.scene)
            if (typeof old.topic === 'string') setTopic(old.topic.slice(0, RAP_TOPIC_LIMIT))
            if (old.voices !== undefined) setVoices(normalizeRapVoices(old.voices))
          }
          sessionStorage.removeItem(DRAFT_STORAGE_KEY)
        } catch { /* Optional legacy settings. */ }
      }
    }).catch(() => { if (!cancelled) { draftReadFailed.current = true; setDraftError('restore') } })
      .finally(() => { if (!cancelled) setDraftRestored(true) })
    const flush = (event: Event) => {
      const detail = (event as CustomEvent<{ promises: Promise<void>[] }>).detail
      detail.promises.push(ready.then(async () => {
        if (draftReadFailed.current || !currentDraft.current) throw new Error('draft_restore_failed')
        await saveRapDraft(currentDraft.current)
        if (!cancelled) setDraftError(null)
      }))
    }
    window.addEventListener('rap-save-draft', flush)
    return () => { cancelled = true; window.removeEventListener('rap-save-draft', flush) }
  }, [])
  useEffect(() => {
    if (!draftRestored || draftReadFailed.current) return
    let cancelled = false
    const timer = setTimeout(() => {
      void saveRapDraft(currentDraft.current!).then(() => { if (!cancelled) setDraftError(null) })
        .catch(() => { if (!cancelled) setDraftError('save') })
    }, 250)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [draftRestored, photos, scene, topic, voices, photoMode, consent])
  useEffect(() => {
    const dismissed = () => { awaitingSignIn.current = false; forgetRapAccessIntent() }
    window.addEventListener('rap-auth-dismissed', dismissed)
    return () => window.removeEventListener('rap-auth-dismissed', dismissed)
  }, [])
  useEffect(() => {
    if (!billing.signedIn || billing.loading || billing.checking || restoring) return
    if (awaitingSignIn.current || hasRapAccessIntent()) {
      awaitingSignIn.current = false; forgetRapAccessIntent()
      if (!fullVideo) setCreditDialogOpen(true)
    }
  }, [billing.signedIn, billing.loading, billing.checking, restoring, fullVideo])
  useEffect(() => { if (fullVideo) setCreditDialogOpen(false) }, [fullVideo])
  useEffect(() => {
    if (billing.loading || (!billing.paidOrderId && billing.credits < 1)) return
    hideOldPreview()
    setCreditDialogOpen(false)
  }, [billing.loading, billing.paidOrderId, billing.credits])
  useEffect(() => {
    if (previewDismissed && isPreviewResult) {
      previousTask.current = activeTask.current
      forgetTask(); setResult(null); setPlayback(null); setError(null)
      if (!working) setPhase('idle')
    }
  }, [previewDismissed, isPreviewResult])
  useEffect(() => {
    mounted.current = true
    const controller = new AbortController()
    operation.current = controller
    void recover(controller).finally(() => { if (operation.current === controller) operation.current = null })
    const reconcileAccount = () => {
      setPhotos(current => current.map(photo => photo ? { file: photo.file } : null) as typeof photos)
      if (operation.current) return
      setRestoring(true)
      const recovery = new AbortController()
      operation.current = recovery
      void recover(recovery).finally(() => { if (operation.current === recovery) operation.current = null })
    }
    window.addEventListener('rap-account-changed', reconcileAccount)
    return () => { window.removeEventListener('rap-account-changed', reconcileAccount); mounted.current = false; operation.current?.abort(); controller.abort(); downloadOperation.current?.abort(); lyricsOperation.current?.abort(); duoPhotoOperation.current?.abort() }
  }, [])
  useEffect(() => {
    const taskId = billing.order?.taskId
    if (!taskId || taskId === recoveredPaidTask.current || !['starting', 'processing'].includes(billing.order?.state ?? '') || operation.current) return
    recoveredPaidTask.current = taskId
    submittedMode.current = 'full'
    const controller = new AbortController()
    operation.current = controller
    void followTask(taskId, controller).catch(cause => { if (!controller.signal.aborted) fail(cause, 'status') }).finally(() => { if (operation.current === controller) operation.current = null })
  }, [billing.order?.taskId, billing.order?.state])
  useEffect(() => {
    if (phase === 'failed' && billing.order?.state === 'refunded' && billing.order.refundStatus === 'partially_refunded' && ['refunded', 'refundPending', 'generation'].includes(error ?? '')) setError('partialRefund')
  }, [phase, error, billing.order?.state, billing.order?.refundStatus])
  useEffect(() => {
    setLongWait(false)
    if (!working) return
    const timer = setTimeout(() => setLongWait(true), 2 * 60 * 1000)
    return () => clearTimeout(timer)
  }, [working])

  function selectPhoto(index: number, file: File | null) {
    if (working || duoPhotoOperation.current || !draftRestored) return
    if (file) { const code = validateRapPhoto(file); if (code) { setError(code); return } }
    draftReadFailed.current = false
    setPhotos(current => current.map((photo, position) => position === index ? file ? { file } : null : photo) as typeof photos)
    setDuoPhotoReady(false)
    setDuoPhotoError(null)
    setError(null)
  }
  async function selectDuoPhoto(file: File) {
    if (working || duoPhotoOperation.current || !draftRestored) return
    const controller = new AbortController()
    duoPhotoOperation.current = controller
    setSplittingPhoto(true); setDuoPhotoError(null); setDuoPhotoReady(false); setError(null)
    const timer = setTimeout(() => controller.abort(new DuoPhotoError('unavailable')), 45_000)
    try {
      const [first, second] = await splitDuoPhoto(file, controller.signal)
      if (!mounted.current || controller.signal.aborted) return
      // Commit both portraits together; a failed split never replaces an
      // existing individual photo or leaves only one new person applied.
      draftReadFailed.current = false
      setPhotos([{ file: first }, { file: second }])
      setDuoPhotoReady(true)
    } catch (cause) {
      if (mounted.current) setDuoPhotoError(cause instanceof DuoPhotoError ? cause.code : 'failed')
    } finally {
      clearTimeout(timer)
      if (duoPhotoOperation.current === controller) {
        duoPhotoOperation.current = null
        if (mounted.current) setSplittingPhoto(false)
      }
    }
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
    if (operation.current || duoPhotoOperation.current || working || writingLyrics || restoring || !draftRestored || billing.loading || billing.verifying || !isAvailable) return
    if (canCheckStatus) { await retryStatus(); return }
    let submittedLyrics = RAP_LYRICS_UI_ENABLED ? approvedLyrics : undefined
    if (RAP_LYRICS_UI_ENABLED && !submittedLyrics) return
    if (!photos[0] || !photos[1]) { setError('photoRequired'); return }
    if (!consent) { setError('consentRequired'); return }
    if (!fullVideo && (billing.signedIn || previewState === 'used')) { requestFullVideo(); return }
    // The full-video button is an explicit credit-spending action. A preview
    // request always stays a preview even if the balance changes mid-submit.
    const generationMode = fullVideo ? 'full' : 'preview'
    if (generationMode === 'full' && !complimentaryFullVideo && paidOrderBusy) { setError('paidProcessing'); return }
    submittedMode.current = generationMode
    fullRequestId.current = generationMode === 'full' ? crypto.randomUUID() : null
    previousTask.current = activeTask.current ?? previousTask.current
    forgetTask()
    const controller = new AbortController()
    operation.current = controller
    setError(null)
    setDownloadError(false)
    setResult(null)
    setPhase(RAP_LYRICS_UI_ENABLED ? 'uploading' : 'preparing')
    let submitted = false
    let stage: RapErrorCode = 'visitor'
    const timer = setTimeout(() => controller.abort(new RapGenerationError('timeout')), 180_000)
    try {
      await ensureDanceSession(controller.signal)
      const admission = await readDancePurchase(controller.signal)
      setPreviewState(admission.previewState ?? 'available')
      setComplimentaryFullVideo(admission.complimentaryFullVideo === true)
      if (generationMode === 'full' && !admission.complimentaryFullVideo && admission.paidCredits < 1) throw new RapGenerationError('credits', true)
      if (generationMode === 'preview' && !admission.complimentaryFullVideo && admission.previewState === 'used') throw new RapGenerationError('trialUsed', true)
      if (generationMode === 'preview' && !admission.complimentaryFullVideo && admission.previewState === 'processing') throw new RapGenerationError('trialProcessing', true)
      if (!RAP_LYRICS_UI_ENABLED) {
        stage = 'generation'
        submittedLyrics = await requestRapLyrics(topic, 'en', controller.signal)
        controller.signal.throwIfAborted()
      }
      if (!submittedLyrics) throw new RapGenerationError('generation')
      setPhase('uploading')
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
      const task = await startRapGeneration({ personOneImageUrl: urls[0], personTwoImageUrl: urls[1], scene, topic, lyrics: submittedLyrics, voices, generationMode, ...(fullRequestId.current ? { requestId: fullRequestId.current } : {}) }, controller.signal)
      clearTimeout(timer)
      if (controller.signal.aborted) return
      needsRecovery.current = false
      if (generationMode === 'preview' && !admission.complimentaryFullVideo) setPreviewState('processing')
      if (generationMode === 'full') recoveredPaidTask.current = task.taskId
      window.dispatchEvent(new Event('rap-credits-changed'))
      await followTask(task.taskId, controller)
    } catch (cause) {
      if (mounted.current) {
        if (!submitted || (cause instanceof RapGenerationError && cause.submissionRejected)) {
          forgetTask()
          needsRecovery.current = false
        }
        fail(controller.signal.aborted ? controller.signal.reason : cause, stage)
        if (['credits', 'trialUsed'].includes(getRapErrorCode(cause, stage))) requestFullVideo()
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
    <div className="rap-duo-workbench">
    <header className="rap-duo-heading"><span className="rap-duo-heading-icon"><Mic2 size={22} aria-hidden="true" /></span><div><p>{copy.title}</p><span>{copy.subtitle}</span></div></header>
    <form className="rap-duo-form" onSubmit={event => { void generate(event) }} noValidate>
      <fieldset className="rap-duo-step" disabled={working || splittingPhoto || !draftRestored}>
        <legend><span className="rap-duo-number">01</span>{copy.photos}</legend>
        <div className="rap-duo-photo-tabs" role="tablist" aria-label={copy.photoModes.label}>
          {(['separate', 'together'] as const).map(mode => <button key={mode} type="button" role="tab" className="rap-duo-photo-tab"
            id={id + '-photo-tab-' + mode} data-photo-mode={mode} aria-selected={photoMode === mode} aria-controls={id + '-photo-panel'}
            tabIndex={photoMode === mode ? 0 : -1} disabled={working || splittingPhoto} onClick={() => setPhotoMode(mode)}
            onKeyDown={event => {
              if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
              event.preventDefault()
              const next = event.key === 'Home' ? 'separate' : event.key === 'End' ? 'together' : photoMode === 'separate' ? 'together' : 'separate'
              setPhotoMode(next)
              event.currentTarget.parentElement?.querySelector<HTMLButtonElement>(`[data-photo-mode="${next}"]`)?.focus()
            }}>{copy.photoModes[mode]}</button>)}
        </div>
        <div className="rap-duo-photo-panel" role="tabpanel" id={id + '-photo-panel'} aria-labelledby={id + '-photo-tab-' + photoMode}>
        <p className="rap-duo-hint">{photoMode === 'separate' ? copy.photoModes.separateHint : copy.photoModes.togetherHint}</p>
        {photoMode === 'together' && <RapDuoPhotoUpload id={id + '-duo-photo'} disabled={working || !draftRestored} busy={splittingPhoto} copy={copy.duoPhoto}
          message={duoPhotoReady ? copy.duoPhoto.success : null} error={duoPhotoError ? copy.duoPhoto.errors[duoPhotoError] : null} onSelect={file => { void selectDuoPhoto(file) }} />
        }
        {(photoMode === 'separate' || photos.every(Boolean)) && <div className="rap-duo-photos">{photos.map((photo, index) => <PhotoInput key={index} id={id + '-person-' + (index + 1)} index={index} photo={photo} voice={voices[index]} otherVoice={voices[index === 0 ? 1 : 0]} disabled={working || splittingPhoto || !draftRestored} previewOnly={photoMode === 'together'} copy={copy} onChange={file => selectPhoto(index, file)}
          onVoiceChange={voice => setVoices(current => index === 0 ? [voice, current[1]] : [current[0], voice])} />)}
        <button className="rap-duo-swap" type="button" aria-label={copy.swapPeople} title={copy.swapPeople} disabled={working || splittingPhoto || !photos[0] || !photos[1]} onClick={() => { setPhotos(([first, second]) => [second, first]); setVoices(([first, second]) => [second, first]) }}><ArrowRightLeft size={20} aria-hidden="true" /></button>
        </div>}
        </div>
      </fieldset>
      <fieldset className="rap-duo-step" disabled={working || !draftRestored}>
        <legend><span className="rap-duo-number">02</span>{copy.scene}</legend>
        <p className="rap-duo-hint">{copy.sceneHint}</p>
        <div className="rap-duo-scenes">{RAP_VIDEO_SCENES.map(item => <label className={'rap-duo-scene' + (scene === item.id ? ' is-selected' : '')} key={item.id}>
          <input type="radio" name={id + '-scene'} value={item.id} checked={scene === item.id} onChange={() => setScene(item.id)} />
          <img src={item.image} alt="" loading="lazy" width={360} height={200} />
          <span className="rap-duo-scene-overlay" /><span className="rap-duo-scene-copy"><strong>{copy.scenes[item.id].name}</strong><span>{copy.scenes[item.id].description}</span></span>
          <span className="rap-duo-selected" aria-hidden="true">{scene === item.id && <Check size={13} strokeWidth={3} />}</span>
        </label>)}</div>
      </fieldset>
      <fieldset className="rap-duo-step" disabled={working || !draftRestored}>
        <legend><span className="rap-duo-number">03</span><label htmlFor={id + '-topic'}>{copy.topic}</label><span className="rap-duo-optional">{copy.optional}</span></legend>
        <p className="rap-duo-hint">{copy.topicHint}</p>
        <textarea ref={topicInput} id={id + '-topic'} maxLength={RAP_TOPIC_LIMIT} rows={2} value={topic} onChange={event => setTopic(event.target.value)} placeholder={copy.topicPlaceholder} aria-describedby={id + '-topic-count'} />
        <div className="rap-duo-topic-footer">
          <div className="rap-duo-topic-presets" role="group" aria-label={copy.topic}>
            {copy.topicPresets.map(preset => <button className="rap-duo-topic-preset" key={preset.label} type="button" disabled={working}
              aria-pressed={topic === preset.text} onClick={() => { setTopic(preset.text); topicInput.current?.focus() }}>{preset.label}</button>)}
          </div>
          <p id={id + '-topic-count'} className="rap-duo-count">{topic.length}/{RAP_TOPIC_LIMIT}</p>
        </div>
      </fieldset>
      {RAP_LYRICS_UI_ENABLED && <fieldset className="rap-duo-step rap-duo-lyrics-editor" disabled={working || writingLyrics}>
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
      </fieldset>}
      {RAP_LYRICS_UI_ENABLED && lyricsError && <p className="rap-duo-error" role="alert">{copy.lyrics.error}</p>}
      <footer className="rap-duo-actions">
        <div className="rap-duo-specs"><span>{offerFullVideo || working && submittedMode.current === 'full' ? creditCopy.fullDuration : copy.duration}</span><span>{copy.resolution}</span><span><Music2 size={12} aria-hidden="true" />{copy.audio}</span></div>
        {(complimentaryFullVideo || fullVideo) && <p className="rap-duo-hint">{complimentaryFullVideo ? copy.complimentary.hint : creditCopy.creditHint}</p>}
        <label className="rap-duo-consent"><input type="checkbox" checked={consent} onChange={event => setConsent(event.target.checked)} disabled={working} /><span>{copy.consent}</span></label>
        {error && <p className="rap-duo-error" role="alert">{copy.errors[error]}</p>}
        {draftError && <p className="rap-duo-error" role="alert">{draftError === 'restore' ? creditCopy.draftRestore : creditCopy.errors.draft}</p>}
        {billing.error && <p className="rap-duo-error" role="alert">{creditCopy.errors[billing.error]}</p>}
        {billing.verifying && <p className="rap-duo-hint" role="status">{creditCopy.verifying}</p>}
        {!isAvailable && <p className="rap-duo-error" role="status">{copy.unavailable}</p>}
        {RAP_LYRICS_UI_ENABLED && !validLyrics && !canCheckStatus && <p className="rap-duo-hint">{copy.lyrics.invalid}</p>}
        {!fullVideo && previewState !== 'available' && !working && !canCheckStatus && <p className="rap-duo-hint" role="status">{previewState === 'used' ? copy.errors.trialUsed : copy.errors.trialProcessing}</p>}
        <button className="rap-duo-generate" type="submit" disabled={working || splittingPhoto || writingLyrics || restoring || !draftRestored || billing.loading || billing.verifying || billing.checkoutBusy || !isAvailable || (!canCheckStatus && (paidOrderBusy || !offerFullVideo && previewState === 'processing')) || (RAP_LYRICS_UI_ENABLED && !canCheckStatus && !validLyrics)}>
          {working || restoring || !draftRestored || billing.loading ? <LoaderCircle className="rap-duo-spin" size={18} aria-hidden="true" /> : <Sparkles size={18} aria-hidden="true" />}
          {restoring || !draftRestored ? copy.status.recovering : working ? copy.status[phase] : canCheckStatus ? copy.checkStatus : complimentaryFullVideo ? phase === 'failed' ? copy.complimentary.retry : result ? copy.complimentary.again : copy.complimentary.generate : fullVideo ? creditCopy.useCredit : offerFullVideo ? creditCopy.generateFull : phase === 'failed' ? copy.retry : result ? copy.generateAgain : copy.generate}
        </button>
        <RapRefundNotice locale={locale} />
        {!complimentaryFullVideo && billing.signedIn && <p className="rap-credit-balance">{creditCopy.balance}: <strong>{billing.credits}</strong></p>}
        <p className="rap-duo-privacy"><ShieldCheck size={13} aria-hidden="true" />{copy.privacy}</p>
      </footer>
    </form>
    </div>
    <aside className="rap-duo-output" aria-label={copy.resultTitle}>
      <p className="rap-duo-output-title">{!result && !working && !restoring && phase === 'idle' && !previewDismissed && !fullVideo ? copy.idleExample.label : copy.resultTitle}</p>
      <div className="rap-duo-screen" aria-busy={working}>
        {result ? <video key={result.videoUrl} ref={video} src={result.videoUrl} poster={result.coverImageUrl} controls playsInline preload="metadata" aria-label={copy.videoLabel}
          onLoadedMetadata={event => setPlayback({ url: result.videoUrl, duration: event.currentTarget.duration, watched: false })}
          onEnded={event => setPlayback({ url: result.videoUrl, duration: event.currentTarget.duration, watched: true })}>{copy.videoUnsupported}</video> : !working && !restoring && phase === 'idle' && !previewDismissed && !fullVideo ? <div className="rap-editorial-sample">
          <video src="/videos/examples/rap-portrait-couple.mp4" poster="/images/examples/rap-portrait-couple.jpg" controls playsInline preload="none" aria-label={copy.idleExample.videoLabel}>{copy.videoUnsupported}</video>
        </div> : <div className="rap-duo-empty">
          <div className={'rap-duo-mic' + (working ? ' is-working' : '')}>{working ? <LoaderCircle className="rap-duo-spin" size={32} aria-hidden="true" /> : <Mic2 size={38} strokeWidth={1.3} aria-hidden="true" />}</div>
          <p>{working ? copy.status[phase] : fullVideo ? creditCopy.readyTitle : copy.resultEmpty}</p>{!working && <span>{fullVideo ? creditCopy.readyDescription : copy.resultHint}</span>}
          <div className="rap-duo-bars" aria-hidden="true">{[14, 25, 38, 22, 44, 30, 19, 34, 16].map((height, index) => <i key={index} style={{ height }} />)}</div>
        </div>}
      </div>
      {isPreviewResult && !previewDismissed && !complimentaryFullVideo && <RapPreviewNextStep key={result!.videoUrl} watched={currentPlayback?.watched ?? false} locale={locale} onContinue={requestFullVideo} disabled={billing.loading || billing.verifying || restoring} />}
      {RAP_LYRICS_UI_ENABLED && result && <RapLyrics draft={result.rapLyrics} videoRef={video} videoUrl={result.videoUrl} locale={locale} />}
      {phase !== 'idle' && !restoring && !isPreviewResult && <p className={'rap-duo-status' + (result ? ' is-ready' : '')} role="status" aria-live="polite">{result && <CheckCircle2 size={15} aria-hidden="true" />}{copy.status[phase]}</p>}
      {longWait && working && !result && <p className="rap-duo-hint" role="status" aria-live="polite" data-testid="rap-long-wait">{copy.longWait}</p>}
      {result && <div className="rap-duo-download"><button type="button" onClick={() => { void download() }} disabled={downloading}>
        {downloading ? <LoaderCircle className="rap-duo-spin" size={17} aria-hidden="true" /> : <Download size={17} aria-hidden="true" />}{downloading ? copy.downloading : downloadError ? copy.retryDownload : copy.download}
      </button><p>{copy.downloadHint}</p>{downloadError && <p className="rap-duo-error" role="alert">{copy.errors.download}</p>}</div>}
      <span className="rap-duo-output-format">{!result && `${offerFullVideo || working && submittedMode.current === 'full' ? RAP_VIDEO_DURATION : RAP_PREVIEW_DURATION}s · `}9:16 · MP4</span>
    </aside>
    <RapCreditDialog open={creditDialogOpen} onOpenChange={setCreditDialogOpen} locale={locale} />
  </section>
}
