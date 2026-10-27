import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { authClientReact } from '@libs/auth/authClient'
import { createRapCreditCheckout, RapCreditError, readRapCredits, verifyRapCredits, type RapCreditErrorCode, type RapCreditStatus } from '@/lib/rap-credit-client'
import { copyRapDraftSession, flushRapDraft } from '@/lib/rap-draft-session'

type CreditContext = RapCreditStatus & {
  loading: boolean; checking: boolean; checkoutBusy: boolean; verifying: boolean
  notice: 'paid' | 'cancelled' | null; error: RapCreditErrorCode | null; signedIn: boolean
  paidOrderId: string | null
  refresh: () => Promise<void>; checkout: () => Promise<void>
}
type CheckoutTracking = { orderId?: string; sessionId?: string }
const Context = createContext<CreditContext | null>(null)
const sessionPattern = /^cs_[A-Za-z0-9_]{8,256}$/
const checkoutKey = (accountId: string) => `rap-credit-checkout:v1:${accountId}`
const changeKey = (accountId: string) => `rap-credit-change:v1:${accountId}`

function readCheckout(accountId: string): CheckoutTracking | null {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(checkoutKey(accountId)) || 'null')
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null
    const record = value as Record<string, unknown>
    const orderId = typeof record.orderId === 'string' && /^[\w-]{1,128}$/.test(record.orderId) ? record.orderId : undefined
    const sessionId = typeof record.sessionId === 'string' && sessionPattern.test(record.sessionId) ? record.sessionId : undefined
    return orderId || sessionId ? { orderId, sessionId } : null
  } catch { return null }
}
function saveCheckout(accountId: string, value: CheckoutTracking) {
  try { localStorage.setItem(checkoutKey(accountId), JSON.stringify(value)) } catch { /* Focus reconciliation still works if storage is unavailable. */ }
}
function sameCheckout(left: CheckoutTracking | null, right: CheckoutTracking | null) {
  if (!left || !right) return false
  if (left.orderId && right.orderId) return left.orderId === right.orderId
  return Boolean(left.sessionId && left.sessionId === right.sessionId)
}

