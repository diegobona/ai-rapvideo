import { config } from '@config'

/** Exposes availability only; credentials remain on the server. */
export function authEmailAvailable() {
  const configured = (key: string) => {
    const value = process.env[key]?.trim()
    return Boolean(value && !/^(your[-_ ]|replace|example|placeholder|__BUILD_TIME|xxx|test[-_])/i.test(value) && !/example\.(com|org)/i.test(value))
  }
  const provider: string = config.email.defaultProvider
  return configured('EMAIL_DEFAULT_FROM') && (provider === 'resend'
    ? configured('RESEND_API_KEY')
    : provider === 'cloudflare' && configured('CLOUDFLARE_ACCOUNT_ID') && configured('CLOUDFLARE_API_TOKEN'))
}
