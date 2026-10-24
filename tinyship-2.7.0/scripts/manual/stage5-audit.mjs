import { chromium } from '@playwright/test'
import { execFile } from 'node:child_process'
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { promisify } from 'node:util'
import { pageRegistry } from '../../apps/tanstack-app/src/lib/page-registry.ts'
import { homeCopy } from '../../apps/tanstack-app/src/lib/home-copy.ts'

const executeFile = promisify(execFile)
const repository = fileURLToPath(new URL('../../', import.meta.url))
const origin = 'https://ai-rapvideo.co'
const publicPages = Object.values(pageRegistry)
const resourcePaths = ['/payment-success', '/payment-cancel', '/privacy-policy', '/terms-of-service']
const slug = (pathname) => pathname === '/' ? 'home' : pathname.slice(1).replaceAll('/', '-')
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right)

async function activeHtmlRoutes(directory) {
  const routes = []
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.name.startsWith('-') || entry.name === 'api' || entry.name === '(auth)') continue
    const fullPath = path.join(directory, entry.name)
    if (entry.isDirectory()) routes.push(...await activeHtmlRoutes(fullPath))
    else if (/\.tsx?$/.test(entry.name) && entry.name !== '__root.tsx') {
      const source = await readFile(fullPath, 'utf8')
      const route = source.match(/createFileRoute\(\s*['"]([^'"]+)['"]\s*\)/)?.[1]
      if (!route || !/\bcomponent\s*:/.test(source) || route.includes('$') || /^\(.+\)$/.test(route.split('/').at(-1))) continue
      routes.push('/' + route.split('/').filter((part) => part && !/^\(.+\)$/.test(part) && !part.startsWith('_')).join('/'))
    }
  }
  return [...new Set(routes)].sort()
}

