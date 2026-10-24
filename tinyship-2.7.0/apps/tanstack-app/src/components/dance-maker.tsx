import { useEffect, useId, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { CheckCircle2, Download, Film, ImagePlus, LoaderCircle, LockKeyhole, Monitor, RotateCcw, ShieldCheck, Smartphone, Upload } from 'lucide-react'
import { Button } from '@libs/react-shared/ui/button'
import type { VideoGenerationResult } from '@libs/ai/types'
import { forgetDanceTask, readDanceTask, rememberDanceTask } from '../lib/dance-task-session'
import { forgetDanceInputs, readDanceInputs, rememberDanceInputs } from '../lib/dance-input-session'
import { VIDEO_PAYMENT_REQUIRED } from '../../../../config/videoPurchase'
import { DanceCheckoutDialog, type DanceCheckoutCopy } from './dance-checkout-dialog'
import { DANCE_CUSTOM_DESCRIPTION_LIMIT, DANCE_FIXED_SCENE_QUICK_TAG_IDS, type DanceQuickTag } from '../../../../config/danceCustomization'
import { DANCE_ORIENTATIONS, DEFAULT_DANCE_ORIENTATION, type DanceOrientation } from '../../../../config/danceOutput'
import { DANCE_LONG_WAIT_DELAY_MS } from '../../../../config/danceUi'
import type { VideoFailureReason } from '../../../../config/videoFailure'
import {
  DANCE_DURATION_SECONDS,
  DANCE_PHOTO_ACCEPT,
  DanceGenerationError,
  ensureDanceSession,
  createDanceCheckout,
  readDancePurchase,
  pollDancePurchase,
  resumeDancePurchase,
  startDanceGeneration,
  startDirectDanceGeneration,
  verifyDanceCheckout,
  pollDanceTask,
  uploadDancePhoto,
  validateDancePhoto,
  type DanceErrorCode,
  type DancePhase,
  type PublicVideoPurchase,
} from '../lib/dance-generation'

export interface DanceMakerCopy {
  photoLabel: string
  photoHint: string
  choosePhoto: string
  changePhoto: string
  removePhoto: string
  photoPreviewAlt: string
  princessLabel: string
  princessHint: string
  orientation: {
    label: string
    options: Record<DanceOrientation, string>
  }
  customization: {
    label: string
    placeholder: string
    hint: string
    clear: string
    tags: readonly { id: DanceQuickTag; label: string }[]
  }
  choosePrincess: string
  changePrincess: string
  restorePrincess: string
  princessPreviewAlt: string
  defaultPrincessAlt: string
  defaultPrincessLabel: string
  generateButton: string
  retryGenerate: string
  retryStatus: string
  resetButton: string
  consentLabel: string
  costHint: string
  refundGuarantee: string
  mediaPrivacyTitle: string
  mediaPrivacyHint: string
  offerNoLogin: string
  offerFree: string
  trialHint: string
  trialUsedHint: string
  trialPendingHint: string
  resultTitle: string
  failureReasons: Record<VideoFailureReason, string>
  resultEmpty: string
  videoLabel: string
  videoUnsupported: string
  status: Record<DancePhase, string>
  progressHint: string
  longWaitHint: string
  fidelityHint: string
  unavailableHint: string
  downloadButton: string
  downloading: string
  downloadHint: string
  checkout: DanceCheckoutCopy
  errors: Record<DanceErrorCode, string>
}

interface DanceMakerProps {
  copy: DanceMakerCopy
  isAvailable?: boolean
  className?: string
}

type RecoverySource = 'lookup' | 'checkout' | 'purchase' | 'legacy'

export function DanceMaker({ copy, isAvailable = true, className = '' }: DanceMakerProps) {
  const id = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const princessInputRef = useRef<HTMLInputElement>(null)
  const generateRef = useRef<HTMLButtonElement>(null)
  const operationRef = useRef<AbortController | null>(null)
  const downloadRef = useRef<AbortController | null>(null)
  const runRef = useRef(0)
  const [photo, setPhoto] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null)
  const [princessPhoto, setPrincessPhoto] = useState<File | null>(null)
  const [princessPreviewUrl, setPrincessPreviewUrl] = useState<string | null>(null)
  const [uploadedPrincessUrl, setUploadedPrincessUrl] = useState<string | null>(null)
  const [consent, setConsent] = useState(false)
  const [customDescription, setCustomDescription] = useState('')
  const [quickTags, setQuickTags] = useState<DanceQuickTag[]>([])
  const [orientation, setOrientation] = useState<DanceOrientation>(DEFAULT_DANCE_ORIENTATION)
  const [phase, setPhase] = useState<DancePhase>('idle')
  const [showLongWait, setShowLongWait] = useState(false)
  const [error, setError] = useState<DanceErrorCode | null>(null)
  const [taskId, setTaskId] = useState<string | null>(null)
  const [result, setResult] = useState<VideoGenerationResult | null>(null)
  const [downloading, setDownloading] = useState(false)
  const [purchase, setPurchase] = useState<PublicVideoPurchase | null>(null)
  const [purchaseLoading, setPurchaseLoading] = useState(true)
  const [recoveryRequired, setRecoveryRequired] = useState(true)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [checkoutCancelled, setCheckoutCancelled] = useState(false)
  const [returnedSessionId, setReturnedSessionId] = useState<string | null>(null)
  const [storageKey, setStorageKey] = useState<string | null>(null)
  const isWorking = phase === 'uploading' || phase === 'submitting' || phase === 'processing'
  const canCheckTask = Boolean(phase === 'failed' && (recoveryRequired || (!purchase && taskId) || (purchase && ['paid', 'starting', 'processing', 'refund_pending'].includes(purchase.state)) || returnedSessionId))
  const referencesLocked = recoveryRequired || purchaseLoading || isWorking || canCheckTask
  const costHint = copy.costHint.replace('{duration}', String(DANCE_DURATION_SECONDS))
  const hasDancer = Boolean(photo || uploadedUrl)
  const hasCustomPrincess = Boolean(princessPhoto || uploadedPrincessUrl)
  const purchaseFailed = phase === 'failed' && purchase && ['refund_pending', 'refunded'].includes(purchase.state)
  const failureReason = purchaseFailed ? purchase.failureReason : undefined

  useEffect(() => {
    setShowLongWait(false)
    if (phase !== 'processing') return
    const timer = setTimeout(() => setShowLongWait(true), DANCE_LONG_WAIT_DELAY_MS)
    return () => clearTimeout(timer)
  }, [phase, purchase?.id])

  useEffect(() => {
    if (!purchase) return
    if (purchase.dancerImageUrl) {
      setUploadedUrl(purchase.dancerImageUrl)
      setUploadedPrincessUrl(purchase.princessImageUrl ?? null)
      setConsent(true)
    }
    if (purchase.customDescription !== undefined) setCustomDescription(purchase.customDescription)
    if (purchase.quickTags !== undefined) setQuickTags([...purchase.quickTags])
  }, [purchase?.id, purchase?.dancerImageUrl, purchase?.princessImageUrl, purchase?.customDescription, purchase?.quickTags?.join('|')])

  useEffect(() => {
    if (purchase?.orientation) setOrientation(purchase.orientation)
  }, [purchase?.id, purchase?.orientation])

  useEffect(() => {
    if (!photo) { setPreviewUrl(null); return }
    const url = URL.createObjectURL(photo)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [photo])

  useEffect(() => {
    if (!princessPhoto) { setPrincessPreviewUrl(null); return }
    const url = URL.createObjectURL(princessPhoto)
    setPrincessPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [princessPhoto])

  useEffect(() => () => {
    runRef.current += 1
    operationRef.current?.abort()
    downloadRef.current?.abort()
  }, [])

  useEffect(() => {
    let disposed = false
    const controller = new AbortController()
    const run = ++runRef.current
    operationRef.current = controller
    const url = new URL(window.location.href)
    const sessionId = url.searchParams.get('checkout_session_id')
    const cancelled = url.searchParams.get('checkout') === 'cancelled'
    setCheckoutCancelled(cancelled)
    if (sessionId && !cancelled) setReturnedSessionId(sessionId)
    void recoverOwnedPurchase(controller, run, sessionId, cancelled).finally(() => {
      if (!disposed && run === runRef.current) setPurchaseLoading(false)
      if (operationRef.current === controller) operationRef.current = null
    })
    return () => { disposed = true; controller.abort() }
  }, [])

  function clearCheckoutQuery() {
    const url = new URL(window.location.href)
    url.searchParams.delete('checkout_session_id')
    url.searchParams.delete('checkout')
    window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`)
  }

  function handleRecoveryError(cause: unknown, source: RecoverySource, recoveryStorageKey = storageKey, ownedPurchase = purchase) {
    const code = cause instanceof DanceGenerationError ? cause.code : 'status'
    if (source === 'lookup') {
      // Until ownership is known, a network failure must not offer another charge.
      setRecoveryRequired(true)
    } else if (cause instanceof DanceGenerationError && cause.terminal) {
      setReturnedSessionId(null)
      clearCheckoutQuery()
      if (source !== 'checkout') {
        setPurchase(null)
        setTaskId(null)
        if (recoveryStorageKey) {
          try { forgetDanceTask(window.sessionStorage, recoveryStorageKey) } catch { /* Storage may be disabled. */ }
        }
      }
      // A rejected return URL does not discard another valid owned purchase.
      // The preceding owned lookup already put that purchase into state.
      if (source === 'checkout' && ownedPurchase?.state === 'succeeded') {
        showPurchase(ownedPurchase)
        setError(code)
        return
      }
    }
    setError(code)
    setPhase('failed')
  }

  async function recoverOwnedPurchase(controller: AbortController, run: number, sessionId: string | null, cancelled: boolean) {
    let source: RecoverySource = 'lookup'
    let recoveryStorageKey = storageKey
    let ownedPurchase = purchase
    try {
      const owned = await readDancePurchase(controller.signal)
      if (controller.signal.aborted || run !== runRef.current) return
      recoveryStorageKey = owned.storageKey
      ownedPurchase = owned.purchase
      setStorageKey(owned.storageKey)
      setRecoveryRequired(false)
      setPurchase(owned.purchase)
      setTaskId(owned.purchase?.taskId ?? null)
      source = sessionId && !cancelled ? 'checkout' : 'purchase'
      const current = source === 'checkout' ? await verifyDanceCheckout(sessionId!, controller.signal) : owned.purchase
      if (controller.signal.aborted || run !== runRef.current) return
      setPurchaseLoading(false)
      if (current) {
        setPurchase(current)
        // A cancellation is informational. It must never trigger a generation.
        if (cancelled) {
          if (current.state === 'succeeded') showPurchase(current)
          clearCheckoutQuery()
          setPhase(current.state === 'succeeded' ? 'succeeded' : 'idle')
          return
        }
        if (sessionId && current.state !== 'pending') {
          clearCheckoutQuery()
          setReturnedSessionId(null)
        }
        if (current.state === 'pending' && !sessionId) { setError(null); setPhase('idle'); return }
        source = 'purchase'
        await recoverPurchase(current, controller, run)
        return
      }
      if (cancelled) { clearCheckoutQuery(); setError(null); setPhase('idle'); return }
      let savedTask: string | null = owned.directTaskId ?? null
      try {
        const savedInputs = readDanceInputs(window.sessionStorage, owned.storageKey)
        if (savedInputs) {
          setUploadedUrl(savedInputs.dancerImageUrl)
          setUploadedPrincessUrl(savedInputs.princessImageUrl ?? null)
          setCustomDescription(savedInputs.customDescription)
          setQuickTags(savedInputs.quickTags)
          setOrientation(savedInputs.orientation)
          setConsent(true)
        }
        savedTask ||= readDanceTask(window.sessionStorage, owned.storageKey)
      } catch { /* Storage may be disabled. */ }
      if (!savedTask) { setError(null); setPhase('idle'); return }
      source = 'legacy'
      setTaskId(savedTask)
      setPhase('processing')
      const video = await pollDanceTask(savedTask, controller.signal)
      if (controller.signal.aborted || run !== runRef.current) return
      setResult(video)
      setPhase('succeeded')
    } catch (cause) {
      if (controller.signal.aborted || run !== runRef.current) return
      handleRecoveryError(cause, source, recoveryStorageKey, ownedPurchase)
    }
  }

  function showPurchase(current: PublicVideoPurchase) {
    setPurchase(current)
    setTaskId(current.taskId)
    setResult(current.state === 'succeeded' ? current.result ?? null : null)
    if (current.state === 'succeeded') {
      setPhase('succeeded')
      setError(null)
    } else if (current.state === 'refund_pending' || current.state === 'refunded' || current.state === 'expired' || current.state === 'pending') {
      setPhase('failed')
      setError(current.state === 'refund_pending' ? 'refundPending' : current.state === 'refunded' ? 'refunded' : current.state === 'pending' ? 'paymentPending' : 'expired')
    }
  }

  async function recoverPurchase(current: PublicVideoPurchase, controller: AbortController, run: number) {
    setPurchase(current)
    setTaskId(current.taskId)
    setError(null)
    setPhase(current.state === 'paid' ? 'submitting' : 'processing')
    // Retain the server's confirmed task before polling so a status retry only
    // checks that task, including when the initial provider submission succeeded.
    const started = current.state === 'paid' ? await startDanceGeneration(current.id, controller.signal) : current
    if (controller.signal.aborted || run !== runRef.current) return
    setPurchase(started)
    setTaskId(started.taskId)
    setPhase('processing')
    const recovered = started.state === 'refund_pending' || started.state === 'paid'
      ? await pollDancePurchase(started.id, controller.signal)
      : await resumeDancePurchase(started, controller.signal)
    if (controller.signal.aborted || run !== runRef.current) return
    showPurchase(recovered)
  }

  const clearResult = () => {
    if (storageKey) {
      try { forgetDanceTask(window.sessionStorage, storageKey) } catch { /* Storage may be disabled. */ }
    }
    runRef.current += 1
    operationRef.current?.abort()
    downloadRef.current?.abort()
    operationRef.current = null
    downloadRef.current = null
    setTaskId(null)
    setPurchase(null)
    setReturnedSessionId(null)
    setCheckoutCancelled(false)
    setResult(null)
    setPhase('idle')
    setError(null)
    setDownloading(false)
  }

  const reset = () => {
    clearResult()
    if (storageKey) { try { forgetDanceInputs(window.sessionStorage, storageKey) } catch { /* Storage can be disabled. */ } }
    setCustomDescription('')
    setQuickTags([])
    setOrientation(DEFAULT_DANCE_ORIENTATION)
    setPhoto(null)
    setUploadedUrl(null)
    setPrincessPhoto(null)
    setUploadedPrincessUrl(null)
    setConsent(false)
    if (inputRef.current) inputRef.current.value = ''
    if (princessInputRef.current) princessInputRef.current.value = ''
  }

  const choosePhoto = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0]
    event.currentTarget.value = ''
    if (!file) return
    const validationError = validateDancePhoto(file)
    if (validationError) { setError(validationError); return }
    clearResult()
    setPhoto(file)
    setUploadedUrl(null)
    setConsent(false)
  }

  const choosePrincess = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0]
    event.currentTarget.value = ''
    if (!file) return
    const validationError = validateDancePhoto(file)
    if (validationError) { setError(validationError); return }
    clearResult()
    setPrincessPhoto(file)
    setUploadedPrincessUrl(null)
    setConsent(false)
  }

  const removeDancer = () => {
    clearResult()
    if (storageKey) { try { forgetDanceInputs(window.sessionStorage, storageKey) } catch { /* Storage can be disabled. */ } }
    setPhoto(null)
    setUploadedUrl(null)
    setConsent(false)
  }

  const restorePrincess = () => {
    clearResult()
    setPrincessPhoto(null)
    setUploadedPrincessUrl(null)
    setConsent(false)
  }

  const generate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (isWorking || operationRef.current || (!isAvailable && !canCheckTask)) return
    if (!canCheckTask) {
      if (recoveryRequired) return
      if (!hasDancer) { setError('photoRequired'); return }
      const validationError = (photo ? validateDancePhoto(photo) : null) || (princessPhoto ? validateDancePhoto(princessPhoto) : null)
      if (validationError) { setError(validationError); return }
      if (!consent) { setError('consentRequired'); return }
      setError(null)
      setCheckoutCancelled(false)
      if (!VIDEO_PAYMENT_REQUIRED) { await generateDirect(); return }
      setCheckoutOpen(true)
      setPhase('checkout')
      return
    }

    const controller = new AbortController()
    operationRef.current = controller
    const run = ++runRef.current
    setError(null)
    setPhase('processing')
    let source: RecoverySource = returnedSessionId ? 'checkout' : purchase ? 'purchase' : 'legacy'
    try {
      if (recoveryRequired) {
        await recoverOwnedPurchase(controller, run, returnedSessionId, checkoutCancelled)
      } else if (returnedSessionId) {
        const verified = await verifyDanceCheckout(returnedSessionId, controller.signal)
        if (controller.signal.aborted || run !== runRef.current) return
        if (verified.state !== 'pending') { clearCheckoutQuery(); setReturnedSessionId(null) }
        source = 'purchase'
        await recoverPurchase(verified, controller, run)
      } else if (purchase) {
        await recoverPurchase(purchase, controller, run)
      } else if (taskId) {
        const video = await pollDanceTask(taskId, controller.signal)
        if (controller.signal.aborted || run !== runRef.current) return
        setResult(video)
        setPhase('succeeded')
      }
    } catch (cause) {
      if (controller.signal.aborted || run !== runRef.current) return
      handleRecoveryError(cause, source)
    } finally {
      if (operationRef.current === controller) operationRef.current = null
    }
  }

  async function generateDirect() {
    clearResult()
    const controller = new AbortController()
    operationRef.current = controller
    const run = ++runRef.current
    setPhase('uploading')
    let activeTask: string | null = null
    try {
      await ensureDanceSession(controller.signal)
      controller.signal.throwIfAborted()
      const dancerUrl = uploadedUrl || await uploadDancePhoto(photo!, controller.signal)
      if (controller.signal.aborted || run !== runRef.current) return
      setUploadedUrl(dancerUrl)
      const princessUrl = princessPhoto ? uploadedPrincessUrl || await uploadDancePhoto(princessPhoto, controller.signal) : uploadedPrincessUrl ?? undefined
      if (controller.signal.aborted || run !== runRef.current) return
      setUploadedPrincessUrl(princessUrl ?? null)
      const controls = { customDescription, quickTags: quickTags.filter(tag => DANCE_FIXED_SCENE_QUICK_TAG_IDS.some(allowed => allowed === tag)), orientation }
      if (storageKey) { try { rememberDanceInputs(window.sessionStorage, storageKey, { dancerImageUrl: dancerUrl, princessImageUrl: princessUrl, ...controls }) } catch { /* Storage can be disabled. */ } }
      setPhase('submitting')
      const started = await startDirectDanceGeneration(dancerUrl, princessUrl, controller.signal, undefined, controls)
      if (controller.signal.aborted || run !== runRef.current) return
      activeTask = started.taskId
      setTaskId(activeTask)
      if (storageKey) { try { rememberDanceTask(window.sessionStorage, storageKey, activeTask) } catch { /* Storage can be disabled. */ } }
      setPhase('processing')
      const generated = await pollDanceTask(activeTask, controller.signal)
      if (controller.signal.aborted || run !== runRef.current) return
      setResult(generated)
      setError(null)
      setPhase('succeeded')
    } catch (cause) {
      if (controller.signal.aborted || run !== runRef.current) return
      if (cause instanceof DanceGenerationError && cause.terminal) {
        setTaskId(null)
        if (storageKey) { try { forgetDanceTask(window.sessionStorage, storageKey) } catch { /* Storage can be disabled. */ } }
      }
      setError(cause instanceof DanceGenerationError ? cause.code : activeTask ? 'status' : 'generation')
      setPhase('failed')
    } finally {
      if (operationRef.current === controller) operationRef.current = null
    }
  }

  const closeCheckout = (open: boolean) => {
    setCheckoutOpen(open)
    if (!open) {
      runRef.current += 1
      operationRef.current?.abort()
      operationRef.current = null
      setError(null)
      setPhase(result ? 'succeeded' : 'idle')
    }
  }

  const pay = async () => {
    if (recoveryRequired || operationRef.current || isWorking || !hasDancer || !consent || !isAvailable) return
    const controller = new AbortController()
    operationRef.current = controller
    const run = ++runRef.current
    setError(null)
    setPhase('uploading')
    try {
      await ensureDanceSession(controller.signal)
      controller.signal.throwIfAborted()
      const dancerUrl = uploadedUrl || await uploadDancePhoto(photo!, controller.signal)
      if (controller.signal.aborted || run !== runRef.current) return
      setUploadedUrl(dancerUrl)
      const princessUrl = princessPhoto ? uploadedPrincessUrl || await uploadDancePhoto(princessPhoto, controller.signal) : uploadedPrincessUrl ?? undefined
      if (controller.signal.aborted || run !== runRef.current) return
      setUploadedPrincessUrl(princessUrl ?? null)
      setPhase('submitting')
      const checkout = await createDanceCheckout(dancerUrl, princessUrl, window.location.pathname, controller.signal, undefined, { customDescription, quickTags: quickTags.filter(tag => DANCE_FIXED_SCENE_QUICK_TAG_IDS.some(allowed => allowed === tag)), orientation })
      if (controller.signal.aborted || run !== runRef.current) return
      window.location.assign(checkout.checkoutUrl)
    } catch (cause) {
      if (controller.signal.aborted || run !== runRef.current) return
      setError(cause instanceof DanceGenerationError ? cause.code : 'checkout')
      setPhase('checkout')
    } finally {
      if (operationRef.current === controller) operationRef.current = null
    }
  }

  const download = async () => {
    if (!result || downloading) return
    const controller = new AbortController()
    downloadRef.current = controller
    setDownloading(true)
    setError(null)
    let objectUrl: string | undefined
    try {
      const response = result.provider === 'autodl' || result.provider === 'compshare'
        ? await fetch('/api/video-generate/download', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: result.videoUrl }),
          signal: controller.signal,
        })
        : await fetch(result.videoUrl, { signal: controller.signal })
      if (!response.ok) throw new DanceGenerationError('download')
      const blob = await response.blob()
      if (!blob.size || (blob.type && !blob.type.startsWith('video/') && blob.type !== 'application/octet-stream')) throw new DanceGenerationError('download')
      if (controller.signal.aborted) return
      objectUrl = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = objectUrl
      const extension = blob.type === 'video/webm' ? 'webm' : blob.type === 'video/quicktime' ? 'mov' : 'mp4'
      link.download = `rumpelstiltskin-ai-dance.${extension}`
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch {
      if (!controller.signal.aborted) setError('download')
    } finally {
      // Give the browser time to start saving before releasing its object URL.
      if (objectUrl) setTimeout(() => URL.revokeObjectURL(objectUrl!), 1000)
      if (downloadRef.current === controller) { downloadRef.current = null; setDownloading(false) }
    }
  }

  return (
    <div id="dance-maker" className={`grid scroll-mt-24 overflow-hidden rounded-[1.75rem] border bg-card shadow-sm lg:grid-cols-[1.08fr_1fr] ${className}`} data-testid="dance-maker">
      <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-2 bg-[#315b39] px-5 py-4 text-[#fffdf5] sm:px-8 lg:col-span-2">
        <p className="flex flex-wrap items-center gap-x-5 gap-y-1 text-lg font-semibold sm:text-xl">
          <strong>{copy.offerNoLogin}</strong>
          <span className="rounded-full bg-[#f3d995] px-3 py-1 text-sm font-semibold text-[#293d2d]">{copy.offerFree}</span>
        </p>
      </div>
      <form onSubmit={(event) => { void generate(event) }} className="space-y-6 p-5 sm:p-8">
        <p className="rounded-xl border bg-muted/40 p-4 text-sm leading-relaxed">{result ? copy.trialUsedHint : isWorking || (purchase && ['paid', 'starting', 'processing'].includes(purchase.state)) ? copy.trialPendingHint : copy.trialHint}</p>
        {checkoutCancelled && <p className="rounded-xl border border-[#d6b96a]/40 bg-[#f3d995]/15 p-4 text-sm leading-relaxed" role="status">{copy.checkout.cancelled}</p>}
        <div className="space-y-3">
          <label htmlFor={`${id}-photo`} className="block text-base font-semibold">{copy.photoLabel}</label>
          <div className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed bg-muted/35 p-5 text-center">
            {previewUrl || uploadedUrl ? (
              <img src={previewUrl ?? uploadedUrl!} alt={copy.photoPreviewAlt} width={300} height={300} className="max-h-56 w-full rounded-xl object-contain" />
            ) : <Upload aria-hidden="true" className="h-8 w-8 text-muted-foreground" />}
            {photo && <p className="max-w-full truncate text-sm text-muted-foreground">{photo.name}</p>}
            <Button type="button" variant="outline" onClick={() => inputRef.current?.click()} disabled={referencesLocked}>
              <ImagePlus aria-hidden="true" className="h-4 w-4" />{hasDancer ? copy.changePhoto : copy.choosePhoto}
            </Button>
            <input ref={inputRef} id={`${id}-photo`} type="file" accept={DANCE_PHOTO_ACCEPT} className="sr-only" onChange={choosePhoto} disabled={referencesLocked} aria-required="true" aria-describedby={`${id}-photo-hint`} />
            {hasDancer && <button type="button" onClick={removeDancer} disabled={referencesLocked} className="text-xs text-muted-foreground underline underline-offset-4 disabled:opacity-50">{copy.removePhoto}</button>}
          </div>
          <p id={`${id}-photo-hint`} className="text-sm leading-relaxed text-muted-foreground">{copy.photoHint}</p>
        </div>

        <div className="space-y-3">
          <label htmlFor={`${id}-princess`} className="block text-base font-semibold">{copy.princessLabel}</label>
          <div className="flex flex-col items-center gap-4 rounded-2xl border bg-muted/35 p-4 sm:flex-row">
            <img src={princessPreviewUrl ?? uploadedPrincessUrl ?? '/images/references/princess-default-v2.png'} alt={hasCustomPrincess ? copy.princessPreviewAlt : copy.defaultPrincessAlt} width={300} height={300} className="h-28 w-28 shrink-0 rounded-xl object-cover" />
            <div className="min-w-0 space-y-2 text-center sm:text-left">
              <p className="truncate text-sm text-muted-foreground">{princessPhoto?.name ?? (hasCustomPrincess ? copy.princessLabel : copy.defaultPrincessLabel)}</p>
              <Button type="button" variant="outline" onClick={() => princessInputRef.current?.click()} disabled={referencesLocked}>
                <ImagePlus aria-hidden="true" className="h-4 w-4" />{hasCustomPrincess ? copy.changePrincess : copy.choosePrincess}
              </Button>
              <input ref={princessInputRef} id={`${id}-princess`} type="file" accept={DANCE_PHOTO_ACCEPT} className="sr-only" onChange={choosePrincess} disabled={referencesLocked} aria-describedby={`${id}-princess-hint`} />
              {hasCustomPrincess && <button type="button" onClick={restorePrincess} disabled={referencesLocked} className="block w-full text-xs text-muted-foreground underline underline-offset-4 disabled:opacity-50 sm:w-auto">{copy.restorePrincess}</button>}
            </div>
          </div>
          <p id={`${id}-princess-hint`} className="text-sm leading-relaxed text-muted-foreground">{copy.princessHint}</p>
        </div>

        <fieldset className="dance-orientation space-y-2" disabled={referencesLocked}>
          <legend className="mb-2 text-sm font-semibold">{copy.orientation.label}</legend>
          <div className="grid grid-cols-2 gap-2">
            {DANCE_ORIENTATIONS.map((value) => {
              const Icon = value === 'landscape' ? Monitor : Smartphone
              return (
                <label key={value} className="dance-orientation-option relative flex cursor-pointer items-center justify-center gap-2 rounded-xl border bg-background px-3 py-2.5 text-sm transition has-[:checked]:border-primary has-[:checked]:bg-primary/10 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring has-[:disabled]:cursor-default has-[:disabled]:opacity-60">
                  <input type="radio" name={`${id}-orientation`} value={value} checked={orientation === value} onChange={() => setOrientation(value)} className="absolute inset-0 z-10 m-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-default" />
                  <Icon aria-hidden="true" className="h-4 w-4 shrink-0" />
                  <span>{copy.orientation.options[value]}</span>
                </label>
              )
            })}
          </div>
        </fieldset>

        <fieldset className="dance-customization space-y-3" disabled={referencesLocked} aria-labelledby={`${id}-custom-label`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label id={`${id}-custom-label`} htmlFor={`${id}-custom-description`} className="text-sm font-semibold">{copy.customization.label}</label>
            <div className="flex items-center gap-3">
              <span id={`${id}-custom-count`} className="text-xs tabular-nums text-muted-foreground">{customDescription.length}/{DANCE_CUSTOM_DESCRIPTION_LIMIT}</span>
              {(customDescription || quickTags.length > 0) && <button type="button" onClick={() => { setCustomDescription(''); setQuickTags([]) }} className="dance-custom-clear text-xs text-muted-foreground underline underline-offset-4">{copy.customization.clear}</button>}
            </div>
          </div>
          <textarea
            id={`${id}-custom-description`}
            value={customDescription}
            onChange={(event) => setCustomDescription(event.currentTarget.value)}
            maxLength={DANCE_CUSTOM_DESCRIPTION_LIMIT}
            rows={3}
            placeholder={copy.customization.placeholder}
            aria-describedby={`${id}-custom-count`}
            className="w-full resize-y rounded-xl border border-input bg-background p-3 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-60"
          />
          <div className="flex flex-wrap gap-2">
            {copy.customization.tags.filter(tag => DANCE_FIXED_SCENE_QUICK_TAG_IDS.some(allowed => allowed === tag.id)).map((tag) => (
              <button key={tag.id} type="button" aria-pressed={quickTags.includes(tag.id)} onClick={() => setQuickTags((current) => current.includes(tag.id) ? current.filter((value) => value !== tag.id) : [...current, tag.id])} className="dance-quick-tag rounded-full border px-3 py-1.5 text-xs transition disabled:opacity-60">{tag.label}</button>
            ))}
          </div>
        </fieldset>

        <div className="space-y-3">
          <label className="flex items-start gap-2 text-sm leading-relaxed">
            <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.currentTarget.checked)} disabled={referencesLocked} className="mt-1 h-4 w-4 shrink-0 accent-primary" />
            <span>{copy.consentLabel}</span>
          </label>
          <Button ref={generateRef} type="submit" size="lg" className="w-full rounded-xl" disabled={purchaseLoading || isWorking || (!canCheckTask && (!isAvailable || !hasDancer || !consent))}>
            {isWorking ? <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" /> : <Film aria-hidden="true" className="h-4 w-4" />}
            {canCheckTask ? copy.retryStatus : copy.generateButton}
          </Button>
          <p className="dance-refund-guarantee flex items-center justify-center gap-2 rounded-xl border border-emerald-400/40 bg-emerald-400/10 p-3 text-center text-sm font-semibold text-emerald-200" data-testid="dance-refund-guarantee">
            <ShieldCheck aria-hidden="true" className="h-5 w-5 shrink-0" />
            {copy.refundGuarantee}
          </p>
          <div className="dance-media-privacy flex items-start gap-2 rounded-xl border bg-muted/30 p-3 text-sm" data-testid="dance-media-privacy">
            <LockKeyhole aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="space-y-1">
              <p className="font-medium">{copy.mediaPrivacyTitle}</p>
              <p className="text-xs leading-relaxed text-muted-foreground">{copy.mediaPrivacyHint}</p>
            </div>
          </div>
          <p className="text-center text-xs text-muted-foreground">{costHint}</p>
          <p className="text-center text-xs leading-relaxed text-muted-foreground">{copy.progressHint}</p>
          {!isAvailable && <p className="rounded-lg bg-muted p-3 text-sm leading-relaxed text-muted-foreground" role="status">{copy.unavailableHint}</p>}
          {error && !checkoutOpen && !purchaseFailed && <div className="space-y-2 rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive" role="alert">
            <p>{copy.errors[error]}</p>
          </div>}
        </div>
      </form>

      <div className="flex flex-col gap-4 border-t bg-muted/30 p-5 sm:p-8 lg:border-l lg:border-t-0">
        <p className="text-base font-semibold">{copy.resultTitle}</p>
        <div className="relative flex aspect-video w-full shrink-0 items-center justify-center overflow-hidden rounded-2xl border bg-background p-4" aria-busy={isWorking}>
          {result ? (
            <video src={result.videoUrl} poster={result.coverImageUrl} controls playsInline preload="metadata" aria-label={copy.videoLabel} className="absolute inset-0 h-full w-full rounded-2xl object-contain">{copy.videoUnsupported}</video>
          ) : purchaseFailed ? (
            <div className="flex max-w-lg flex-col items-center gap-4 p-2 text-center" role="alert">
              <Film aria-hidden="true" className="h-9 w-9 text-primary" />
              <p className="text-base font-semibold leading-relaxed">{failureReason ? copy.failureReasons[failureReason] : copy.errors.generation}</p>
              <p className="text-sm leading-relaxed text-muted-foreground">{purchase.state === 'refunded' ? copy.errors.refunded : copy.errors.refundPending}</p>
            </div>
          ) : (
            <div className="flex max-w-xs flex-col items-center gap-4 text-center">
              {isWorking ? <LoaderCircle aria-hidden="true" className="h-9 w-9 animate-spin text-primary" /> : <Film aria-hidden="true" className="h-10 w-10 text-muted-foreground/45" />}
              <p className="text-sm leading-relaxed text-muted-foreground">{isWorking ? copy.status[phase] : copy.resultEmpty}</p>
            </div>
          )}
        </div>
        {phase !== 'idle' && !purchaseFailed && <p className="flex items-center gap-2 text-sm text-muted-foreground" role="status" aria-live="polite">
          {phase === 'succeeded' && <CheckCircle2 aria-hidden="true" className="h-4 w-4 text-primary" />}{copy.status[phase]}
        </p>}
        {showLongWait && phase === 'processing' && <p data-testid="dance-long-wait" role="status" className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm leading-relaxed text-muted-foreground">{copy.longWaitHint}</p>}
        <div className="space-y-3">
          <Button type="button" onClick={() => { void download() }} disabled={!result || downloading} className="w-full rounded-xl">
            {downloading ? <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" /> : <Download aria-hidden="true" className="h-4 w-4" />}{downloading ? copy.downloading : copy.downloadButton}
          </Button>
          <p className="text-xs leading-relaxed text-muted-foreground">{copy.downloadHint}</p>
          {phase === 'failed' && !canCheckTask && <Button type="button" variant="outline" onClick={reset} className="w-full rounded-xl"><RotateCcw aria-hidden="true" className="h-4 w-4" />{copy.resetButton}</Button>}
        </div>
      </div>
      {VIDEO_PAYMENT_REQUIRED && <DanceCheckoutDialog copy={copy.checkout} open={checkoutOpen} preparing={isWorking} error={error ? copy.errors[error] : undefined} onOpenChange={closeCheckout} onPay={() => { void pay() }} returnFocus={() => generateRef.current?.focus()} />}
    </div>
  )
}
