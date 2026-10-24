import { createFileRoute, redirect } from '@tanstack/react-router'
import { pageRegistry } from '@/lib/page-registry'

export const Route = createFileRoute('/1987-rumpelstiltskin')({
  ssr: true,
  beforeLoad: ({ location }) => {
    throw redirect({ href: `${pageRegistry.movie1987.path}${location.searchStr}`, statusCode: 301 })
  },
})
