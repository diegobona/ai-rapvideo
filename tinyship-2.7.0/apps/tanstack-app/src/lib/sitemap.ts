import { isResourcePath, normalizeCanonical, normalizePath } from './site'

/**
 * Discover static page URLs from the active file routes. Raw sources avoid running
 * page loaders, auth checks or API imports merely to build the sitemap.
 * Dynamic routes require concrete published URLs supplied by their content source.
 */
export function discoverSitemapPaths(routeSources: Record<string, string>, publishedPaths: readonly string[] = []): string[] {
  const paths: string[] = []

  for (const [filename, source] of Object.entries(routeSources)) {
    if (filename.split(/[\\/]/).some((part) => part.startsWith('-') || part === '__root.tsx' || part === '__root.ts')) continue
    if (!/\bcomponent\s*:/.test(source) || /\bnoindex\s*:\s*true\b/.test(source)) continue

    const routeId = source.match(/\bcreateFileRoute\(\s*(['"`])([^'"`]+)\1\s*\)/)?.[2]
    if (!routeId || routeId.includes('$') || routeId.split('/').includes('(auth)')) continue

    // A terminal group/pathless segment describes a layout, not a page URL.
    const lastSegment = routeId.split('/').at(-1) || ''
    if (/^\(.+\)$/.test(lastSegment) || lastSegment.startsWith('_')) continue

    const publicPath = routeId.split('/').filter((part) => part && !/^\(.+\)$/.test(part) && !part.startsWith('_')).join('/')
    paths.push(normalizePath(publicPath))
  }

  return uniqueIndexablePaths([...paths, ...publishedPaths])
}

function uniqueIndexablePaths(paths: readonly string[]): string[] {
  return [...new Set(paths.filter((path) => !path.includes('$')).map(normalizePath)
    .filter((path) => !isResourcePath(path) && !/rumpelstiltskin/i.test(path)))].sort()
}

export function renderSitemap(paths: readonly string[]): string {
  const urls = uniqueIndexablePaths(paths).map((path) => {
    const location = normalizeCanonical(path).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')
    return `  <url><loc>${location}</loc></url>`
  }).join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`
}
