import { createFileRoute } from '@tanstack/react-router'
import { seoHead } from '@/lib/seo'
import { siteCopy } from '@/lib/site-copy'
import { DanceMaker } from '@/components/dance-maker'
import { HomeContent } from '@/components/home-content'
import { homeCopy } from '@/lib/home-copy'
import { getDanceServiceState } from '@/lib/dance-service'
import { homeStructuredData } from '@/lib/home-structured-data'
import '../editorial-home.css'

export const Route = createFileRoute('/')({
  ssr: true,
  loader: () => getDanceServiceState(),
  head: () => seoHead({
      title: siteCopy.home.title,
      description: siteCopy.home.description,
      canonical: '/',
      og: { image: homeCopy.share.image, imageAlt: homeCopy.share.imageAlt, imageWidth: 1200, imageHeight: 630 },
      twitter: true,
      structuredData: homeStructuredData(),
  }),
  component: HomePage,
})

function HomePage() {
  const { isAvailable } = Route.useLoaderData()
  const headingWords = siteCopy.home.heading.split(' ')
  const lastWord = headingWords.pop()
  return (
    <main className="editorial-home">
      <section className="home-hero" aria-labelledby="home-title">
        <div><p className="home-eyebrow">{homeCopy.presentation.eyebrow}</p><h1 id="home-title" className="home-title">{headingWords.join(' ')}{' '}<em>{lastWord}</em></h1></div>
        <div className="home-hero-copy"><p className="home-subtitle">{homeCopy.subtitle}</p><p className="home-hero-note">{homeCopy.presentation.previewNote}</p></div>
      </section>
      <DanceMaker isAvailable={isAvailable} className="home-maker" />
      <HomeContent />
    </main>
  )
}
