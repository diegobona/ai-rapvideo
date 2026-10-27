/// <reference types="vite/client" />
import { type ReactNode } from 'react'
import { Outlet, createRootRoute, HeadContent, Scripts, useLoaderData } from '@tanstack/react-router'
import { getPublicFeatureFlags } from '@/lib/feature-flags'
import { seoHead } from '@/lib/seo'
import { siteCopy } from '@/lib/site-copy'
import { useTranslation } from '@/hooks/use-translation'
import { SharedAppProvider } from '@libs/react-shared/providers/app-context'
import { ThemeProvider } from '@libs/react-shared/hooks/use-theme'
import { ThemeScript } from '@libs/react-shared/components/theme-script'
import { Toaster } from '@libs/react-shared/ui/sonner'
import { GlobalHeader } from '@/components/global-header'
import { SiteFooter } from '@/components/site-footer'
import { SiteAnalytics } from '@/components/site-analytics'
import { PlausibleAnalytics } from '@/components/plausible-analytics'
import { RapCreditsProvider } from '@/components/rap-credit-provider'
import '../styles.css'

export const Route = createRootRoute({
  ssr: true,
  shouldReload: true,
  loader: async ({ location }) => ({
    ...(await getPublicFeatureFlags()),
    pathname: location.pathname,
  }),
  head: ({ loaderData, matches }) => {
    const pathname = loaderData?.pathname || '/'
    const notFound = matches.length === 1 && pathname !== '/'
    return seoHead({
      title: notFound ? siteCopy.notFound.title : siteCopy.home.title,
      description: notFound ? siteCopy.notFound.description : siteCopy.home.description,
      canonical: pathname,
      ...(notFound ? { noindex: true } : {}),
      document: true,
    })
  },
  component: RootComponent,
  notFoundComponent: NotFoundPage,
})

// Retain the TinyShip feature-flag hook for its existing shared components.
export function useAffiliateEnabled() {
  return useLoaderData({ from: '__root__', select: (data) => data.affiliateEnabled })
}

function RootComponent() {
  const { t, locale } = useTranslation()
  const paymentsEnabled = useLoaderData({ from: '__root__', select: data => data.rapCreditPaymentsEnabled })
  return (
    <RootDocument>
      <SharedAppProvider value={{ t, locale }}>
        <RapCreditsProvider initialEnabled={paymentsEnabled}>
        <GlobalHeader />
        <Outlet />
        <SiteFooter />
        </RapCreditsProvider>
      </SharedAppProvider>
    </RootDocument>
  )
}

function NotFoundPage() {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-3xl flex-col justify-center px-6 py-16">
      <p className="text-sm text-muted-foreground">404</p>
      <h1 className="mt-3 text-3xl font-semibold">{siteCopy.notFound.heading}</h1>
      <p className="mt-4 text-muted-foreground">{siteCopy.notFound.description}</p>
      <a href="/" className="mt-6 w-fit underline underline-offset-4">{siteCopy.notFound.homeLink}</a>
    </main>
  )
}

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
  const plausibleAnalyticsEnabled = useLoaderData({ from: '__root__', select: data => data.plausibleAnalyticsEnabled })
  return (
    <html lang="en" suppressHydrationWarning>
      <head><HeadContent /><ThemeScript /><PlausibleAnalytics enabled={plausibleAnalyticsEnabled} /></head>
      <body className="antialiased">
        <ThemeProvider>{children}<Toaster /></ThemeProvider>
        <Scripts />
        <SiteAnalytics />
      </body>
    </html>
  )
}
