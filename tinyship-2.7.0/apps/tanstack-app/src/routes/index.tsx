import { createFileRoute } from '@tanstack/react-router'
import { seoHead } from '@/lib/seo'
import { siteCopy } from '@/lib/site-copy'
import { DanceMaker } from '@/components/dance-maker'
import { HomeContent } from '@/components/home-content'
import { homeCopy } from '@/lib/home-copy'
import { getDanceServiceState } from '@/lib/dance-service'
import '../home.css'

export const Route = createFileRoute('/')({
  ssr: true,
  loader: () => getDanceServiceState(),
  head: () => seoHead({
    title: siteCopy.home.title,
    description: siteCopy.home.description,
    canonical: '/',
  }),
  component: HomePage,
})

function HomePage() {
  const { isAvailable } = Route.useLoaderData()
  return (
    <main className="home-page motion-home">
      <h1 className="home-title">{siteCopy.home.heading}</h1>
      <DanceMaker copy={homeCopy.tool} isAvailable={isAvailable} className="home-maker" />
      <HomeContent />
    </main>
  )
}
