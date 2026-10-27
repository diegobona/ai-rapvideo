import { siteCopy } from '@/lib/site-copy'
import { GoogleSignin } from './google-signin'
import { EmailAuthDialog } from './email-auth-dialog'

export function GlobalHeader() {
  return (
    <header className="site-header border-b">
      <nav aria-label="Main navigation" className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-6 py-5">
        <a href="/" className="site-brand font-semibold"><img className="site-brand-mark" src="/logo.svg?v=wave1" width={22} height={25} alt="" aria-hidden="true" />{siteCopy.name}</a>
        <div className="site-nav-links flex items-center gap-4 text-sm">
          <a href="/#how-to-make">{siteCopy.navigation.howItWorks}</a>
          <a href="/#pricing">{siteCopy.navigation.pricing}</a>
          <GoogleSignin accountOnly />
          <EmailAuthDialog />
        </div>
      </nav>
    </header>
  )
}
