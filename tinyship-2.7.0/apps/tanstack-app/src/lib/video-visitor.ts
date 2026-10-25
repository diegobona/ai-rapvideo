import { videoTrialConfig } from '../../../../config/videoTrial'
import { VideoTrialError, takeTrialRateSlot } from '@libs/ai/video-trial'
import { isIP } from 'node:net'

const encoder = new TextEncoder()
const encode = (bytes: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(bytes))).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '')
async function key() {
  const secret = process.env.BETTER_AUTH_SECRET
  if (!secret || secret.length < 32) throw new Error('Visitor signing secret is not configured')
  return crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify'])
}
export async function readVideoVisitor(request: Request): Promise<string | null> {
  const value = request.headers.get('cookie')?.split(';').map(part => part.trim()).find(part => part.startsWith(videoTrialConfig.cookieName + '='))?.slice(videoTrialConfig.cookieName.length + 1)
  if (!value || !/^[\da-f-]{36}\.[\w-]{43}$/.test(value)) return null
  const [id, signature] = value.split('.')
  const bytes = Uint8Array.from(atob(signature.replaceAll('-', '+').replaceAll('_', '/') + '='), ch => ch.charCodeAt(0))
  return await crypto.subtle.verify('HMAC', await key(), bytes, encoder.encode(`video-visitor:${id}`)) ? id : null
}
export async function videoVisitor(request: Request) {
  const existing = await readVideoVisitor(request)
  if (existing) return { id: existing, cookie: null as string | null }
  const id = crypto.randomUUID()
  const signature = encode(await crypto.subtle.sign('HMAC', await key(), encoder.encode(`video-visitor:${id}`)))
  const cookie = `${videoTrialConfig.cookieName}=${id}.${signature}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${videoTrialConfig.cookieMaxAge}${new URL(request.url).protocol === 'https:' ? '; Secure' : ''}`
  return { id, cookie }
}
export function visitorResponse(response: Response, cookie: string | null) {
  const headers = new Headers(response.headers)
  headers.set('Cache-Control', 'private, no-store')
  if (cookie) headers.append('Set-Cookie', cookie)
  return new Response(response.body, { status: response.status, headers })
}
export function sameOriginMutation(request: Request) {
  const origin = request.headers.get('origin')
  const site = request.headers.get('sec-fetch-site')
  return site !== 'cross-site' && (!origin || origin === new URL(request.url).origin)
}
export async function limitTrialIp(request: Request, action: keyof typeof videoTrialConfig.ipLimits) {
  // Use the edge-supplied address only. Never trust X-Forwarded-For or a body IP.
  const ip = (request as Request & { cf?: unknown }).cf ? request.headers.get('cf-connecting-ip') : null
  if (!ip) return // Local Node/preview has no trusted public edge IP.
  const window = Math.floor(Date.now() / (videoTrialConfig.ipWindowSeconds * 1000))
  const hash = encode(await crypto.subtle.sign('HMAC', await key(), encoder.encode(`trial-rate:${window}:${action}:${ip}`)))
  await takeTrialRateSlot(`${action}:${window}:${hash}`, videoTrialConfig.ipLimits[action], new Date((window + 1) * videoTrialConfig.ipWindowSeconds * 1000))
}
/** Stable, non-expiring quota identity. Fail closed without a trusted edge IP. */
export async function previewIpKey(request: Request) {
  const raw = (request as Request & { cf?: unknown }).cf ? request.headers.get('cf-connecting-ip') : null
  if (!raw || !isIP(raw)) throw new VideoTrialError('preview_ip_unavailable', 503)
  const ip = isIP(raw) === 6 ? new URL(`http://[${raw}]/`).hostname.toLowerCase() : raw
  const hash = encode(await crypto.subtle.sign('HMAC', await key(), encoder.encode(`rap-preview-ip-v1:${ip}`)))
  return `preview-v1:ip:${hash}`
}
export const trialErrorResponse = (error: VideoTrialError) => Response.json({ error: error.code }, {
  status: error.status, headers: { 'Cache-Control': 'private, no-store', ...(error.status === 429 ? { 'Retry-After': String(videoTrialConfig.ipWindowSeconds) } : {}) },
})
