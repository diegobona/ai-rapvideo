import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { authClientReact } from '@libs/auth/authClient'
import { createRapCreditCheckout, RapCreditError, readRapCredits, verifyRapCredits, type RapCreditErrorCode, type RapCreditStatus } from '@/lib/rap-credit-client'

type CreditContext = RapCreditStatus & {
  loading: boolean; checking: boolean; checkoutBusy: boolean; verifying: boolean
  notice: 'paid' | 'cancelled' | null; error: RapCreditErrorCode | null; signedIn: boolean
  refresh: () => Promise<void>; checkout: () => Promise<void>
}
const Context = createContext<CreditContext | null>(null)

/** The single owner of checkout-return verification and balance polling. */
export function RapCreditsProvider({ children, initialEnabled = false }: { children: ReactNode; initialEnabled?: boolean }) {
  const { data: session, isPending } = authClientReact.useSession()
  const signedIn = Boolean(session?.user && !session.user.isAnonymous)
  const [status, setStatus] = useState<RapCreditStatus>({ enabled: initialEnabled, credits: 0 })
  const [loading, setLoading] = useState(true)
  const [checking, setChecking] = useState(false)
  const [checkoutBusy, setCheckoutBusy] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [notice, setNotice] = useState<CreditContext['notice']>(null)
  const [error, setError] = useState<RapCreditErrorCode | null>(null)
  const alive = useRef(false)
  const request = useRef<Promise<void> | null>(null)
  const checkoutLock = useRef(false)
  const returnHandled = useRef(false)
  const unresolvedSession = useRef<string | null>(null)
  const verifyLock = useRef(false)
  const controller = useRef<AbortController | null>(null)
  const account = useRef<string | null>(null)

  const refresh = useCallback(async () => {
    if (request.current) return request.current
    setChecking(true)
    const signal = controller.current?.signal
    const work = (async () => {
      try {
        const next = await readRapCredits(signal)
        if (alive.current && !signal?.aborted) { setStatus(next); setError(null) }
      } catch (cause) {
        if (alive.current && !signal?.aborted) setError(cause instanceof RapCreditError ? cause.code : 'network')
      } finally { if (alive.current && !signal?.aborted) { setLoading(false); setChecking(false) } }
    })()
    request.current = work
    try { await work } finally { if (request.current === work) request.current = null }
  }, [])

  const verify = useCallback(async () => {
    if (!unresolvedSession.current || verifyLock.current) return
    verifyLock.current = true
    setVerifying(true); setError(null)
    const signal = controller.current?.signal
    try {
      const next = await verifyRapCredits(unresolvedSession.current, signal)
      if (!alive.current || signal?.aborted) return
      setStatus(next)
      if (next.order?.state === 'available' || next.credits > 0) { setNotice('paid'); unresolvedSession.current = null }
      else if (next.order && !['pending'].includes(next.order.state)) unresolvedSession.current = null
    } catch (cause) {
      if (alive.current && !signal?.aborted) setError(cause instanceof RapCreditError ? cause.code : 'network')
    } finally { if (!signal?.aborted) { verifyLock.current = false; if (alive.current) { setLoading(false); setVerifying(false) } } }
  }, [])

  useEffect(() => {
    alive.current = true
    controller.current = new AbortController()
    return () => { alive.current = false; controller.current?.abort() }
  }, [])

  useEffect(() => {
    if (isPending) return
    const accountKey = `${session?.user?.id ?? 'guest'}:${signedIn}`
    if (account.current !== accountKey || controller.current?.signal.aborted) {
      controller.current?.abort()
      controller.current = new AbortController()
      request.current = null
      verifyLock.current = false
      setVerifying(false); setChecking(false); setError(null)
      account.current = accountKey
    }
    const url = new URL(window.location.href)
    if (!returnHandled.current) {
      returnHandled.current = true
      const sessionId = url.searchParams.get('rap_checkout_session_id')
      const cancelled = url.searchParams.get('rap_checkout') === 'cancelled'
      if (sessionId || cancelled) {
        url.searchParams.delete('rap_checkout_session_id'); url.searchParams.delete('rap_checkout')
        history.replaceState(history.state, '', url.href)
        if (sessionId) unresolvedSession.current = sessionId
        else setNotice('cancelled')
      }
    }
    setStatus({ enabled: initialEnabled, credits: 0 }); setLoading(true)
    if (signedIn && unresolvedSession.current) void verify()
    else void refresh()
  }, [isPending, session?.user?.id, signedIn, refresh, verify, initialEnabled])

  useEffect(() => {
    const reconcile = () => { if (signedIn && unresolvedSession.current) void verify(); else void refresh() }
    const focus = () => { if (document.visibilityState === 'visible') reconcile() }
    window.addEventListener('rap-account-changed', reconcile)
    window.addEventListener('rap-credits-changed', reconcile)
    document.addEventListener('visibilitychange', focus)
    return () => { window.removeEventListener('rap-account-changed', reconcile); window.removeEventListener('rap-credits-changed', reconcile); document.removeEventListener('visibilitychange', focus) }
  }, [refresh, verify, signedIn])

  useEffect(() => {
    if (!signedIn || !['pending', 'starting', 'processing', 'refund_pending'].includes(status.order?.state ?? '')) return
    const timer = setInterval(() => { if (document.visibilityState !== 'hidden') { if (unresolvedSession.current) void verify(); else void refresh() } }, 8_000)
    return () => clearInterval(timer)
  }, [signedIn, status.order?.state, refresh, verify])

  const checkout = useCallback(async () => {
    if (checkoutLock.current) return
    if (!signedIn) { setError('signin'); return }
    if (!status.enabled) { setError('unavailable'); return }
    checkoutLock.current = true
    setCheckoutBusy(true); setError(null); setNotice(null)
    try {
      // Stripe only receives an order created by the server. The browser never
      // supplies amounts, quantity, credit balance or a user ID.
      const target = await createRapCreditCheckout(controller.current?.signal)
      window.location.assign(target)
    } catch (cause) {
      if (alive.current) setError(cause instanceof RapCreditError ? cause.code : 'checkout')
      checkoutLock.current = false
      if (alive.current) setCheckoutBusy(false)
    }
  }, [signedIn, status.enabled])

  const check = useCallback(async () => { if (signedIn && unresolvedSession.current) await verify(); else await refresh() }, [signedIn, verify, refresh])
  return <Context.Provider value={{ ...status, loading, checking, checkoutBusy, verifying, error, notice, signedIn, refresh: check, checkout }}>{children}</Context.Provider>
}

export function useRapCredits() {
  const value = useContext(Context)
  if (!value) throw new Error('RapCreditsProvider is required')
  return value
}
