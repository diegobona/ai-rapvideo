import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { Eye, EyeOff, LoaderCircle, UserRound, X } from 'lucide-react'
import { toast } from 'sonner'
import { authClientReact } from '@libs/auth/authClient'
import { config } from '@config'
import { authCopy } from '@/lib/auth-copy'
import { useAuthCapabilities } from '@/hooks/use-auth-capabilities'
import { SITE_ORIGIN } from '@/lib/site'
import { forgetRapAccessIntent } from '@/lib/rap-generation-access'
import { GoogleSignin } from './google-signin'
import './email-auth.css'

type Mode = 'signin' | 'signup' | 'forgot' | 'reset'

function errorMessage(error: { code?: string; status?: number }) {
  const copy = authCopy.email
  if (error.status === 429 || error.code === 'TOO_MANY_REQUESTS') return copy.rateLimited
  if (error.code === 'INVALID_EMAIL_OR_PASSWORD' || error.code === 'INVALID_PASSWORD') return copy.invalidCredentials
  if (error.code?.startsWith('USER_ALREADY_EXISTS')) return copy.alreadyExists
  if (error.code === 'EMAIL_NOT_VERIFIED') return copy.verify
  if (error.code === 'INVALID_TOKEN') return copy.resetInvalid
  if (['INVALID_EMAIL', 'PASSWORD_TOO_SHORT', 'PASSWORD_TOO_LONG', 'VALIDATION_ERROR'].includes(error.code ?? '')) return copy.invalidInput
  return copy.failed
}

