import { isResourcePath, normalizeCanonical, SITE_NAME, SITE_ORIGIN } from './site'
import { isRetiredPagePath } from './retired-pages'

export interface SeoOptions {
  title: string
  description: string
  canonical: string
  noindex?: boolean
  document?: boolean
  twitter?: boolean
  structuredData?: Record<string, unknown>
  og?: {
    title?: string
    description?: string
    type?: 'website' | 'article'
    image?: string
    imageAlt?: string
    imageWidth?: number
    imageHeight?: number
  }
}

export interface SeoHead {
  meta: Array<{ title: string } | { name: string; content: string } | { property: string; content: string } | { charSet: 'utf-8' }>
  links: Array<{ rel: string; href: string; type?: string }>
  scripts?: Array<{ type: 'application/ld+json'; children: string }>
}

/** The sole page-head builder. Pass the current pathname, never a shared home URL. */
export function seoHead(options: SeoOptions): SeoHead {
  const canonical = normalizeCanonical(options.canonical)
  const noindex = options.noindex || isResourcePath(options.canonical) || isRetiredPagePath(options.canonical)
  const meta: SeoHead['meta'] = [
    { title: options.title },
    { name: 'description', content: options.description },
    { name: 'robots', content: noindex ? 'noindex, follow' : 'index, follow' },
    { property: 'og:title', content: options.og?.title ?? options.title },
    { property: 'og:description', content: options.og?.description ?? options.description },
    { property: 'og:url', content: canonical },
    { property: 'og:type', content: options.og?.type ?? 'website' },
    { property: 'og:site_name', content: SITE_NAME },
  ]
  const links: SeoHead['links'] = [{ rel: 'canonical', href: canonical }]

  if (options.og?.image) {
    meta.push({ property: 'og:image', content: new URL(options.og.image, `${SITE_ORIGIN}/`).href })
    if (options.og.imageAlt) meta.push({ property: 'og:image:alt', content: options.og.imageAlt })
    if (options.og.imageWidth) meta.push({ property: 'og:image:width', content: String(options.og.imageWidth) })
    if (options.og.imageHeight) meta.push({ property: 'og:image:height', content: String(options.og.imageHeight) })
    if (options.twitter) {
      meta.push(
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:title', content: options.og.title ?? options.title },
        { name: 'twitter:description', content: options.og.description ?? options.description },
        { name: 'twitter:image', content: new URL(options.og.image, `${SITE_ORIGIN}/`).href },
      )
      if (options.og.imageAlt) meta.push({ name: 'twitter:image:alt', content: options.og.imageAlt })
    }
  }

  if (options.document) {
    meta.unshift({ charSet: 'utf-8' }, { name: 'viewport', content: 'width=device-width, initial-scale=1' })
    links.push({ rel: 'icon', href: '/favicon.ico', type: 'image/x-icon' })
  }

  const head: SeoHead = { meta, links }
  if (options.structuredData) {
    head.scripts = [{
      type: 'application/ld+json',
      children: JSON.stringify(options.structuredData).replace(/</g, '\\u003c'),
    }]
  }
  return head
}

