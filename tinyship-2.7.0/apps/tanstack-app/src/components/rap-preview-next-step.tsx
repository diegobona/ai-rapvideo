import { useEffect, useRef } from 'react'
import { Sparkles } from 'lucide-react'
import { rapCopy, type RapLocale } from '@/lib/rap-copy'
import { RapCreditPurchase } from './rap-credit-purchase'

export function RapPreviewNextStep({ watched, locale }: { watched: boolean; locale: RapLocale }) {
  const copy = rapCopy[locale].previewNextStep
  const card = useRef<HTMLElement>(null)

  useEffect(() => {
    // Returning from an explicit sign-in should land beside the restored video.
    // Completion and playback alone never scroll the page or move keyboard focus.
    if (window.location.hash === '#preview-next-step') {
      card.current?.scrollIntoView({ block: 'nearest', behavior: 'instant' })
    }
  }, [])

  return <section ref={card} id="preview-next-step" className={'rap-preview-next-step' + (watched ? ' is-watched' : '')} aria-labelledby="preview-next-step-title">
    <h3 id="preview-next-step-title" aria-live="polite" aria-atomic="true"><Sparkles size={17} aria-hidden="true" />{watched ? copy.watched : copy.ready}</h3>
    <p>{copy.description}</p>
    <strong className="rap-preview-pack">{copy.pack}</strong>
    <RapCreditPurchase locale={locale} compact />
  </section>
}
