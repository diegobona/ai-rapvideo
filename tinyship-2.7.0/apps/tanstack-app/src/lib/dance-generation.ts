import { aiVideoConfig } from '../../../../config/aiVideo'
import type { VideoGenerationResult, VideoProviderName } from '@libs/ai/types'
import { normalizeDanceCustomization, normalizeFixedSceneDanceCustomization, type DanceCustomization } from '@libs/ai/dance-customization'
import { normalizeDanceOrientation } from '@libs/ai/dance-output'
import { DEFAULT_DANCE_ORIENTATION, type DanceOrientation } from '../../../../config/danceOutput'
import { readVideoFailureReason, type VideoFailureReason } from '../../../../config/videoFailure'
import { DANCE_PURCHASE_TIMEOUT_MS } from '../../../../config/danceUi'
import { normalizeRapLyricsDraft } from '@libs/ai/rap-lyrics-draft'

const paidPolling = { ...aiVideoConfig.polling, maxTimeoutMs: DANCE_PURCHASE_TIMEOUT_MS }
export type DanceErrorCode = 'fileType' | 'fileSize' | 'photoRequired' | 'consentRequired' | 'upload' | 'generation' | 'credits' | 'status' | 'timeout' | 'download' | 'invalidResponse' | 'unauthorized' | 'expired' | 'trialUsed' | 'trialProcessing' | 'rateLimited' | 'visitor' | 'checkout' | 'paymentRequired' | 'paymentPending' | 'refundPending' | 'refunded'
export type DancePhase = 'idle' | 'checkout' | 'uploading' | 'submitting' | 'processing' | 'succeeded' | 'failed'

export class DanceGenerationError extends Error {
  constructor(readonly code: DanceErrorCode, readonly terminal = ['expired', 'generation', 'refunded', 'paymentRequired', 'unauthorized'].includes(code)) {
    super(code)
    this.name = 'DanceGenerationError'
  }
}

export const DANCE_PHOTO_ACCEPT = '.jpg,.jpeg,.png,.webp'
const MAX_PHOTO_BYTES = 10 * 1024 * 1024
export const DANCE_DURATION_SECONDS = aiVideoConfig.defaults.duration

export function validateDancePhoto(file: File): 'fileType' | 'fileSize' | null {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || !/\.(jpe?g|png|webp)$/i.test(file.name) || file.size === 0) return 'fileType'
  return file.size > MAX_PHOTO_BYTES ? 'fileSize' : null
}

export function buildDanceRequest(dancerImageUrl: string, princessImageUrl?: string) {
  if (!isHttpUrl(dancerImageUrl) || (princessImageUrl !== undefined && !isHttpUrl(princessImageUrl))) {
    throw new DanceGenerationError('invalidResponse')
  }
  return {
    danceTemplate: 'rumpelstiltskin-v2' as const,
    dancerImageUrl,
    ...(princessImageUrl !== undefined ? { princessImageUrl } : {}),
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

function isHttpUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'https:' || parsed.protocol === 'http:'
  } catch { return false }
}

function readVideoResult(value: unknown): VideoGenerationResult {
  if (!isRecord(value) || typeof value.videoUrl !== 'string'
    || !(isHttpUrl(value.videoUrl) || /^data:video\/[a-z0-9.+-]+;base64,[a-z0-9+/=\s]+$/i.test(value.videoUrl))
    || !['fal', 'volcengine', 'aliyun', 'autodl', 'compshare'].includes(String(value.provider)) || typeof value.model !== 'string') {
    throw new DanceGenerationError('invalidResponse')
  }
  let rapLyrics
  try { if (value.rapLyrics !== undefined) rapLyrics = normalizeRapLyricsDraft(value.rapLyrics) } catch { /* Older videos remain playable without a usable script. */ }
  return {
    videoUrl: value.videoUrl,
    provider: value.provider as VideoProviderName,
    model: value.model,
    ...(typeof value.duration === 'number' ? { duration: value.duration } : {}),
    ...(isHttpUrl(value.coverImageUrl) ? { coverImageUrl: value.coverImageUrl } : {}),
    ...(rapLyrics ? { rapLyrics } : {}),
  }
}

