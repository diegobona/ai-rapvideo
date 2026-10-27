import { useEffect, useRef, useState } from 'react'
import { ArrowRight, LoaderCircle, LogOut } from 'lucide-react'
import { toast } from 'sonner'
import { authClientReact } from '@libs/auth/authClient'
import { useAuthCapabilities } from '@/hooks/use-auth-capabilities'
import { authCopy } from '@/lib/auth-copy'
import { SITE_ORIGIN } from '@/lib/site'
import { clearRapDraft, flushRapDraft } from '@/lib/rap-draft-session'
import { forgetRapAccessIntent } from '@/lib/rap-generation-access'

export function GoogleSignin({ variant = 'header', signedInLabel = authCopy.google.viewPack, returnTo, accountOnly = false }: {
  variant?: 'header' | 'preview' | 'dialog'
  signedInLabel?: string
  returnTo?: '#rap-maker' | '#preview-next-step'
  accountOnly?: boolean
}) {
  const { socialProviders } = useAuthCapabilities()
  const { data: session, isPending } = authClientReact.useSession()
  const [busy, setBusy] = useState(false)
  const started = useRef(false)
  const enabled = socialProviders.includes('google')
  const user = session?.user && !session.user.isAnonymous ? session.user : null

  async function signIn(destination: '#rap-maker' | '#preview-next-step' = returnTo ?? (variant === 'preview' ? '#preview-next-step' : '#rap-maker')) {
    if (started.current) return
    if (!enabled) { toast.error(authCopy.google.unavailable); return }
    started.current = true
    setBusy(true)
    try { await flushRapDraft() }
    catch { started.current = false; setBusy(false); toast.error(authCopy.draftFailed); return }
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname)
    if (!local && window.location.origin !== SITE_ORIGIN) {
      // OAuth state and callback cookies must use the same host, including when
      // a visitor starts on www or the Workers preview address.
      window.location.assign(`${SITE_ORIGIN}/?signin=google${destination === '#preview-next-step' ? '&continue=preview' : ''}`)
      return
    }
    try {
      const { data, error } = await authClientReact.signIn.social({
        provider: 'google', disableRedirect: true,
        callbackURL: `${window.location.origin}/${destination}`,
        newUserCallbackURL: `${window.location.origin}/${destination}`,
        errorCallbackURL: `${window.location.origin}/?authError=google${destination}`,
      })
      if (error || !data?.url) throw new Error('google_signin_failed')
      const target = new URL(data.url)
      if (target.protocol !== 'https:' || target.hostname !== 'accounts.google.com') throw new Error('invalid_oauth_redirect')
      window.location.assign(target.href)
    } catch {
      started.current = false
      setBusy(false)
      toast.error(authCopy.google.failed)
    }
  }

  useEffect(() => {
    // Only the header handles page-level OAuth parameters. The result card may
    // mount later while restoring a preview and must not start another sign-in.
    if (variant !== 'header' || isPending) return
    const url = new URL(window.location.href)
    if (url.searchParams.has('authError')) {
      url.searchParams.delete('authError')
      history.replaceState(history.state, '', url.href)
      toast.error(authCopy.google.failed)
    }
    if (url.searchParams.get('signin') === 'google') {
      const returnTo = url.searchParams.get('continue') === 'preview' ? '#preview-next-step' : '#rap-maker'
      url.searchParams.delete('signin')
      url.searchParams.delete('continue')
      history.replaceState(history.state, '', url.href)
      if (!user) void signIn(returnTo)
    }
  }, [isPending, enabled, variant])

  async function signOut() {
    if (busy) return
    setBusy(true)
    try {
      const { error } = await authClientReact.signOut()
      if (error) throw new Error('signout_failed')
      forgetRapAccessIntent()
      await clearRapDraft().catch(() => {})
      window.location.assign('/')
    } catch { toast.error(authCopy.requestFailed); setBusy(false) }
  }

  if (user && variant === 'preview') return <a className="site-google-signin" href="/#pricing">
    {signedInLabel}<ArrowRight size={16} aria-hidden="true" />
  </a>

  if (user) return <div className="site-account">
    <span className="site-account-name" title={user.name || authCopy.google.account}>{user.name || authCopy.google.account}</span>
    <button type="button" className="site-google-signin" onClick={() => { void signOut() }} disabled={busy}>
      {busy ? <LoaderCircle size={15} className="animate-spin" aria-hidden="true" /> : <LogOut size={15} aria-hidden="true" />}
      {busy ? authCopy.signingOut : authCopy.signOut}
    </button>
  </div>

  // The header keeps OAuth-return handling and the signed-in account controls;
  // guests enter both sign-in methods through the shared dialog.
  if (accountOnly) return null

  return <button type="button" className="site-google-signin" onClick={() => { void signIn() }} disabled={busy || isPending || !enabled} title={!enabled ? authCopy.google.unavailable : undefined}>
    {busy ? <LoaderCircle size={16} className="animate-spin" aria-hidden="true" /> : <GoogleMark />}
    {busy ? authCopy.google.loading : authCopy.google.continue}
  </button>
}

function GoogleMark() {
  return <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true">
    <path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.38a4.6 4.6 0 0 1-2 3.02v2.51h3.24c1.89-1.74 2.98-4.31 2.98-7.36Z" />
    <path fill="#34A853" d="M12 22c2.7 0 4.96-.9 6.62-2.41l-3.24-2.51c-.9.6-2.04.96-3.38.96-2.6 0-4.81-1.76-5.6-4.13H3.05v2.59A10 10 0 0 0 12 22Z" />
    <path fill="#FBBC05" d="M6.4 13.91a6 6 0 0 1 0-3.82V7.5H3.05a10 10 0 0 0 0 9l3.35-2.59Z" />
    <path fill="#EA4335" d="M12 5.96c1.47 0 2.79.51 3.82 1.51l2.86-2.86A9.57 9.57 0 0 0 12 2a10 10 0 0 0-8.95 5.5l3.35 2.59C7.19 7.72 9.4 5.96 12 5.96Z" />
  </svg>
}
