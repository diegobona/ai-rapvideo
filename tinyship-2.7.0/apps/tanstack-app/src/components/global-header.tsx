import { siteCopy } from '@/lib/site-copy'
import { GoogleSignin } from './google-signin'

export function GlobalHeader() {
  return (
    <header className="border-b">
      <nav aria-label="Main navigation" className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-6 py-5">
        <a href="/" className="font-semibold">{siteCopy.name}</a>
        <div className="site-nav-links flex items-center gap-4 text-sm">
          <a href="/#how-to-make">{siteCopy.navigation.howItWorks}</a>
          <a href="/#pricing">{siteCopy.navigation.pricing}</a>
          <GoogleSignin />
        </div>
      </nav>
    </header>
  )
}
