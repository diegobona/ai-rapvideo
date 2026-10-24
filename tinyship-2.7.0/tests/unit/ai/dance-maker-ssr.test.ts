import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, test } from 'vitest'
import { DanceMaker } from '../../../apps/tanstack-app/src/components/dance-maker'
import { homeCopy } from '../../../apps/tanstack-app/src/lib/home-copy'
import { toolPageCopy } from '../../../apps/tanstack-app/src/lib/tool-page-copy'
import { tutorialCopy } from '../../../apps/tanstack-app/src/lib/tutorial-copy'
import { VIDEO_PAYMENT_REQUIRED, videoPurchaseConfig } from '../../../config/videoPurchase'

describe('dance maker initial server render', () => {
  test('renders both character inputs and download copy without the removed setting panel', () => {
    const html = renderToStaticMarkup(createElement(DanceMaker, { copy: homeCopy.tool }))
    for (const label of [homeCopy.tool.photoLabel, homeCopy.tool.photoHint, homeCopy.tool.choosePhoto, homeCopy.tool.princessLabel, homeCopy.tool.princessHint, homeCopy.tool.choosePrincess, homeCopy.tool.defaultPrincessLabel, homeCopy.tool.generateButton, homeCopy.tool.resultTitle, homeCopy.tool.downloadButton, homeCopy.tool.downloadHint, homeCopy.tool.progressHint]) {
      expect(html).toContain(label)
    }
    expect(html.match(/type="file"/g)).toHaveLength(2)
    expect(html.match(/aria-required="true"/g)).toHaveLength(1)
    expect(html).toContain('src="/images/references/princess-default-v2.png"')
    expect(html).not.toContain('src="/images/references/barn-scene.png"')
    expect(html).not.toMatch(/Choose scene|Change scene|Use default scene|Scene image/)
    expect(html).not.toMatch(/Camera push-in|Vintage film/)
    expect(html).toContain('Expression details (optional)')
    expect(html).toContain('Generate video — $4.99')
    expect(html).toContain('$4.99 per video')
    expect(html).toContain('$4.99 USD per video. One payment, no subscription.')
    expect(html).not.toMatch(/Temporary free|Free access|No payment required/i)
    expect(html).not.toContain('Your dance setting')
    expect(html.match(/type="radio"/g)).toHaveLength(2)
    expect(html).toContain(homeCopy.tool.orientation.label)
    expect(html).toContain(homeCopy.tool.orientation.options.landscape)
    expect(html).toContain(homeCopy.tool.orientation.options.portrait)
    expect(html).not.toMatch(/<h[12][\s>]/)
    expect(html).not.toContain('<video')
    expect(html).not.toMatch(/href="\/(?:signin|signup)|Sign in|Sign up/)
    expect(html).toContain(homeCopy.tool.offerNoLogin)
    expect(html).toContain(homeCopy.tool.offerFree)
    expect(html).not.toContain('Open video')
  })

  test('omits the removed helper paragraphs and their accessibility reference', () => {
    const html = renderToStaticMarkup(createElement(DanceMaker, { copy: homeCopy.tool }))
    expect(html).not.toContain(homeCopy.tool.customization.hint)
    expect(html).not.toContain('custom-hint')
    expect(html).toMatch(/aria-describedby="[^"]+-custom-count"/)
    expect(html).not.toContain(homeCopy.tool.status.idle)
    expect(html).not.toContain(homeCopy.tool.fidelityHint)
    expect(html).not.toContain('role="status"')
  })

  test('keeps the refund guarantee and explains the download retention window', () => {
    const html = renderToStaticMarkup(createElement(DanceMaker, { copy: homeCopy.tool }))
    expect(html).toContain(homeCopy.tool.refundGuarantee)
    expect(html).toContain('Your photos stay yours')
    expect(html).toContain('Stored on Cloudflare. Automatic deletion is scheduled after 24 hours.')
    expect(html).toContain('Download your video within 24 hours to keep it.')
  })

  test('requires the fixed paid price and excludes temporary-free claims from public copy', () => {
    expect(VIDEO_PAYMENT_REQUIRED).toBe(true)
    expect(videoPurchaseConfig.amount).toBe(499)
    expect(videoPurchaseConfig.currency).toBe('usd')
    const publicCopy = JSON.stringify({ homeCopy, toolPageCopy, tutorialCopy })
    expect(publicCopy).not.toMatch(/temporar(?:y|ily) free|Free access|no payment(?:,| or| required)/i)
    const privacyFaq = homeCopy.faq.items.find(item => item.question === 'How are my photos and videos handled?')
    expect(privacyFaq?.answer).toContain('Stored on Cloudflare. Automatic deletion is scheduled after 24 hours.')
    expect(privacyFaq?.answer).toContain('Download your video within 24 hours to keep it.')
  })

  test('shows service unavailability in server HTML while retaining the photo controls', () => {
    const html = renderToStaticMarkup(createElement(DanceMaker, { copy: homeCopy.tool, isAvailable: false }))
    expect(html).toContain(homeCopy.tool.unavailableHint)
    expect(html).toContain(homeCopy.tool.choosePhoto)
    expect(html).toContain('disabled=""')
  })
})
