import { homePage } from './page-registry'

// One English copy source; no locale routes, detection, or language selector.
export const siteCopy = {
  name: 'Rumpelstiltskin AI',
  home: {
    title: homePage.title,
    description: homePage.description,
    heading: homePage.h1,
  },
  notFound: {
    title: 'Page not found | Rumpelstiltskin AI',
    heading: 'Page not found',
    description: 'The page you are looking for could not be found.',
    homeLink: homePage.anchorText,
  },
} as const