async function readApiData(response: Response, fallback: DanceErrorCode): Promise<Record<string, unknown>> {
  if (response.status === 401) throw new DanceGenerationError('unauthorized')
  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { error?: string } | null
    const codes: Record<string, DanceErrorCode> = { trial_used: 'trialUsed', trial_processing: 'trialProcessing', visitor_required: 'visitor', payment_required: 'paymentRequired', payment_pending: 'paymentPending', refund_pending: 'refundPending', refunded: 'refunded', insufficient_credits: 'credits', not_found: 'expired', checkout_expired: 'expired', invalid_origin: 'unauthorized' }
    const code: DanceErrorCode = codes[payload?.error ?? ''] ?? (response.status === 402 ? 'paymentRequired' : response.status === 403 ? 'unauthorized' : response.status === 404 || response.status === 410 ? 'expired' : response.status === 429 ? 'rateLimited' : fallback)
    // Client errors invalidate this recovery reference unless the response
    // explicitly asks us to wait. Outages must preserve a possible payment.
    const terminal = response.status >= 400 && response.status < 500
      && ![408, 409, 425, 429].includes(response.status) && !['paymentPending', 'refundPending'].includes(code)
    throw new DanceGenerationError(code, terminal)
  }
  let payload: unknown
  try { payload = await response.json() } catch { throw new DanceGenerationError('invalidResponse') }
  if (!isRecord(payload) || payload.success !== true || !isRecord(payload.data)) throw new DanceGenerationError('invalidResponse')
  return payload.data
}

export interface PublicVideoPurchase {
  id: string
  state: 'pending' | 'paid' | 'starting' | 'processing' | 'succeeded' | 'refund_pending' | 'refunded' | 'expired'
  taskId: string | null
  result?: VideoGenerationResult
  error?: string
  refundStatus?: string
  failureReason?: VideoFailureReason
  orientation?: DanceOrientation
  sceneImageUrl?: string
  dancerImageUrl?: string
  princessImageUrl?: string
  customDescription?: string
  quickTags?: ReturnType<typeof normalizeDanceCustomization>['quickTags']
}

function readPurchase(value: unknown, expectedId?: string): PublicVideoPurchase {
  if (!isRecord(value) || typeof value.id !== 'string' || !value.id.trim() || (expectedId !== undefined && value.id !== expectedId)
    || !['pending', 'paid', 'starting', 'processing', 'succeeded', 'refund_pending', 'refunded', 'expired'].includes(String(value.state))
    || !(value.taskId === null || (typeof value.taskId === 'string' && value.taskId.trim()))) {
    throw new DanceGenerationError('invalidResponse')
  }
  const result = value.result === undefined ? undefined : readVideoResult(value.result)
  if (value.sceneImageUrl !== undefined && !isHttpUrl(value.sceneImageUrl)) throw new DanceGenerationError('invalidResponse')
  for (const key of ['dancerImageUrl', 'princessImageUrl'] as const) {
    if (value[key] !== undefined && !isHttpUrl(value[key])) throw new DanceGenerationError('invalidResponse')
  }
  let customization
  try {
    if (value.customDescription !== undefined || value.quickTags !== undefined) customization = normalizeDanceCustomization(value)
  } catch { throw new DanceGenerationError('invalidResponse') }
  if (value.state === 'succeeded' && !result) throw new DanceGenerationError('invalidResponse')
  const failureReason = readVideoFailureReason(value.failureReason)
  return {
    id: value.id, state: value.state as PublicVideoPurchase['state'], taskId: value.taskId as string | null,
    ...(result ? { result } : {}),
    ...(typeof value.error === 'string' ? { error: value.error } : {}),
    ...(typeof value.refundStatus === 'string' ? { refundStatus: value.refundStatus } : {}),
    ...(failureReason ? { failureReason } : {}),
    ...(value.orientation !== undefined ? { orientation: normalizeDanceOrientation(value.orientation) } : {}),
    ...(typeof value.sceneImageUrl === 'string' ? { sceneImageUrl: value.sceneImageUrl } : {}),
    ...(typeof value.dancerImageUrl === 'string' ? { dancerImageUrl: value.dancerImageUrl } : {}),
    ...(typeof value.princessImageUrl === 'string' ? { princessImageUrl: value.princessImageUrl } : {}),
    ...customization,
  }
}

export async function readDancePurchase(signal?: AbortSignal, transport: typeof fetch = fetch): Promise<{ purchase: PublicVideoPurchase | null; storageKey: string; directTaskId?: string }> {
  const data = await readApiData(await transport('/api/video-generate/', { signal, cache: 'no-store' }), 'visitor')
  if (typeof data.storageKey !== 'string' || !data.storageKey.trim()) throw new DanceGenerationError('invalidResponse')
  if (data.directTaskId !== undefined && data.directTaskId !== null && (typeof data.directTaskId !== 'string' || !/^[\w-]{1,128}$/.test(data.directTaskId))) throw new DanceGenerationError('invalidResponse')
  return { purchase: data.purchase === null ? null : readPurchase(data.purchase), storageKey: data.storageKey,
    ...(typeof data.directTaskId === 'string' ? { directTaskId: data.directTaskId } : {}),
  }
}

