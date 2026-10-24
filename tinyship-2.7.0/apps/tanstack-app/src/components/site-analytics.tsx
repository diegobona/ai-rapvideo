import { useEffect } from 'react'
import { initializeAnalytics } from '../lib/analytics'

/** One client-only initializer; SSR page content is unaffected. */
export function SiteAnalytics() {
  useEffect(() => { void initializeAnalytics() }, [])
  return null
}
