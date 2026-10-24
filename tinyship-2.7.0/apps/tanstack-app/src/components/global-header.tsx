import { siteCopy } from '@/lib/site-copy'

export function GlobalHeader() {
  return (
    <header className="border-b">
      <nav aria-label="Main navigation" className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-6 py-5">
        <a href="/" className="font-semibold">{siteCopy.name}</a>
      </nav>
    </header>
  )
}
