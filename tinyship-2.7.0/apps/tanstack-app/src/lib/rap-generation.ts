import { RAP_VIDEO_SCENES, RAP_VIDEO_TEMPLATE, RAP_VIDEO_MAX_TOPIC_LENGTH, type RapVideoSceneId } from '../../../../config/rapVideo'
import { DanceGenerationError } from './dance-generation'
import { normalizeRapLyricsDraft } from '@libs/ai/rap-lyrics-draft'
import type { RapLyricsDraft } from '@libs/ai/rap-lyrics-types'
import type { RapVoiceType } from '../../../../config/rapVoices'

export const RAP_PHOTO_ACCEPT = '.jpg,.jpeg,.png,.webp'
export const RAP_PHOTO_MAX_BYTES = 20 * 1024 * 1024
export const RAP_TOPIC_LIMIT = RAP_VIDEO_MAX_TOPIC_LENGTH
export const RAP_POLLING = { intervalMs: 5_000, maxTimeoutMs: 30 * 60 * 1_000 }
export type RapErrorCode = 'fileType' | 'fileSize' | 'photoRequired' | 'consentRequired' | 'topicTooLong' | 'upload' | 'generation' | 'status' | 'timeout' | 'download' | 'invalidResponse' | 'unauthorized' | 'expired' | 'rateLimited' | 'visitor' | 'trialUsed' | 'trialProcessing' | 'previewIp'
export class RapGenerationError extends Error {
  constructor(readonly code: RapErrorCode, readonly submissionRejected = false) { super(code); this.name = 'RapGenerationError' }
}

/** A previous completed task is not evidence that an uncertain new submission finished. */
export function resolveRapRecoveryTask(serverTask: string | null, tabTask: string | null, previousTask: string | null): string | null {
  return [serverTask, tabTask].find(task => Boolean(task) && task !== previousTask) ?? null
}
export function getRapErrorCode(cause: unknown, fallback: RapErrorCode = 'generation'): RapErrorCode {
  if (cause instanceof RapGenerationError) return cause.code
  if (cause instanceof DanceGenerationError && ['upload', 'generation', 'status', 'timeout', 'download', 'invalidResponse', 'unauthorized', 'expired', 'rateLimited', 'visitor', 'trialUsed', 'trialProcessing'].includes(cause.code)) return cause.code as RapErrorCode
  return fallback
}
export function validateRapPhoto(file: File): 'fileType' | 'fileSize' | null {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || !/\.(jpe?g|png|webp)$/i.test(file.name) || file.size === 0) return 'fileType'
  return file.size > RAP_PHOTO_MAX_BYTES ? 'fileSize' : null
}
function isHttpUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false
  try { return ['https:', 'http:'].includes(new URL(value).protocol) } catch { return false }
}
async function readData(response: Response, fallback: RapErrorCode): Promise<Record<string, unknown>> {
  if (!response.ok) {
    const failure = await response.json().catch(() => null)
    const code = failure?.error === 'trial_used' ? 'trialUsed' : failure?.error === 'trial_processing' ? 'trialProcessing' : failure?.error === 'preview_ip_unavailable' ? 'previewIp' : null
    throw new RapGenerationError(code ?? (response.status === 401 || response.status === 403 ? 'unauthorized' : response.status === 429 ? 'rateLimited' : response.status === 404 || response.status === 410 ? 'expired' : fallback),
      Boolean(code) || (response.status >= 400 && response.status < 500 && ![408, 409].includes(response.status)))
  }
  const payload = await response.json().catch(() => null)
  if (!payload || payload.success !== true || !payload.data || typeof payload.data !== 'object' || Array.isArray(payload.data)) throw new RapGenerationError('invalidResponse')
  return payload.data
}
/** Same owned upload contract as uploadDancePhoto; the rap photo limit is 20 MB. */
export async function uploadRapPhoto(file: File, signal: AbortSignal, transport: typeof fetch = fetch): Promise<string> {
  signal.throwIfAborted()
  const error = validateRapPhoto(file)
  if (error) throw new RapGenerationError(error)
  const form = new FormData()
  form.append('file', file)
  form.append('provider', 'r2')
  const data = await readData(await transport('/api/upload', { method: 'POST', body: form, signal }), 'upload')
  if (!isHttpUrl(data.url)) throw new RapGenerationError('invalidResponse')
  return data.url
}
export interface RapGenerationRequest { personOneImageUrl: string; personTwoImageUrl: string; scene: RapVideoSceneId; topic: string; lyrics: RapLyricsDraft; voices: [RapVoiceType, RapVoiceType] }
export async function startRapGeneration(input: RapGenerationRequest, signal: AbortSignal, transport: typeof fetch = fetch): Promise<{ taskId: string; status: 'processing' }> {
  signal.throwIfAborted()
  if (!isHttpUrl(input.personOneImageUrl) || !isHttpUrl(input.personTwoImageUrl) || input.personOneImageUrl === input.personTwoImageUrl) throw new RapGenerationError('photoRequired')
  if (input.topic.length > RAP_TOPIC_LIMIT) throw new RapGenerationError('topicTooLong')
  if (!RAP_VIDEO_SCENES.some(scene => scene.id === input.scene)) throw new RapGenerationError('invalidResponse')
  const lyrics = normalizeRapLyricsDraft(input.lyrics)
  const data = await readData(await transport('/api/video-generate/', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, signal,
    body: JSON.stringify({ rapTemplate: RAP_VIDEO_TEMPLATE, personOneImageUrl: input.personOneImageUrl, personTwoImageUrl: input.personTwoImageUrl, scene: input.scene, topic: input.topic.trim(), lyrics, voices: input.voices }),
  }), 'generation')
  if (typeof data.taskId !== 'string' || !/^[\w-]{1,128}$/.test(data.taskId) || data.status !== 'processing') throw new RapGenerationError('invalidResponse')
  return { taskId: data.taskId, status: 'processing' }
}
/** Download errors are separate from generation and must never create a task. */
export async function downloadRapVideo(videoUrl: string, signal: AbortSignal, transport: typeof fetch = fetch): Promise<Blob> {
  if (!isHttpUrl(videoUrl)) throw new RapGenerationError('download')
  const response = await transport('/api/video-generate/download', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: videoUrl }), signal })
  if (!response.ok) throw new RapGenerationError('download')
  const blob = await response.blob()
  if (!blob.size || (blob.type && !blob.type.startsWith('video/') && blob.type !== 'application/octet-stream')) throw new RapGenerationError('download')
  return blob
}
