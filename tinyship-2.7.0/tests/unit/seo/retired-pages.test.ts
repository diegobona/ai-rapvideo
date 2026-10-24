import { describe, expect, it } from 'vitest'
import { retiredPageResponse } from '../../../apps/tanstack-app/src/lib/retired-pages'
import { seoHead } from '../../../apps/tanstack-app/src/lib/seo'

const retiredPaths = [
  '/1987-rumpelstiltskin',
  '/best-rumpelstiltskin-ai-generators',
  '/how-to-make-rumpelstiltskin-ai-video',
  '/is-rumpelstiltskin-1987-real',
  '/rumpelstiltskin-ai-video-generator',
  '/rumpelstiltskin-dance-video',
  '/rumpelstiltskin-meme',
]

describe('retired legacy pages', () => {
  for (const path of retiredPaths) {
    it(`${path} returns 410 and noindex without a redirect`, async () => {
      for (const url of [`https://ai-rapvideo.co${path}`, `https://www.ai-rapvideo.co${path}/?ref=test`]) {
        const response = retiredPageResponse(new Request(url))
        expect(response?.status).toBe(410)
        expect(response?.headers.get('Location')).toBeNull()
        expect(response?.headers.get('X-Robots-Tag')).toBe('noindex, follow')
        expect(await response?.text()).toContain('permanently removed')
      }
      const head = retiredPageResponse(new Request(`https://ai-rapvideo.co${path}`, { method: 'HEAD' }))
      expect(head?.status).toBe(410)
      expect(await head?.text()).toBe('')
      expect(seoHead({ title: 'Legacy page', description: 'Legacy content', canonical: path }).meta)
        .toContainEqual({ name: 'robots', content: 'noindex, follow' })
    })
  }

  it('leaves the homepage, sitemap, APIs and future pages to their existing handlers', () => {
    for (const path of ['/', '/sitemap.xml', '/robots.txt', '/rap-video-guide', '/api/video-generate/', '/api/rumpelstiltskin-meme']) {
      expect(retiredPageResponse(new Request(`https://ai-rapvideo.co${path}`))).toBeNull()
    }
  })
})
