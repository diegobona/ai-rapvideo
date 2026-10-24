/** Metadata for active public pages. */
function page(path: string, anchorText: string, targetKeyword: string, description: string, category: string) {
  return { path, href: path, targetKeyword, anchorText, title: anchorText, h1: anchorText, description, category } as const
}

export const pageRegistry = {
  home: {
    ...page('/', 'AI Rap Video', 'ai rap video', '', 'Home'),
    title: 'AI Rap Video Generator – Make an AI Rap Video From Two Photos',
    h1: 'AI Rap Video Generator',
    description: 'Create an AI rap video from two photos. Choose a scene, add your topic and generate a 12-second rap video with a beat. Free to use. No account required.',
  },
} as const

export const homePage = pageRegistry.home

/** Planned navigation targets enter the sitemap only after a page route exists. */
export function registeredSitemapPaths(activePaths: readonly string[]): string[] {
  const active = new Set(activePaths)
  const registered = Object.values(pageRegistry).map((entry) => entry.path)
  return [...registered.filter((path) => active.has(path)), ...activePaths.filter((path) => !registered.includes(path))]
}
