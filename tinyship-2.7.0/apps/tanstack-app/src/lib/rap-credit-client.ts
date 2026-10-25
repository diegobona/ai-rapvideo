import type { VideoGenerationResult } from '@libs/ai/types'
import { readVideoResult } from './dance-generation'

export interface RapCreditOrder {
  id: string
  state: 'pending' | 'available' | 'starting' | 'processing' | 'succeeded' | 'refund_pending' | 'refunded' | 'expired'
  taskId?: string
  refundStatus?: string
  result?: VideoGenerationResult
}
export interface RapCreditStatus { enabled: boolean; credits: number; order?: RapCreditOrder }
export type RapCreditErrorCode = 'unavailable' | 'signin' | 'network' | 'checkout' | 'invalid' | 'credits'
export class RapCreditError extends Error {
  constructor(readonly code: RapCreditErrorCode) { super(code); this.name = 'RapCreditError' }
}
function record(value: unknown): value is Record<string, unknown> { return Boolean(value && typeof value === 'object' && !Array.isArray(value)) }
export function readRapCreditOrder(value: unknown): RapCreditOrder | undefined {
  if (value === undefined || value === null) return undefined
  if (!record(value) || typeof value.id !== 'string' || !value.id || !['pending', 'available', 'starting', 'processing', 'succeeded', 'refund_pending', 'refunded', 'expired'].includes(String(value.state))
    || (value.taskId !== undefined && value.taskId !== null && (typeof value.taskId !== 'string' || !/^[\w-]{1,128}$/.test(value.taskId)))) throw new RapCreditError('invalid')
  return { id: value.id, state: value.state as RapCreditOrder['state'], ...(typeof value.taskId === 'string' ? { taskId: value.taskId } : {}),
    ...(typeof value.refundStatus === 'string' ? { refundStatus: value.refundStatus } : {}), ...(value.result ? { result: readVideoResult(value.result) } : {}) }
}
function readStatus(value: Record<string, unknown>): RapCreditStatus {
  if (typeof value.enabled !== 'boolean' || typeof value.credits !== 'number' || !Number.isSafeInteger(value.credits) || value.credits < 0) throw new RapCreditError('invalid')
  return { enabled: value.enabled, credits: value.credits, order: readRapCreditOrder(value.order) }
}
async function data(response: Response, fallback: RapCreditErrorCode): Promise<Record<string, unknown>> {
  const payload: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    const code = record(payload) ? payload.error : undefined
    throw new RapCreditError(response.status === 401 || code === 'authentication_required' ? 'signin' : code === 'payments_disabled' || response.status === 503 ? 'unavailable' : code === 'insufficient_credits' ? 'credits' : fallback)
  }
  if (!record(payload) || payload.success !== true || !record(payload.data)) throw new RapCreditError('invalid')
  return payload.data
}
export async function readRapCredits(signal?: AbortSignal): Promise<RapCreditStatus> {
  return readStatus(await data(await fetch('/api/rap-credits', { signal, cache: 'no-store' }), 'network'))
}
export async function verifyRapCredits(sessionId: string, signal?: AbortSignal): Promise<RapCreditStatus> {
  if (!/^cs_[A-Za-z0-9_]{8,256}$/.test(sessionId)) throw new RapCreditError('invalid')
  return readStatus(await data(await fetch('/api/rap-credits/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId }), signal }), 'invalid'))
}
export async function createRapCreditCheckout(signal?: AbortSignal): Promise<string> {
  const result = await data(await fetch('/api/rap-credits/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}', signal }), 'checkout')
  if (typeof result.orderId !== 'string' || !result.orderId || typeof result.checkoutUrl !== 'string') throw new RapCreditError('invalid')
  let url: URL
  try { url = new URL(result.checkoutUrl) } catch { throw new RapCreditError('invalid') }
  if (url.protocol !== 'https:' || url.hostname !== 'checkout.stripe.com' || url.username || url.password || url.port) throw new RapCreditError('invalid')
  return url.href
}
