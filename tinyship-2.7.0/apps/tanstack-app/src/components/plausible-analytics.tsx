import { getPlausibleScriptUrl, PLAUSIBLE_SCRIPT_ID, plausibleAnalyticsBootstrap } from '@/lib/plausible-analytics'

/** Emit the official bootstrap and async script in the server-rendered head. */
export function PlausibleAnalytics({ enabled }: Readonly<{ enabled: boolean }>) {
  const scriptUrl = getPlausibleScriptUrl()
  if (!enabled || !scriptUrl) return null

  return (
    <>
      <script id={`${PLAUSIBLE_SCRIPT_ID}-init`} dangerouslySetInnerHTML={{ __html: plausibleAnalyticsBootstrap }} />
      <script id={PLAUSIBLE_SCRIPT_ID} async src={scriptUrl} />
    </>
  )
}
