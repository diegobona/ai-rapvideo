import { ArrowRight, CreditCard, LoaderCircle } from 'lucide-react'
import { rapCreditCopy } from '@/lib/rap-credit-copy'
import type { RapLocale } from '@/lib/rap-copy'
import { useRapCredits } from './rap-credit-provider'
import { EmailAuthDialog } from './email-auth-dialog'
import { GoogleSignin } from './google-signin'
import './rap-credit.css'

export function RapCreditPurchase({ locale = 'en', compact = false, showBalance = true }: { locale?: RapLocale; compact?: boolean; showBalance?: boolean }) {
  const copy = rapCreditCopy[locale]
  const credits = useRapCredits()
  const state = credits.order?.state
  const orderCopy = state === 'pending' ? copy.pending : state === 'available' ? copy.available : state === 'starting' ? copy.starting : state === 'processing' ? copy.processing : state === 'succeeded' ? copy.succeeded : state === 'refund_pending' ? copy.refundPending : state === 'refunded' ? credits.order?.refundStatus === 'partially_refunded' ? copy.partiallyRefunded : copy.refunded : state === 'expired' ? copy.expired : ''
  const blocked = ['starting', 'processing', 'refund_pending'].includes(state ?? '')
  return <div className={'rap-credit-actions' + (compact ? ' is-compact' : '')}>
    {showBalance && credits.signedIn && <p className="rap-credit-balance">{copy.balance}: <strong>{credits.credits}</strong></p>}
    {(credits.verifying || credits.notice || orderCopy) && <p className="rap-credit-notice" role="status" aria-live="polite">
      {credits.verifying ? copy.verifying : credits.notice === 'cancelled' ? copy.cancelled : credits.notice === 'paid' && state === 'available' ? copy.paid : orderCopy}
    </p>}
    {!credits.signedIn ? <>
      <p>{copy.signIn}</p>
      <div className="rap-credit-auth"><GoogleSignin variant="preview" /><EmailAuthDialog variant="preview" /></div>
    </> : <>
      {credits.credits > 0 && <a className="rap-credit-use" href="/#rap-maker">{copy.continue}<ArrowRight size={16} aria-hidden="true" /></a>}
      {credits.enabled && !blocked && <button className="rap-credit-buy" type="button" disabled={credits.checkoutBusy || credits.loading || credits.verifying || credits.checking} onClick={() => { void credits.checkout() }}>
        {credits.checkoutBusy ? <LoaderCircle className="animate-spin" size={16} aria-hidden="true" /> : <CreditCard size={16} aria-hidden="true" />}{credits.checkoutBusy ? copy.checkout : copy.buy}
      </button>}
    </>}
    {!credits.loading && !credits.enabled && <p className="rap-credit-muted">{copy.comingSoon}</p>}
    {credits.error && <p className="rap-credit-error" role="alert">{copy.errors[credits.error]}</p>}
    {credits.signedIn && (credits.error || credits.verifying || ['pending', 'starting', 'processing', 'refund_pending'].includes(state ?? '')) && <button className="rap-credit-check" type="button" disabled={credits.checking || credits.verifying || credits.checkoutBusy} onClick={() => { void credits.refresh() }}>{credits.checking || credits.verifying ? copy.checking : copy.check}</button>}
  </div>
}

export function RapPricingCard({ locale = 'en' }: { locale?: RapLocale }) {
  const copy = rapCreditCopy[locale]
  const credits = useRapCredits()
  return <div className="pricing-card">
    <span className="pricing-availability">{credits.enabled ? copy.availability : copy.comingSoon}</span>
    <div className="pricing-offer"><strong className="pricing-price">{copy.price}</strong><div><h3>{copy.pack}</h3><p>{copy.detail}</p></div></div>
    <p className="pricing-note">{copy.note}</p>
    <RapCreditPurchase locale={locale} />
  </div>
}