export function EmailAuthDialog({ variant = 'header' }: { variant?: 'header' | 'preview' }) {
  const copy = authCopy.email
  const { socialProviders, passwordResetEnabled } = useAuthCapabilities()
  const { data: session, isPending } = authClientReact.useSession()
  const id = useId()
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [returnTo, setReturnTo] = useState<'#rap-maker' | '#preview-next-step'>(variant === 'preview' ? '#preview-next-step' : '#rap-maker')
  const resetToken = useRef<string | null>(null)
  const submitting = useRef(false)
  const emailInput = useRef<HTMLInputElement>(null)
  const passwordInput = useRef<HTMLInputElement>(null)
  const user = session?.user && !session.user.isAnonymous ? session.user : null

  function changeMode(next: Mode) {
    setMode(next); setError(''); setNotice(''); setPassword(''); setShowPassword(false)
  }
  function changeOpen(next: boolean) {
    if (busy) return
    if (next && !['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname) && window.location.origin !== SITE_ORIGIN) {
      window.location.assign(`${SITE_ORIGIN}/?signin=email${variant === 'preview' ? '&continue=preview#preview-next-step' : '#rap-maker'}`)
      return
    }
    setOpen(next)
    if (!next) { setPassword(''); setError(''); setNotice(''); setShowPassword(false); resetToken.current = null; forgetRapAccessIntent(); window.dispatchEvent(new Event('rap-auth-dismissed')) }
    else changeMode('signin')
  }

  useEffect(() => {
    if (variant !== 'header') return
    const requestSignIn = () => { if (!user && !busy) { setReturnTo('#rap-maker'); changeOpen(true) } }
    window.addEventListener('rap-auth-required', requestSignIn)
    return () => window.removeEventListener('rap-auth-required', requestSignIn)
  }, [variant, user?.id, busy])

  useEffect(() => {
    // Only the persistent header dialog consumes recovery URLs. Remove the
    // bearer token from the address bar immediately and keep it in memory.
    if (variant !== 'header') return
    const url = new URL(window.location.href)
    if (url.searchParams.get('signin') === 'email') {
      setReturnTo(url.searchParams.get('continue') === 'preview' ? '#preview-next-step' : '#rap-maker')
      url.searchParams.delete('signin'); url.searchParams.delete('continue')
      history.replaceState(history.state, '', url.href)
      setOpen(true)
      return
    }
    if (url.searchParams.get('auth') !== 'reset') return
    const token = url.searchParams.get('token')
    url.searchParams.delete('auth'); url.searchParams.delete('token'); url.searchParams.delete('error')
    history.replaceState(history.state, '', url.href)
    resetToken.current = token && /^[\w-]{16,256}$/.test(token) ? token : null
    setMode(resetToken.current ? 'reset' : 'forgot')
    setError(resetToken.current ? '' : copy.resetInvalid)
    setOpen(true)
  }, [variant])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting.current) return
    submitting.current = true
    setBusy(true); setError(''); setNotice('')
    try {
      if (mode === 'forgot') {
        const response = await authClientReact.requestPasswordReset({ email: email.trim(), redirectTo: `${window.location.origin}/?auth=reset#rap-maker` })
        if (response.error) { setError(errorMessage(response.error)); return }
        setNotice(authCopy.resetSent)
        return
      }
      if (mode === 'reset') {
        if (!resetToken.current) { setError(copy.resetInvalid); return }
        const response = await authClientReact.resetPassword({ newPassword: password, token: resetToken.current })
        if (response.error) { setError(errorMessage(response.error)); return }
        resetToken.current = null
        changeMode('signin'); setNotice(copy.resetSuccess)
        return
      }
      const response = mode === 'signup'
        ? await authClientReact.signUp.email({ name: name.trim(), email: email.trim(), password })
        : await authClientReact.signIn.email({ email: email.trim(), password, rememberMe: true })
      if (response.error) { setError(errorMessage(response.error)); return }
      if (mode === 'signup' && config.auth.requireEmailVerification) { setNotice(copy.verify); setPassword(''); return }
      setPassword(''); setOpen(false)
      await authClientReact.getSession({ query: { disableCookieCache: true } })
      toast.success(copy.success)
      // Reconcile task ownership after the anonymous-account link without
      // unmounting the maker or discarding the user's selected photos.
      window.dispatchEvent(new Event('rap-account-changed'))
    } catch { setError(authCopy.requestFailed) }
    finally { submitting.current = false; setBusy(false) }
  }

  return <Dialog.Root open={open} onOpenChange={changeOpen}>
    {!user && <Dialog.Trigger asChild><button type="button" className={'site-email-signin' + (variant === 'preview' ? ' is-preview' : '')} disabled={isPending}>
      <UserRound size={15} aria-hidden="true" />{copy.trigger}
    </button></Dialog.Trigger>}
    <Dialog.Portal>
      <Dialog.Overlay className="email-auth-overlay" />
      <Dialog.Content className="email-auth-dialog" aria-busy={busy} onOpenAutoFocus={event => { event.preventDefault(); (mode === 'reset' ? passwordInput : emailInput).current?.focus() }}
        onEscapeKeyDown={event => { if (busy) event.preventDefault() }} onPointerDownOutside={event => { if (busy) event.preventDefault() }}>
        <Dialog.Close className="email-auth-close" aria-label={copy.close} disabled={busy}><X size={19} aria-hidden="true" /></Dialog.Close>
        <Dialog.Title>{mode === 'signup' ? copy.signupTitle : mode === 'signin' ? copy.signinTitle : copy.forgotTitle}</Dialog.Title>
        <Dialog.Description>{mode === 'signup' ? authCopy.signupDescription : mode === 'signin' ? authCopy.signinDescription : mode === 'forgot' ? copy.forgotDescription : copy.resetDescription}</Dialog.Description>
        {(mode === 'signin' || mode === 'signup') && socialProviders.includes('google') && <div className="email-auth-social"><GoogleSignin variant="dialog" returnTo={returnTo} /><span>{copy.divider}</span></div>}
        <form onSubmit={event => { void submit(event) }}>
          <fieldset disabled={busy}>
            {mode === 'signup' && <label htmlFor={id + '-name'}>{copy.name}<input id={id + '-name'} name="name" value={name} onChange={event => setName(event.target.value)} autoComplete="name" minLength={2} maxLength={50} required /></label>}
            {mode !== 'reset' && <label htmlFor={id + '-email'}>{copy.address}<input ref={emailInput} id={id + '-email'} name="email" type="email" value={email} onChange={event => setEmail(event.target.value)} autoComplete="email" maxLength={254} required /></label>}
            {mode !== 'forgot' && <label htmlFor={id + '-password'}>{mode === 'reset' ? copy.newPassword : copy.password}<span className="email-auth-password"><input ref={passwordInput} id={id + '-password'} name="password" type={showPassword ? 'text' : 'password'} value={password} onChange={event => setPassword(event.target.value)} autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} minLength={8} maxLength={100} required aria-describedby={mode !== 'signin' ? id + '-password-help' : undefined} /><button type="button" aria-label={showPassword ? copy.hidePassword : copy.showPassword} aria-pressed={showPassword} onClick={() => setShowPassword(value => !value)}>{showPassword ? <EyeOff size={17} aria-hidden="true" /> : <Eye size={17} aria-hidden="true" />}</button></span></label>}
            {(mode === 'signup' || mode === 'reset') && <p id={id + '-password-help'} className="email-auth-help">{authCopy.passwordHelp}</p>}
            {mode === 'signin' && passwordResetEnabled && <button type="button" className="email-auth-link email-auth-forgot" onClick={() => changeMode('forgot')}>{copy.forgot}</button>}
            {error && <p className="email-auth-error" role="alert">{error}</p>}
            {notice && <p className="email-auth-notice" role="status">{notice}</p>}
            <button type="submit" className="email-auth-submit" disabled={busy}>{busy && <LoaderCircle size={17} className="animate-spin" aria-hidden="true" />}{busy ? copy.submitting : mode === 'signup' ? copy.signup : mode === 'signin' ? copy.signin : mode === 'forgot' ? copy.sendReset : copy.resetPassword}</button>
          </fieldset>
        </form>
        <div className="email-auth-switch">{mode === 'signin' || mode === 'signup' ? <>{mode === 'signin' ? copy.noAccount : copy.hasAccount} <button className="email-auth-link" type="button" disabled={busy} onClick={() => changeMode(mode === 'signin' ? 'signup' : 'signin')}>{mode === 'signin' ? copy.signup : copy.signin}</button></> : <button type="button" className="email-auth-link" disabled={busy} onClick={() => changeMode('signin')}>{authCopy.backToSignin}</button>}</div>
        {!passwordResetEnabled && <p className="email-auth-help email-auth-support">{copy.support}</p>}
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>
}
