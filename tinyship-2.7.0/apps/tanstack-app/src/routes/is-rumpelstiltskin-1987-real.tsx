import { createFileRoute } from '@tanstack/react-router'
import { MovieArticle } from '@/components/meme-articles'
import { pageRegistry } from '@/lib/page-registry'
import { seoHead } from '@/lib/seo'
import '../home.css'
import '../article-pages.css'

const page = pageRegistry.movie1987

export const Route = createFileRoute('/is-rumpelstiltskin-1987-real')({
  ssr: true,
  head: () => seoHead({ title: page.title, description: page.description, canonical: page.path, og: { type: 'article' } }),
  component: MoviePage,
})

function MoviePage() {
  return <main className="home-page article-page"><article><h1 className="home-title">{page.h1}</h1><MovieArticle /></article></main>
}
