import { homePage } from './page-registry'

// One English copy source; no locale routes, detection, or language selector.
export const siteCopy = {
  name: 'AI Rap Video',
  home: {
    title: homePage.title,
    description: homePage.description,
    heading: homePage.h1,
  },
  removed: {
    message: 'This page has been permanently removed.',
  },
  notFound: {
    title: 'Page not found | AI Rap Video',
    heading: 'Page not found',
    description: 'The page you are looking for could not be found.',
    homeLink: homePage.anchorText,
  },
} as const
