import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, test } from 'vitest'
import { DanceMaker } from '../../../apps/tanstack-app/src/components/dance-maker'
import { rapCopy } from '../../../apps/tanstack-app/src/lib/rap-copy'

describe('rap maker initial server render', () => {
  test('provides two required photos, four scenes and an optional topic with fixed output', () => {
    const html = renderToStaticMarkup(createElement(DanceMaker))
    expect(html.match(/type="file"/g)).toHaveLength(2)
    expect(html.match(/aria-required="true"/g)).toHaveLength(2)
    expect(html.match(/type="radio"/g)).toHaveLength(4)
    for (const scene of ['hotel-lobby', 'luxury-lobby', 'studio-booth', 'street-cypher']) expect(html).toContain(`/images/rap/scenes/${scene}.jpg`)
    expect(html).toContain(rapCopy.en.photos)
    expect(html).toContain(rapCopy.en.topic)
    expect(html).toContain('maxLength="240"')
    expect(html).toContain('12 seconds')
    expect(html).toContain('768p portrait')
    expect(html).toContain('Rap vocals + beat')
    expect(html).toContain('20 MB')
    expect(html).toContain('type="checkbox"')
    expect(html).not.toMatch(/\$4\.99|checkout|Sign in|Sign up|princess|costume|type="select"/i)
    expect(html).not.toContain('<video')
  })

  test('server rendering performs no uploads or generation and can show service unavailability', () => {
    const html = renderToStaticMarkup(createElement(DanceMaker, { isAvailable: false }))
    expect(html).toContain('Generation is temporarily unavailable')
    expect(html.match(/type="file"/g)).toHaveLength(2)
    expect(html).toContain('disabled=""')
  })

  test('supports the Chinese tool copy without changing the server-owned scene IDs', () => {
    const html = renderToStaticMarkup(createElement(DanceMaker, { locale: 'zh-CN' }))
    expect(html).toContain(rapCopy['zh-CN'].photos)
    expect(html).toContain(rapCopy['zh-CN'].scenes['hotel-lobby'].name)
    expect(html).toContain('value="hotel-lobby"')
  })
})