/** Read-only release audit: no account creation, uploads, generation, payment or logout requests. */
export async function auditSite({ browser, baseURL = process.env.SEO_TEST_BASE_URL || 'http://127.0.0.1:7002', outputDir = path.join(repository, 'test-results/stage5-audit') } = {}) {
  if (!browser) throw new Error('Pass an existing Playwright browser to auditSite.')
  await mkdir(outputDir, { recursive: true })
  const base = new URL(baseURL)
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1440, height: 1000 } })
  const page = await context.newPage()
  const documents = []
  const navigationErrors = []
  const checks = []
  const linkChecks = []
  const register = (collection, id, label, failures, evidence) => collection.push({ id, label, passed: failures.length === 0, failures, evidence })
  const localURL = (url) => `${base.origin}${url.pathname}${url.search}`
  const isInternal = (url) => url.origin === base.origin || url.origin === origin || url.hostname === 'www.ai-rapvideo.co'
  const expectedPaths = [...publicPages.map(({ path }) => path), ...resourcePaths]
  const registeredRoutes = await activeHtmlRoutes(path.join(repository, 'apps/tanstack-app/src/routes'))

  try {
    for (const pathname of expectedPaths) {
      try {
        const response = await page.goto(`${base.origin}${pathname}?utm_source=stage5`, { waitUntil: 'load', timeout: 30000 })
        const html = await response.text()
        await writeFile(path.join(outputDir, `${slug(pathname)}.html`), html)
        for (const image of await page.locator('img').all()) {
          await image.scrollIntoViewIfNeeded().catch(() => {})
          await image.evaluate((element) => {
            if (element.complete) return
            return new Promise((resolve) => {
              const timer = setTimeout(resolve, 5000)
              element.addEventListener('load', () => { clearTimeout(timer); resolve() }, { once: true })
              element.addEventListener('error', () => { clearTimeout(timer); resolve() }, { once: true })
            })
          })
        }
        const document = await page.evaluate(() => {
          const text = (node) => node.textContent.replace(/\s+/g, ' ').trim()
          const links = [...document.querySelectorAll('a[href]')].map((node) => ({
            text: text(node), href: node.getAttribute('href'), rel: node.getAttribute('rel') || '', target: node.getAttribute('target'),
            inMain: !!node.closest('main'), inParagraph: !!node.closest('main p'), inFooter: !!node.closest('footer'),
          }))
          return {
            titles: [...document.querySelectorAll('title')].map(text),
            descriptions: [...document.querySelectorAll('meta[name="description"]')].map((node) => node.content),
            canonicals: [...document.querySelectorAll('link[rel="canonical"]')].map((node) => node.href),
            robots: [...document.querySelectorAll('meta[name="robots"]')].map((node) => node.content),
            h1: [...document.querySelectorAll('h1')].map(text),
            headings: [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].map((node) => ({ level: Number(node.tagName.slice(1)), text: text(node) })),
            paragraphs: [...document.querySelectorAll('main p,body > div p')].map(text).filter(Boolean),
            keywords: document.querySelectorAll('meta[name="keywords" i]').length,
            language: document.documentElement.lang,
            images: [...document.images].map((image) => ({ src: image.getAttribute('src'), alt: image.getAttribute('alt'), width: Number(image.getAttribute('width')), height: Number(image.getAttribute('height')), naturalWidth: image.naturalWidth, naturalHeight: image.naturalHeight, complete: image.complete })),
            ids: [...document.querySelectorAll('[id]')].map((node) => node.id),
            homeRelated: [...document.querySelectorAll('section[aria-labelledby="more-video-tools"] h3 a')].map((node) => ({ text: text(node), href: node.getAttribute('href') })),
            links,
          }
        })
        documents.push({ path: pathname, status: response.status(), rawH1Count: [...html.matchAll(/<h1\b/g)].length, rawHasBody: /<p(?:\s|>)/.test(html), ...document })
      } catch (error) {
        navigationErrors.push({ path: pathname, message: error.message })
      }
    }

    const publicDocuments = documents.filter(({ path }) => publicPages.some((entry) => entry.path === path))
    const resourceDocuments = documents.filter(({ path }) => resourcePaths.includes(path))
    const at = (pathname) => documents.find((item) => item.path === pathname)
    const errorsFor = (predicate, detail) => documents.filter(predicate).map((item) => ({ path: item.path, ...detail(item) }))
    const titles = documents.flatMap(({ titles }) => titles)
    register(checks, 'titles', 'Every page has a unique, relevant title', [
      ...errorsFor((item) => item.titles.length !== 1 || !item.titles[0], (item) => ({ titles: item.titles })),
      ...publicPages.filter((entry) => at(entry.path)?.titles[0] !== entry.title).map((entry) => ({ path: entry.path, expected: entry.title, actual: at(entry.path)?.titles })),
      ...(new Set(titles).size !== titles.length ? [{ error: 'Duplicate title text' }] : []),
      ...navigationErrors,
    ], { count: documents.length, titles: documents.map(({ path, titles }) => ({ path, title: titles[0] })) })

    register(checks, 'headings', 'Exactly one H1 and semantic section headings', [
      ...errorsFor((item) => item.h1.length !== 1 || item.rawH1Count !== 1, (item) => ({ h1: item.h1, rawH1Count: item.rawH1Count })),
      ...publicPages.filter((entry) => at(entry.path)?.h1[0] !== entry.h1).map((entry) => ({ path: entry.path, expected: entry.h1 })),
      ...publicDocuments.filter((item) => !item.headings.some(({ level }) => level === 2)).map(({ path }) => ({ path, error: 'No H2 content sections' })),
      ...errorsFor((item) => item.headings.some((heading, index) => index > 0 && heading.level > item.headings[index - 1].level + 1), (item) => ({ headings: item.headings })),
    ], { pages: documents.map(({ path, headings }) => ({ path, headings })), note: 'Short account/payment forms have one H1; public articles/tools and legal documents use section headings where needed.' })

    register(checks, 'descriptions', 'Exactly one non-empty description on every page', errorsFor((item) => item.descriptions.length !== 1 || !item.descriptions[0], (item) => ({ descriptions: item.descriptions })), documents.map(({ path, descriptions }) => ({ path, description: descriptions[0] })))
    register(checks, 'canonicals', 'Exactly one self-referencing HTTPS apex canonical without queries', errorsFor((item) => !same(item.canonicals, [`${origin}${item.path}`]), (item) => ({ canonicals: item.canonicals })), documents.map(({ path, canonicals }) => ({ path, canonical: canonicals[0] })))

    const sitemapResponse = await context.request.get(`${base.origin}/sitemap.xml`)
    const sitemap = await sitemapResponse.text()
    const locations = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1])
    const robotsResponse = await context.request.get(`${base.origin}/robots.txt`)
    const robots = await robotsResponse.text()
    await writeFile(path.join(outputDir, 'sitemap.xml'), sitemap)
    await writeFile(path.join(outputDir, 'robots.txt'), robots)
    register(checks, 'discovery', 'Sitemap includes only the AI Rap Video homepage and robots allows crawling', [
      ...(!same(locations, ['https://ai-rapvideo.co/']) || /rumpelstiltskin/i.test(sitemap) ? [{ locations }] : []),
      ...(sitemapResponse.status() !== 200 || robotsResponse.status() !== 200 ? [{ sitemapStatus: sitemapResponse.status(), robotsStatus: robotsResponse.status() }] : []),
      ...(!/^User-agent:\s*\*\s*$/m.test(robots) || !/^Allow:\s*\/\s*$/m.test(robots) || /^Disallow:\s*\S/m.test(robots) || !robots.includes('Sitemap: https://ai-rapvideo.co/sitemap.xml') ? [{ robots }] : []),
    ], { locations, robots, note: 'Legacy Rumpelstiltskin and noindex resource pages are excluded from the sitemap, while robots allows their URLs to be fetched.' })
    register(checks, 'keywords', 'No keywords meta tags', errorsFor((item) => item.keywords > 0, (item) => ({ count: item.keywords })), { pages: documents.length, total: documents.reduce((sum, item) => sum + item.keywords, 0) })
    const imageFailures = documents.flatMap(({ path, images }) => images.filter((image) => !image.alt?.trim() || image.width < 300 || image.height < 300 || image.naturalWidth < 300 || image.naturalHeight < 300 || !image.complete).map((image) => ({ path, ...image })))
    register(checks, 'images', 'Every published image has alt and dimensions of at least 300 by 300', imageFailures, { count: documents.reduce((sum, item) => sum + item.images.length, 0), images: documents.filter(({ images }) => images.length).map(({ path, images }) => ({ path, images })), note: 'Checks fixed images delivered in SSR HTML, both intrinsic asset dimensions and width/height attributes; responsive CSS can display smaller thumbnails. User-uploaded previews are not published site assets.' })

    const curlResults = await Promise.all(publicPages.map(({ path }) => path).map(async (pathname) => {
      const { stdout } = await executeFile(process.platform === 'win32' ? 'curl.exe' : 'curl', ['--compressed', '--silent', '--show-error', '--fail', '--max-time', '30', `${base.origin}${pathname}?utm_source=stage5-curl`], { maxBuffer: 4 * 1024 * 1024 })
      await writeFile(path.join(outputDir, `curl-${slug(pathname)}.html`), stdout)
      const h1 = stdout.match(/<h1\b[^>]*>(.*?)<\/h1>/s)?.[1].replace(/<[^>]+>/g, '')
      return { path: pathname, h1, rawParagraphCount: [...stdout.matchAll(/<p(?:\s|>)/g)].length, savedHtml: `curl-${slug(pathname)}.html` }
    }))
    register(checks, 'ssr', 'curl sees active content H1 and body without JavaScript', [
      ...curlResults.filter((item) => !item.h1 || item.rawParagraphCount === 0),
      ...errorsFor((item) => !item.rawHasBody || item.rawH1Count !== 1, (item) => ({ rawHasBody: item.rawHasBody, rawH1Count: item.rawH1Count })),
    ], { curlResults, javaScriptEnabled: false, pages: documents.length })
    register(checks, 'noindex', 'Every existing account, payment and legal resource page is noindex', [
      ...resourceDocuments.filter((item) => !same(item.robots, ['noindex, follow'])).map(({ path, robots }) => ({ path, robots })),
      ...resourcePaths.filter((pathname) => !at(pathname)).map((path) => ({ path, reason: 'Resource page was not fetched' })),
      ...publicDocuments.filter((item) => !same(item.robots, ['index, follow'])).map(({ path, robots }) => ({ path, robots, reason: 'A public content page is not indexable' })),
    ], { resources: resourceDocuments.map(({ path, robots }) => ({ path, robots })), absentRoutes: ['/account', '/checkout', '/pricing'], note: 'No account dashboard, checkout or pricing page is registered; this audit does not invent those pages. Existing authentication and payment-result routes are covered.' })

    const anchors = documents.flatMap((document) => document.links.map((link) => ({ source: document.path, ...link })))
    const internalLinks = []
    const externalLinks = []
    const malformedLinks = []
    for (const link of anchors) {
      try {
        const url = new URL(link.href, `${base.origin}${link.source}`)
        if (!['http:', 'https:'].includes(url.protocol)) continue
        const record = { ...link, destination: url.pathname, search: url.search, hash: url.hash, absolute: url.href }
        if (isInternal(url)) internalLinks.push(record)
        else externalLinks.push(record)
      } catch { malformedLinks.push(link) }
    }
    const fetched = new Map()
    const broken = [...malformedLinks]
    for (const link of internalLinks) {
      if (link.href === '#' || link.href.trim() === '') {
        broken.push({ source: link.source, href: link.href, text: link.text, reason: 'Placeholder destination' })
        continue
      }
      const key = `${link.destination}${link.search}`
      if (!fetched.has(key)) {
        if (/^\/api\/|^\/(?:logout|signout|sign-out)(?:\/|$)/.test(link.destination)) {
          fetched.set(key, { href: key, skipped: true, reason: 'Side-effect/API link is not followed by this read-only audit' })
          broken.push({ source: link.source, href: key, reason: 'Public navigation unexpectedly targets an API or sign-out action' })
          continue
        }
        let current = new URL(key, base.origin)
        const chain = []
        for (let redirects = 0; redirects < 6; redirects += 1) {
          const response = await context.request.get(localURL(current), { maxRedirects: 0, timeout: 20000 })
          const status = response.status()
          const location = response.headers().location
          chain.push({ url: current.pathname + current.search, status, ...(location ? { location } : {}) })
          if (status >= 300 && status < 400 && location) {
            const target = new URL(location, current)
            if (!isInternal(target)) break
            current = target
            continue
          }
          break
        }
        const last = chain.at(-1)
        fetched.set(key, { href: key, status: last?.status, chain })
      }
      const result = fetched.get(key)
      if (result.status < 200 || result.status >= 400 || result.chain?.length >= 6) broken.push({ source: link.source, href: key, ...result })
      if (link.hash && !at(link.destination)?.ids.includes(decodeURIComponent(link.hash.slice(1)))) broken.push({ source: link.source, href: link.href, reason: 'Fragment target does not exist' })
    }
    register(checks, 'links', 'All internal destinations and fragment links resolve without a 404', [
      ...broken,
      ...errorsFor((item) => item.status !== 200, (item) => ({ status: item.status })),
      ...(!same(registeredRoutes, [...expectedPaths].sort()) ? [{ registeredRoutes, expectedPaths: [...expectedPaths].sort(), error: 'Unexpected or missing registered HTML route' }] : []),
    ], { occurrences: internalLinks.length, uniqueDestinations: fetched.size, destinations: [...fetched.values()], registeredRoutes })

    register(linkChecks, 'home-sections', 'Home links to its three current sections', !same(at('/')?.homeRelated, homeCopy.related.items.map(({ anchorText, href }) => ({ text: anchorText, href }))) ? [{ actual: at('/')?.homeRelated }] : [], at('/')?.homeRelated)

    const targetByAnchor = new Map()
    for (const link of [...internalLinks, ...externalLinks].filter(({ text }) => text)) {
      if (!targetByAnchor.has(link.text)) targetByAnchor.set(link.text, new Set())
      const url = new URL(link.absolute)
      targetByAnchor.get(link.text).add(isInternal(url) ? link.destination : url.origin + url.pathname)
    }
    const anchorFailures = [
      ...internalLinks.filter((link) => /\bnofollow\b/i.test(link.rel)).map((link) => ({ source: link.source, href: link.href, rel: link.rel })),
      ...internalLinks.filter((link) => publicPages.some(({ path, anchorText }) => path === link.destination && anchorText !== link.text)).map((link) => ({ source: link.source, href: link.href, text: link.text, reason: 'Published page anchor differs from target keyword' })),
      ...[...targetByAnchor].filter(([, destinations]) => destinations.size > 1).map(([anchor, destinations]) => ({ anchor, destinations: [...destinations] })),
      ...externalLinks.filter((link) => link.rel !== 'nofollow' || link.target !== null).map((link) => ({ source: link.source, href: link.href, rel: link.rel, target: link.target, reason: 'External links must use only rel=nofollow and no target override' })),
    ]
    register(linkChecks, 'anchor-policy', 'Exact and unambiguous internal anchors; nofollow only on external links', anchorFailures, { distinctAnchors: targetByAnchor.size, externalLinks: externalLinks.length, externalDestinations: [...new Set(externalLinks.map(({ absolute }) => absolute))] })

    const footerFailures = documents.filter((item) => !['/privacy-policy', '/terms-of-service'].every((pathname) => item.links.some((link) => link.inFooter && link.href === pathname))).map(({ path }) => ({ path }))
    const notFoundResponse = await context.request.get(`${base.origin}/stage5-missing-page`)
    const notFoundHtml = await notFoundResponse.text()
    const extras = {
      footer: { passed: footerFailures.length === 0, failures: footerFailures, pages: documents.length },
      englishOnly: { passed: documents.every(({ language }) => language === 'en'), languages: [...new Set(documents.map(({ language }) => language))] },
      notFound: { status: notFoundResponse.status(), ssrH1: /<h1\b[^>]*>Page not found<\/h1>/.test(notFoundHtml), hasHomeLink: /href="\/"/.test(notFoundHtml), noindex: /name="robots"[^>]*content="noindex, follow"/.test(notFoundHtml) },
    }
    const report = { generatedAt: new Date().toISOString(), baseURL: base.origin, javaScriptEnabled: false, mutations: 0, documents, checks, linkChecks, extras, passed: [...checks, ...linkChecks].every(({ passed }) => passed) && extras.footer.passed && extras.englishOnly.passed && extras.notFound.status === 404 && extras.notFound.ssrH1 && extras.notFound.noindex }
    await writeFile(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2) + '\n')
    return report
  } finally {
    await context.close()
  }
}

async function main() {
  const browser = await chromium.launch({ channel: 'msedge', headless: true })
  try {
    const report = await auditSite({ browser })
    console.log(JSON.stringify({ passed: report.passed, pages: report.documents.length, checks: report.checks, linkChecks: report.linkChecks, extras: report.extras }, null, 2))
    if (!report.passed) process.exitCode = 1
  } finally {
    await browser.close()
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch((error) => { console.error(error); process.exitCode = 1 })
}
