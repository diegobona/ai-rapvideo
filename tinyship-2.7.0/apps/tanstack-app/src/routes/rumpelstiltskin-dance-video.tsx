import { createFileRoute } from '@tanstack/react-router'
import { DanceMaker } from '@/components/dance-maker'
import { DanceVideoContent } from '@/components/tool-page-content'
import { getDanceServiceState } from '@/lib/dance-service'
import { homeCopy } from '@/lib/home-copy'
import { pageRegistry } from '@/lib/page-registry'
import { seoHead } from '@/lib/seo'
import '../home.css'
import '../tool-pages.css'

const page = pageRegistry.danceVideo

export const Route = createFileRoute('/rumpelstiltskin-dance-video')({
  ssr: true,
  loader: () => getDanceServiceState(),
  head: () => seoHead({ title: page.title, description: page.description, canonical: page.path }),
  component: DanceVideoPage,
})

function DanceVideoPage() {
  const { isAvailable } = Route.useLoaderData()
  return (
    <main className="home-page tool-page dance-page">
      <h1 className="home-title">{page.h1}</h1>
      <DanceMaker copy={homeCopy.tool} isAvailable={isAvailable} className="home-maker" />
      <DanceVideoContent />
    </main>
  )
}
