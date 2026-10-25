import { createServerFn } from '@tanstack/react-start'
import type { SocialProvider } from '@libs/react-shared/ui/social-button'

/**
 * Public feature flags resolved from the server runtime.
 *
 * Keeping this server-side lets Workers deployments use the same runtime
 * configuration as every other application, without duplicating a VITE_ flag.
 */
export const getPublicFeatureFlags = createServerFn({ method: 'GET' }).handler(async () => {
  const { config } = await import('@config')

  // Only public availability flags leave the server. Example credentials are not usable.
  const configured = (key: string) => {
    const value = process.env[key]?.trim()
    return Boolean(value && !/^(your[-_ ]|replace|example|placeholder|__BUILD_TIME|xxx|test[-_])/i.test(value) && !/example\.(com|org)/i.test(value))
  }
  const all = (...keys: string[]) => keys.every(configured)
  const socialProviders: SocialProvider[] = []
  if (all('GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET')) socialProviders.push('google')
  if (all('GITHUB_CLIENT_ID', 'GITHUB_CLIENT_SECRET')) socialProviders.push('github')
  if (all('NEXT_PUBLIC_WECHAT_APP_ID', 'WECHAT_APP_SECRET')) socialProviders.push('wechat')
  // The existing Better Auth phone plugin sends through Aliyun.
  if (all('ALIYUN_ACCESS_KEY_ID', 'ALIYUN_ACCESS_KEY_SECRET', 'ALIYUN_SMS_SIGN_NAME', 'ALIYUN_SMS_TEMPLATE_CODE')) socialProviders.push('phone')
  const { authEmailAvailable } = await import('@libs/auth/email-availability')
  const passwordResetEnabled = authEmailAvailable()
  const { rapCreditPaymentsEnabled } = await import('../../../../config/rapCredits')

  return {
    affiliateEnabled: config.affiliate.enabled,
    rapCreditPaymentsEnabled: rapCreditPaymentsEnabled(),
    auth: {
      socialProviders,
      passwordResetEnabled,
      wechatAppId: socialProviders.includes('wechat') ? process.env.NEXT_PUBLIC_WECHAT_APP_ID : undefined,
    },
  }
})
