import type { PostHog, PostHogConfig } from 'posthog-js'
import { SITE_ORIGIN } from './site'

/** Public project token only; personal PostHog API keys must never go here. */
export const analyticsConfig = {
  projectToken: import.meta.env.VITE_POSTHOG_PROJECT_TOKEN || '',
  apiHost: import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com',
} as const

const attributionParameters = new Set(['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'ref', 'source'])

/** Keep attribution tags, but never transmit unrelated query values or hashes. */
function pageUrl(value: string): string {
  try {
    const url = new URL(value)
    for (const key of [...url.searchParams.keys()]) {
      if (!attributionParameters.has(key)) url.searchParams.delete(key)
    }
    url.hash = ''
    return url.href
  } catch { return '' }
}

export const analyticsOptions: Partial<PostHogConfig> = {
  defaults: '2026-05-30',
  capture_pageview: true,
  capture_pageleave: false,
  autocapture: false,
  person_profiles: 'never',
  persistence: 'localStorage',
  disable_session_recording: true,
  disable_surveys: true,
  advanced_disable_flags: true,
  capture_performance: false,
  capture_exceptions: false,
  capture_dead_clicks: false,
  before_send: event => {
    if (!event || event.event !== '$pageview') return null
    for (const key of ['$current_url', '$initial_current_url', '$session_entry_url']) {
      if (typeof event.properties[key] === 'string') event.properties[key] = pageUrl(event.properties[key])
    }
    for (const key of ['$referrer', '$initial_referrer', '$session_entry_referrer']) {
      const value = event.properties[key]
      if (typeof value === 'string' && /^https?:\/\//.test(value)) {
        try { event.properties[key] = new URL(value).origin } catch { delete event.properties[key] }
      }
    }
    return event
  },
}

let client: Promise<PostHog | undefined> | undefined

/** Import only after hydration, once, and only on the production website. */
export function initializeAnalytics(): Promise<PostHog | undefined> {
  if (typeof window === 'undefined' || window.location.origin !== SITE_ORIGIN || !analyticsConfig.projectToken) {
    return Promise.resolve(undefined)
  }
  client ??= import('posthog-js/no-external').then(({ default: posthog }) => {
    posthog.init(analyticsConfig.projectToken, { ...analyticsOptions, api_host: analyticsConfig.apiHost })
    return posthog
  }).catch(() => undefined)
  return client
}
