import { useRef } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { ArrowRight, Check, LoaderCircle, LockKeyhole, Sparkles, X } from 'lucide-react'

export interface DanceCheckoutCopy {
  badge: string
  title: string
  description: string
  price: string
  currency: string
  unit: string
  features: readonly string[]
  button: string
  preparing: string
  secure: string
  finePrint: string
  cancelled: string
  close: string
}

interface DanceCheckoutDialogProps {
  copy: DanceCheckoutCopy
  open: boolean
  preparing: boolean
  error?: string
  onOpenChange: (open: boolean) => void
  onPay: () => void
  returnFocus: () => void
}

export function DanceCheckoutDialog({ copy, open, preparing, error, onOpenChange, onPay, returnFocus }: DanceCheckoutDialogProps) {
  const payRef = useRef<HTMLButtonElement>(null)
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[80] bg-[#050805]/80 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-[81] max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-[26rem] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-[1.75rem] border border-[#d6b96a]/30 bg-[#121c16] p-6 text-[#f9f5e9] shadow-[0_24px_100px_rgba(0,0,0,0.65)] sm:p-8"
          onOpenAutoFocus={(event) => { event.preventDefault(); payRef.current?.focus() }}
          onCloseAutoFocus={(event) => { event.preventDefault(); returnFocus() }}
          aria-busy={preparing}
          data-testid="rap-checkout-dialog"
        >
          <Dialog.Close className="absolute right-4 top-4 rounded-full p-2 text-[#c7d0c6] transition hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e6c87d]" aria-label={copy.close}>
            <X aria-hidden="true" className="h-4 w-4" />
          </Dialog.Close>
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#ddc27d]/25 bg-[#ddc27d]/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#e6cb87]">
            <Sparkles aria-hidden="true" className="h-3.5 w-3.5" />{copy.badge}
          </div>
          <Dialog.Title className="pr-3 font-serif text-[2rem] leading-[1.12] tracking-tight sm:text-[2.25rem]">{copy.title}</Dialog.Title>
          <Dialog.Description className="mt-3 text-sm leading-relaxed text-[#bcc8bd]">{copy.description}</Dialog.Description>
          <div className="my-6 rounded-2xl border border-[#ddc27d]/20 bg-[#1b291f] px-5 py-5">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <span className="text-5xl font-semibold tracking-[-0.05em] text-[#f0d28a]">{copy.price}</span>
              <span className="text-xs font-medium tracking-wide text-[#d5dbc9]">{copy.currency}</span>
              <span className="text-sm text-[#b7c2b2]">{copy.unit}</span>
            </div>
            <ul className="mt-5 space-y-3">
              {copy.features.map((feature) => <li key={feature} className="flex items-start gap-2.5 text-sm leading-relaxed text-[#e2e8dc]"><Check aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-[#e9cc85]" /><span>{feature}</span></li>)}
            </ul>
          </div>
          {error && <p className="mb-4 rounded-xl border border-[#f1c5a0]/25 bg-[#f1c5a0]/10 p-3 text-sm leading-relaxed text-[#f5d2b8]" role="alert">{error}</p>}
          <button ref={payRef} type="button" onClick={onPay} disabled={preparing} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#e8cb83] px-4 py-3 text-sm font-bold text-[#182219] transition hover:bg-[#f2d99b] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#e8cb83] disabled:cursor-wait disabled:opacity-70" data-testid="rap-checkout-pay">
            {preparing ? <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" /> : null}
            {preparing ? copy.preparing : copy.button}
            {!preparing && <ArrowRight aria-hidden="true" className="h-4 w-4" />}
          </button>
          <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-[#c4cfbc]"><LockKeyhole aria-hidden="true" className="h-3 w-3 shrink-0" />{copy.secure}</p>
          <p className="mt-3 text-center text-[11px] leading-relaxed text-[#99a895]">{copy.finePrint}</p>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
