import { describe, expect, it } from 'vitest'
import { seoHead } from '../../../apps/tanstack-app/src/lib/seo'
import { isResourcePath, normalizeCanonical, normalizePath, robotsText, SITE_ORIGIN } from '../../../apps/tanstack-app/src/lib/site'
import { discoverSitemapPaths, renderSitemap } from '../../../apps/tanstack-app/src/lib/sitemap'

const page = (path: string, extra = '') =>
  `export const Route = createFileRoute('${path}')({ component: Page, ${extra} })`

describe('English SEO foundation', () => {
  it('uses the primary HTTPS host without tracking parameters or fragments', () => {
    expect(normalizeCanonical('http://www.rumpelstiltskin-ai.co/guide//intro/?utm_source=test#top'))
      .toBe(`${SITE_ORIGIN}/guide/intro`)
  })

  it('normalizes relative paths, duplicate separators and dot segments', () => {
    expect(normalizePath('///guide/./chapter/../?q=1#top')).toBe('/guide')
    expect(normalizePath('/')).toBe('/')
    expect(normalizePath('/guide/%E9%BB%84%E9%87%91/')).toBe('/guide/%E9%BB%84%E9%87%91')
  })

  it('creates exactly one canonical and never emits keyword metadata', () => {
    const head = seoHead({ title: 'Guide', description: 'A useful guide.', canonical: '/guide/?q=1', keywords: 'ignored' } as Parameters<typeof seoHead>[0])
    expect(head.links).toEqual([{ rel: 'canonical', href: `${SITE_ORIGIN}/guide` }])
    expect(head.meta).toContainEqual({ title: 'Guide' })
    expect(head.meta).toContainEqual({ name: 'description', content: 'A useful guide.' })
    expect(head.meta.some((entry) => 'name' in entry && entry.name === 'keywords')).toBe(false)
    const documentHead = seoHead({ title: 'Guide', description: 'Guide description.', canonical: '/guide', document: true })
    expect(documentHead.meta).toContainEqual({ charSet: 'utf-8' })
    expect(documentHead.meta).toContainEqual({ name: 'viewport', content: 'width=device-width, initial-scale=1' })
    expect(documentHead.links.filter((link) => link.rel === 'canonical')).toHaveLength(1)
    expect(documentHead.links).toContainEqual({ rel: 'icon', href: '/favicon.ico', type: 'image/x-icon' })
  })

  it('defaults public pages to index and resource pages to noindex', () => {
    const robots = (canonical: string, noindex?: boolean) =>
      seoHead({ title: 'Page', description: 'Page description.', canonical, noindex }).meta.find((entry) => 'name' in entry && entry.name === 'robots')
    expect(robots('/')).toEqual({ name: 'robots', content: 'index, follow' })
    expect(robots('/signing-guide')).toEqual({ name: 'robots', content: 'index, follow' })
    for (const path of ['/signin?next=/guide', '/signup', '/login', '/logout', '/forgot-password', '/reset-password', '/api', '/api/auth/callback', '/payment-success', '/payment-cancel', '/checkout/return', '/pricing', '/privacy', '/privacy-policy', '/terms', '/terms-of-service', '/dashboard/settings', '/admin', '/404']) {
      expect(isResourcePath(path), path).toBe(true)
      expect(robots(path), path).toEqual({ name: 'robots', content: 'noindex, follow' })
    }
    expect(robots('/unpublished', true)).toEqual({ name: 'robots', content: 'noindex, follow' })
    expect(discoverSitemapPaths(Object.fromEntries(['/login', '/logout', '/checkout', '/pricing', '/privacy', '/privacy-policy', '/terms', '/terms-of-service'].map((path) => [`../routes${path}.tsx`, page(path)])))).toEqual([])
  })

  it('uses the canonical for OG and accepts page-specific OG values', () => {
    const head = seoHead({ title: 'Guide', description: 'Guide description.', canonical: '/guide?ref=ad', og: { title: 'A golden guide', image: '/gold.png', imageAlt: 'Gold', type: 'article' } })
    expect(head.meta).toContainEqual({ property: 'og:url', content: `${SITE_ORIGIN}/guide` })
    expect(head.meta).toContainEqual({ property: 'og:title', content: 'A golden guide' })
    expect(head.meta).toContainEqual({ property: 'og:description', content: 'Guide description.' })
    expect(head.meta).toContainEqual({ property: 'og:image', content: `${SITE_ORIGIN}/gold.png` })
    expect(head.meta).toContainEqual({ property: 'og:image:alt', content: 'Gold' })
  })

  it('automatically discovers added static pages without a second route list', () => {
    expect(discoverSitemapPaths({
      '../routes/index.tsx': page('/'),
      '../routes/about-us.tsx': page('/about-us'),
      '../routes/(public)/_docs/getting-started.tsx': page('/(public)/_docs/getting-started'),
    })).toEqual(['/', '/about-us', '/getting-started'])
  })

  it('adds matching Twitter metadata only when opted in and preserves exact JSON-LD text safely', () => {
    const structuredData = { '@context': 'https://schema.org', text: 'A </script> string stays data.' }
    const head = seoHead({ title: 'Page', description: 'Description', canonical: '/', og: { title: 'Share title', description: 'Share description', image: '/share.jpg', imageWidth: 1200, imageHeight: 630 }, twitter: true, structuredData })
    expect(head.meta).toContainEqual({ name: 'twitter:title', content: 'Share title' })
    expect(head.meta).toContainEqual({ name: 'twitter:description', content: 'Share description' })
    expect(head.meta).toContainEqual({ property: 'og:image:width', content: '1200' })
    expect(head.meta).toContainEqual({ property: 'og:image:height', content: '630' })
    expect(head.scripts?.[0].type).toBe('application/ld+json')
    expect(head.scripts?.[0].children).not.toContain('</script>')
    expect(JSON.parse(head.scripts![0].children)).toEqual(structuredData)
    const otherPage = seoHead({ title: 'Other', description: 'Other page', canonical: '/other' })
    expect(otherPage.scripts).toBeUndefined()
    expect(otherPage.meta.some(entry => 'name' in entry && entry.name.startsWith('twitter:'))).toBe(false)
  })

  it('excludes layouts, API, resources, dynamic pages and explicit noindex pages', () => {
    expect(discoverSitemapPaths({
      '../routes/index.tsx': page('/'),
      '../routes/__root.tsx': page('/__root'),
      '../routes/-helper.tsx': page('/helper'),
      '../routes/(auth)/unusual-auth.tsx': page('/(auth)/unusual-auth'),
      '../routes/(public).tsx': page('/(public)'),
      '../routes/api/health.ts': page('/api/health'),
      '../routes/private-endpoint.ts': "export const Route = createFileRoute('/private-endpoint')({ server: { handlers: {} } })",
      '../routes/payment-success.tsx': page('/payment-success'),
      '../routes/404.tsx': page('/404'),
      '../routes/stories/$slug.tsx': page('/stories/$slug'),
      '../routes/draft.tsx': page('/draft', 'head: () => seoHead({ noindex: true })'),
    })).toEqual(['/'])
  })

  it('allows published dynamic URLs while filtering resource URLs and duplicates', () => {
    expect(discoverSitemapPaths({ '../routes/index.tsx': page('/') }, ['/stories/gold/', '/stories/gold?ref=feed', '/signin', '/stories/$slug']))
      .toEqual(['/', '/stories/gold'])
  })

  it('excludes legacy Rumpelstiltskin pages from discovered, published and rendered sitemap URLs', () => {
    const legacyPaths = [
      '/rumpelstiltskin-ai-video-generator',
      '/rumpelstiltskin-dance-video',
      '/best-rumpelstiltskin-ai-generators',
      '/rumpelstiltskin-meme',
      '/how-to-make-rumpelstiltskin-ai-video',
      '/is-rumpelstiltskin-1987-real',
    ]
    const routes = Object.fromEntries(['/', '/rap-video-guide', ...legacyPaths].map(path => [`../routes${path}.tsx`, page(path)]))
    expect(discoverSitemapPaths(routes, ['/guides/Rumpelstiltskin', '/rap-video-guide']))
      .toEqual(['/', '/rap-video-guide'])
    const xml = renderSitemap(['/', ...legacyPaths, '/guides/Rumpelstiltskin'])
    expect(xml).not.toMatch(/rumpelstiltskin/i)
    expect(xml.match(/<loc>/g)).toHaveLength(1)
    expect(xml).toContain(`<loc>${SITE_ORIGIN}/</loc>`)
  })

  it('renders escaped sitemap XML and robots that allow every directory', () => {
    expect(renderSitemap(['/guides/a&b', '/guides/a&b?ref=feed'])).toContain(`<loc>${SITE_ORIGIN}/guides/a&amp;b</loc>`)
    expect(renderSitemap(['/guides/a&b', '/guides/a&b?ref=feed']).match(/<loc>/g)).toHaveLength(1)
    expect(robotsText()).toBe(`User-agent: *\nAllow: /\nSitemap: ${SITE_ORIGIN}/sitemap.xml\n`)
    expect(robotsText()).not.toContain('Disallow:')
  })
})