export async function ensureDanceSession(signal: AbortSignal, transport: typeof fetch = fetch) {
  const sessionResponse = await transport('/api/auth/get-session', { signal, cache: 'no-store' })
  if (!sessionResponse.ok) throw new DanceGenerationError('visitor')
  const session = await sessionResponse.json() as { user?: { id?: string } } | null
  if (session?.user?.id) return
  // Better Auth's installed anonymous plugin issues the protected session cookie.
  const response = await transport('/api/auth/sign-in/anonymous', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}', signal })
  if (!response.ok) {
    const error = await response.json().catch(() => null) as { error?: string } | null
    throw new DanceGenerationError(error?.error === 'trial_used' ? 'trialUsed' : error?.error === 'trial_processing' ? 'trialProcessing' : response.status === 429 ? 'rateLimited' : 'visitor')
  }
}

export async function uploadDancePhoto(file: File, signal: AbortSignal, transport: typeof fetch = fetch): Promise<string> {
  const validationError = validateDancePhoto(file)
  if (validationError) throw new DanceGenerationError(validationError)
  const form = new FormData()
  form.append('file', file)
  form.append('provider', 'r2')
  const response = await transport('/api/upload', { method: 'POST', body: form, signal })
  const data = await readApiData(response, 'upload')
  if (!isHttpUrl(data.url)) throw new DanceGenerationError('invalidResponse')
  return data.url
}

export async function createDanceCheckout(dancerImageUrl: string, princessImageUrl: string | undefined, returnPath: string, signal: AbortSignal, transport: typeof fetch = fetch, customization: DanceCustomization & { orientation?: DanceOrientation; sceneImageUrl?: string } = {}): Promise<{ purchaseId: string; checkoutUrl: string }> {
  // The server owns quantity, price, duration and prompt compilation.
  buildDanceRequest(dancerImageUrl, princessImageUrl)
  const { customDescription, quickTags } = normalizeFixedSceneDanceCustomization(customization)
  const orientation = normalizeDanceOrientation(customization.orientation)
  const response = await transport('/api/video-checkout/', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dancerImageUrl, ...(princessImageUrl ? { princessImageUrl } : {}), returnPath,
      ...(customDescription ? { customDescription } : {}), ...(quickTags.length ? { quickTags } : {}),
      ...(orientation !== DEFAULT_DANCE_ORIENTATION ? { orientation } : {}),
    }), signal,
  })
  const data = await readApiData(response, 'checkout')
  if (typeof data.purchaseId !== 'string' || !data.purchaseId.trim() || typeof data.checkoutUrl !== 'string') throw new DanceGenerationError('invalidResponse')
  let url: URL
  try { url = new URL(data.checkoutUrl) } catch { throw new DanceGenerationError('invalidResponse') }
  if (url.protocol !== 'https:' || url.hostname !== 'checkout.stripe.com' || url.username || url.password) throw new DanceGenerationError('invalidResponse')
  return { purchaseId: data.purchaseId, checkoutUrl: data.checkoutUrl }
}

export async function verifyDanceCheckout(sessionId: string, signal: AbortSignal, transport: typeof fetch = fetch): Promise<PublicVideoPurchase> {
  if (!sessionId.trim()) throw new DanceGenerationError('invalidResponse')
  const data = await readApiData(await transport('/api/video-checkout/verify', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId }), signal,
  }), 'checkout')
  return readPurchase(data.purchase)
}

export async function startDanceGeneration(purchaseId: string, signal: AbortSignal, transport: typeof fetch = fetch): Promise<PublicVideoPurchase> {
  if (!purchaseId.trim()) throw new DanceGenerationError('invalidResponse')
  const response = await transport('/api/video-generate/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ purchaseId }),
    signal,
  })
  const data = await readApiData(response, 'generation')
  return readPurchase(data.purchase, purchaseId)
}

/** Temporary direct access still leaves provider, workflow and scene server-owned. */
export async function startDirectDanceGeneration(dancerImageUrl: string, princessImageUrl: string | undefined, signal: AbortSignal, transport: typeof fetch = fetch, customization: DanceCustomization & { orientation?: DanceOrientation } = {}): Promise<{ taskId: string; status: 'processing' }> {
  const references = buildDanceRequest(dancerImageUrl, princessImageUrl)
  const { customDescription, quickTags } = normalizeFixedSceneDanceCustomization(customization)
  const orientation = normalizeDanceOrientation(customization.orientation)
  const response = await transport('/api/video-generate/', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...references, ...(customDescription ? { customDescription } : {}), ...(quickTags.length ? { quickTags } : {}), orientation }), signal,
  })
  const data = await readApiData(response, 'generation')
  if (typeof data.taskId !== 'string' || !/^[\w-]{1,128}$/.test(data.taskId) || data.status !== 'processing') throw new DanceGenerationError('invalidResponse')
  return { taskId: data.taskId, status: 'processing' }
}

