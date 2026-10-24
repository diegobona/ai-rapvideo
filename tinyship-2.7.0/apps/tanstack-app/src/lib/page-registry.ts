/** The shared source for page metadata, home navigation and sitemap URLs. */
function page(path: string, anchorText: string, targetKeyword: string, description: string, category: string) {
  return { path, href: path, targetKeyword, anchorText, title: anchorText, h1: anchorText, description, category } as const
}

export const pageRegistry = {
  home: {
    ...page('/', 'Rumpelstiltskin AI', 'rumpelstiltskin ai', '', 'Home'),
    title: 'Rumpelstiltskin AI - Turn a Photo Into a Dance Video',
    h1: 'Rumpelstiltskin AI Video Maker',
    description: 'Create a Rumpelstiltskin AI dance video from one photo for $4.99 USD. No account or subscription required. Preview and download your video.',
  },
  videoGenerator: {
    ...page(
    '/rumpelstiltskin-ai-video-generator', 'Rumpelstiltskin AI Video Generator', 'rumpelstiltskin ai video generator',
    'Rumpelstiltskin AI video generator: create a dance video from one photo for $4.99 USD. No account or subscription required. Preview and download the MP4.', 'Video generators',
    ),
    title: 'Rumpelstiltskin AI Video Generator - Make a Dance Video From One Photo',
  },
  danceVideo: {
    ...page(
    '/rumpelstiltskin-dance-video', 'Rumpelstiltskin Dance Video Generator', 'rumpelstiltskin ai dance video generator',
    'Make a Rumpelstiltskin tip toe dance video from your photo for $4.99 USD. No account or subscription required. Create your own 10-second dance clip.', 'Video generators',
    ),
    title: 'Rumpelstiltskin Dance Video Generator - Recreate the Tip Toe Dance',
  },
  bestGenerators: {
    ...page(
    '/best-rumpelstiltskin-ai-generators', 'Best Rumpelstiltskin AI Generators', 'best rumpelstiltskin ai generators',
    'Compare Rumpelstiltskin AI generators by free allowances, sign-in requirements, generation times and use cases.', 'Compare tools',
    ),
    title: 'Best Rumpelstiltskin AI Generators (Compared)',
  },
  meme: {
    ...page(
    '/rumpelstiltskin-meme', 'Rumpelstiltskin Meme', 'rumpelstiltskin meme',
    'The Rumpelstiltskin meme is AI-generated. Learn about its origins, the Tip Toe music and how to create your own dance video from a photo.', 'Meme and movie',
    ),
    title: 'Rumpelstiltskin Meme - Is It AI? How to Make Your Own',
    h1: 'The Rumpelstiltskin Meme',
  },
  howTo: {
    ...page(
    '/how-to-make-rumpelstiltskin-ai-video', 'How to Make a Rumpelstiltskin AI Video', 'how to make rumpelstiltskin ai video',
    'Make a Rumpelstiltskin AI video in four steps: upload your photo, use the dance template, generate a 10-second clip and download the MP4.', 'Guides',
    ),
    title: 'How to Make a Rumpelstiltskin AI Video (Step by Step)',
  },
  movie1987: {
    ...page(
    '/is-rumpelstiltskin-1987-real', '1987 Rumpelstiltskin', 'is rumpelstiltskin 1987 real',
    'The 1987 Rumpelstiltskin film is real, but the viral dance is AI-generated. Check the facts about the meme, its music, and the separate 1995 movie.', 'Meme and movie',
    ),
    title: 'Is Rumpelstiltskin 1987 Real? The AI Meme Explained',
    h1: 'Is Rumpelstiltskin 1987 Real?',
  },
} as const

export const homePage = pageRegistry.home
export const moreAiVideoTools = [
  pageRegistry.videoGenerator,
  pageRegistry.danceVideo,
  pageRegistry.bestGenerators,
  pageRegistry.meme,
  pageRegistry.howTo,
  pageRegistry.movie1987,
] as const

/** Planned navigation targets enter the sitemap only after a page route exists. */
export function registeredSitemapPaths(activePaths: readonly string[]): string[] {
  const active = new Set(activePaths)
  const registered = Object.values(pageRegistry).map((entry) => entry.path)
  return [...registered.filter((path) => active.has(path)), ...activePaths.filter((path) => !registered.includes(path))]
}