/** The single owner of checkout-return verification and balance polling. */
export function RapCreditsProvider({ children, initialEnabled = false }: { children: ReactNode; initialEnabled?: boolean }) {
  const { data: session, isPending } = authClientReact.useSession()
  const signedIn = Boolean(session?.user && !session.user.isAnonymous)
  const userId = signedIn ? session?.user.id ?? null : null
  const [status, setStatus] = useState<RapCreditStatus>({ enabled: initialEnabled, credits: 0 })
  const [loading, setLoading] = useState(true)
  const [checking, setChecking] = useState(false)
  const [checkoutBusy, setCheckoutBusy] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [awaitingCheckout, setAwaitingCheckout] = useState(false)
  const [notice, setNotice] = useState<CreditContext['notice']>(null)
  const [error, setError] = useState<RapCreditErrorCode | null>(null)
  const [paidOrderId, setPaidOrderId] = useState<string | null>(null)
  const alive = useRef(false)
  const epoch = useRef(0)
  const request = useRef<Promise<void> | null>(null)
  const checkoutLock = useRef<symbol | null>(null)
  const returnHandled = useRef(false)
  const returnSession = useRef<string | null>(null)
  const pendingCheckout = useRef<CheckoutTracking | null>(null)
  const lastPaidOrder = useRef<string | null>(null)
  const controller = useRef<AbortController | null>(null)
  const account = useRef<string | null>(null)

  const refresh = useCallback(async () => {
    if (request.current) return request.current
    if (!alive.current || !controller.current || controller.current.signal.aborted) return
    const signal = controller.current.signal
    const requestEpoch = epoch.current
    const accountId = account.current
    const tracked = accountId ? pendingCheckout.current : null
    const current = () => alive.current && !signal.aborted && epoch.current === requestEpoch && account.current === accountId
    setChecking(true); setVerifying(Boolean(tracked?.sessionId))
    const work = (async () => {
      try {
        // A return URL or another tab only asks us to check. The server verifies
        // the session belongs to this account and reconciles the Stripe payment.
        const next = tracked?.sessionId ? await verifyRapCredits(tracked.sessionId, signal) : await readRapCredits(signal)
        if (!current()) return
        setStatus(next); setError(null)
        const order = next.order
        if (accountId && tracked && sameCheckout(pendingCheckout.current, tracked)) {
          const matches = order && (tracked.orderId ? order.id === tracked.orderId : Boolean(tracked.sessionId))
          if (matches && order.state === 'available') {
            setNotice('paid'); setPaidOrderId(order.id)
            pendingCheckout.current = null; setAwaitingCheckout(false)
            // Keep the session as a reload hint; stored data never proves payment.
            const saved = readCheckout(accountId)
            if (!saved || sameCheckout(saved, tracked)) saveCheckout(accountId, { ...tracked, orderId: order.id })
            if (lastPaidOrder.current !== order.id) {
              lastPaidOrder.current = order.id
              try { localStorage.setItem(changeKey(accountId), `${order.id}:${Date.now()}`) } catch { /* Focus also refreshes the original tab. */ }
            }
          } else if (matches && order.state !== 'pending') {
            pendingCheckout.current = null; setAwaitingCheckout(false)
            try {
              if (sameCheckout(readCheckout(accountId), tracked)) localStorage.removeItem(checkoutKey(accountId))
            } catch { /* Storage is only a recovery hint. */ }
          }
        } else if (accountId && !pendingCheckout.current && order?.state === 'pending') {
          pendingCheckout.current = { orderId: order.id }
          saveCheckout(accountId, pendingCheckout.current); setAwaitingCheckout(true)
        }
      } catch (cause) {
        if (current()) setError(cause instanceof RapCreditError ? cause.code : 'network')
      } finally {
        if (current()) { setLoading(false); setChecking(false); setVerifying(false) }
      }
    })()
    request.current = work
    try { await work } finally { if (request.current === work) request.current = null }
  }, [])

  useEffect(() => {
    alive.current = true
    return () => { alive.current = false; epoch.current += 1; controller.current?.abort() }
  }, [])

  useEffect(() => {
    if (isPending) return
    controller.current?.abort()
    controller.current = new AbortController()
    epoch.current += 1
    account.current = userId
    request.current = null; checkoutLock.current = null; lastPaidOrder.current = null
    setVerifying(false); setChecking(false); setCheckoutBusy(false); setError(null); setNotice(null); setPaidOrderId(null)
    pendingCheckout.current = userId ? readCheckout(userId) : null
    const url = new URL(window.location.href)
    if (!returnHandled.current) {
      returnHandled.current = true
      const sessionId = url.searchParams.get('rap_checkout_session_id')
      const cancelled = url.searchParams.get('rap_checkout') === 'cancelled'
      if (sessionId || cancelled) {
        url.searchParams.delete('rap_checkout_session_id'); url.searchParams.delete('rap_checkout')
        history.replaceState(history.state, '', url.href)
        if (sessionId) returnSession.current = sessionId
        else setNotice('cancelled')
      }
    }
    if (userId && returnSession.current) {
      const sessionId = returnSession.current
      const saved = pendingCheckout.current
      pendingCheckout.current = { sessionId, ...(saved?.sessionId === sessionId && saved.orderId ? { orderId: saved.orderId } : {}) }
      saveCheckout(userId, pendingCheckout.current)
      returnSession.current = null
    }
    setAwaitingCheckout(Boolean(pendingCheckout.current))
    setStatus({ enabled: initialEnabled, credits: 0 }); setLoading(true)
    void refresh()
  }, [isPending, userId, refresh, initialEnabled])

  useEffect(() => {
    const reconcile = () => { void refresh() }
    const focus = () => { if (document.visibilityState === 'visible') reconcile() }
    const storage = (event: StorageEvent) => {
      const accountId = account.current
      if (!accountId || (event.key !== checkoutKey(accountId) && event.key !== changeKey(accountId))) return
      const saved = readCheckout(accountId)
      if (saved) { pendingCheckout.current = saved; setAwaitingCheckout(true) }
      // Storage events are untrusted wake-up signals, never payment receipts.
      reconcile()
    }
    window.addEventListener('rap-account-changed', reconcile)
    window.addEventListener('rap-credits-changed', reconcile)
    window.addEventListener('focus', focus)
    window.addEventListener('storage', storage)
    document.addEventListener('visibilitychange', focus)
    return () => {
      window.removeEventListener('rap-account-changed', reconcile); window.removeEventListener('rap-credits-changed', reconcile)
      window.removeEventListener('focus', focus); window.removeEventListener('storage', storage)
      document.removeEventListener('visibilitychange', focus)
    }
  }, [refresh])

  useEffect(() => {
    if (!signedIn || (!awaitingCheckout && !['pending', 'starting', 'processing', 'refund_pending'].includes(status.order?.state ?? ''))) return
    const timer = setInterval(() => { if (document.visibilityState !== 'hidden') void refresh() }, 8_000)
    return () => clearInterval(timer)
  }, [signedIn, awaitingCheckout, status.order?.state, refresh])

  const checkout = useCallback(async () => {
    if (checkoutLock.current) return
    if (!signedIn || !userId || account.current !== userId) { setError('signin'); return }
    if (!status.enabled) { setError('unavailable'); return }
    const token = Symbol('checkout')
    checkoutLock.current = token
    const accountId = userId
    const requestEpoch = epoch.current
    const signal = controller.current?.signal
    const current = () => alive.current && !signal?.aborted && epoch.current === requestEpoch && account.current === accountId
    let popup: Window | null = null
    let navigated = false
    setCheckoutBusy(true); setError(null); setNotice(null)
    try {
      // Reserve the tab synchronously while the click still has user activation.
      // Sever its opener before navigating it to the external payment page.
      try { popup = window.open('about:blank', '_blank'); if (popup) popup.opener = null } catch { throw new RapCreditError('popup') }
      if (!popup || popup.closed) throw new RapCreditError('popup')
      try { await flushRapDraft(); copyRapDraftSession(popup) } catch { throw new RapCreditError('draft') }
      if (!current()) return
      if (popup.closed) throw new RapCreditError('popup')
      // The server alone supplies the order, amount, quantity and account.
      const result = await createRapCreditCheckout(signal)
      if (!current()) return
      const target = new URL(result.url)
      if (target.protocol !== 'https:' || target.hostname !== 'checkout.stripe.com' || target.username || target.password || target.port) throw new RapCreditError('invalid')
      if (popup.closed) throw new RapCreditError('popup')
      const sessionId = target.pathname.split('/').find(part => sessionPattern.test(part))
      pendingCheckout.current = { orderId: result.orderId, ...(sessionId ? { sessionId } : {}) }
      saveCheckout(accountId, pendingCheckout.current)
      setAwaitingCheckout(true)
      popup.location.replace(target.href)
      navigated = true
      void refresh()
    } catch (cause) {
      if (current()) setError(cause instanceof RapCreditError ? cause.code : 'checkout')
    } finally {
      if (!navigated) { try { popup?.close() } catch { /* A closed or blocked tab needs no cleanup. */ } }
      if (checkoutLock.current === token) {
        checkoutLock.current = null
        if (current()) setCheckoutBusy(false)
      }
    }
  }, [signedIn, userId, status.enabled, refresh])

  return <Context.Provider value={{ ...status, loading, checking, checkoutBusy, verifying, error, notice, signedIn, paidOrderId, refresh, checkout }}>{children}</Context.Provider>
}

export function useRapCredits() {
  const value = useContext(Context)
  if (!value) throw new Error('RapCreditsProvider is required')
  return value
}