function delay(ms: number, signal: AbortSignal): Promise<void> {
  signal.throwIfAborted()
  return new Promise((resolve, reject) => {
    const onAbort = () => { clearTimeout(timer); reject(signal.reason ?? new DOMException('Aborted', 'AbortError')) }
    const timer = setTimeout(() => { signal.removeEventListener('abort', onAbort); resolve() }, ms)
    signal.addEventListener('abort', onAbort, { once: true })
  })
}

export async function pollDanceTask(taskId: string, signal: AbortSignal, transport: typeof fetch = fetch, polling: { intervalMs: number; maxTimeoutMs: number } = paidPolling): Promise<VideoGenerationResult> {
  signal.throwIfAborted()
  const startedAt = Date.now()
  const pollingController = new AbortController()
  const onAbort = () => pollingController.abort(signal.reason)
  signal.addEventListener('abort', onAbort, { once: true })
  const timeout = setTimeout(() => pollingController.abort(new DanceGenerationError('timeout')), polling.maxTimeoutMs)
  try {
    while (Date.now() - startedAt < polling.maxTimeoutMs) {
      pollingController.signal.throwIfAborted()
      const response = await transport(`/api/video-generate/status?taskId=${encodeURIComponent(taskId)}`, { signal: pollingController.signal, cache: 'no-store' })
      if (response.status === 404) throw new DanceGenerationError('expired')
      const data = await readApiData(response, 'status')
      if (data.status === 'succeeded') return readVideoResult(data.result)
      if (data.status === 'failed') throw new DanceGenerationError('generation')
      if (data.status !== 'processing') throw new DanceGenerationError('invalidResponse')
      await delay(Math.min(polling.intervalMs, Math.max(0, polling.maxTimeoutMs - (Date.now() - startedAt))), pollingController.signal)
    }
    throw new DanceGenerationError('timeout')
  } catch (cause) {
    if (signal.aborted) throw signal.reason
    if (pollingController.signal.aborted && pollingController.signal.reason instanceof DanceGenerationError) throw pollingController.signal.reason
    throw cause
  } finally {
    clearTimeout(timeout)
    signal.removeEventListener('abort', onAbort)
  }
}

export async function pollDancePurchase(purchaseId: string, signal: AbortSignal, transport: typeof fetch = fetch, polling: { intervalMs: number; maxTimeoutMs: number } = paidPolling): Promise<PublicVideoPurchase> {
  signal.throwIfAborted()
  const startedAt = Date.now()
  const controller = new AbortController()
  const onAbort = () => controller.abort(signal.reason)
  signal.addEventListener('abort', onAbort, { once: true })
  const timeout = setTimeout(() => controller.abort(new DanceGenerationError('timeout')), polling.maxTimeoutMs)
  try {
    while (Date.now() - startedAt < polling.maxTimeoutMs) {
      controller.signal.throwIfAborted()
      const response = await transport(`/api/video-generate/status?purchaseId=${encodeURIComponent(purchaseId)}`, { signal: controller.signal, cache: 'no-store' })
      if (response.status === 404) throw new DanceGenerationError('expired')
      const data = await readApiData(response, 'status')
      const purchase = readPurchase(data.purchase, purchaseId)
      if (!['paid', 'starting', 'processing'].includes(purchase.state)) return purchase
      await delay(Math.min(polling.intervalMs, Math.max(0, polling.maxTimeoutMs - (Date.now() - startedAt))), controller.signal)
    }
    throw new DanceGenerationError('timeout')
  } catch (cause) {
    if (signal.aborted) throw signal.reason
    if (controller.signal.aborted && controller.signal.reason instanceof DanceGenerationError) throw controller.signal.reason
    throw cause
  } finally {
    clearTimeout(timeout)
    signal.removeEventListener('abort', onAbort)
  }
}

export async function resumeDancePurchase(purchase: PublicVideoPurchase, signal: AbortSignal, transport: typeof fetch = fetch, polling: { intervalMs: number; maxTimeoutMs: number } = paidPolling): Promise<PublicVideoPurchase> {
  if (purchase.state === 'pending') throw new DanceGenerationError('paymentPending')
  const current = purchase.state === 'paid' ? await startDanceGeneration(purchase.id, signal, transport) : purchase
  return ['paid', 'starting', 'processing'].includes(current.state) ? pollDancePurchase(current.id, signal, transport, polling) : current
}
