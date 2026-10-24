import { pageRegistry } from './page-registry'

/** Official public pages reviewed 2026-10-14. Render time is never clip length. */
export const generatorComparison = [
  {
    name: pageRegistry.home.anchorText,
    href: pageRegistry.home.path,
    freeAllowance: 'No free generation. $4.99 USD per video.',
    login: 'No login required.',
    speed: 'Generation can take a few minutes.',
    useCase: 'Upload a photo to generate, preview and download a Rumpelstiltskin dance video.',
    source: { href: pageRegistry.videoGenerator.path, label: pageRegistry.videoGenerator.anchorText },
  },
  {
    name: 'MakeViral',
    href: 'https://www.makeviral.ai/templates/ai-rumpelstiltskin-dance',
    freeAllowance: '0 signup credits, according to the pricing page.',
    login: 'Not publicly disclosed.',
    speed: 'Up to several minutes, according to the template page.',
    useCase: 'A dedicated dance template with one-person and two-person modes, plus an original-clip recast option.',
    source: { href: 'https://www.makeviral.ai/pricing', label: 'Official pricing and signup credits' },
  },
  {
    name: 'Rumpel Video (rumpelstiltskinvideo.com)',
    href: 'https://rumpelstiltskinvideo.com/',
    freeAllowance: 'One 4-second, 480p preview after email verification.',
    login: 'Yes; email verification is required for the free preview.',
    speed: 'Not publicly disclosed. The FAQ says timing depends on the queue.',
    useCase: 'A single-photo dance interpretation with portrait or landscape output and selectable duration and quality.',
    source: { href: 'https://rumpelstiltskinvideo.com/', label: 'Official tool, preview policy and FAQ' },
  },
  {
    name: 'Rumpelstiltskin.info',
    href: 'https://rumpelstiltskin.info/',
    freeAllowance: 'Not publicly disclosed. The site says generation uses paid credits.',
    login: 'Yes, before generation.',
    speed: 'Not publicly disclosed. No fixed wait time is promised.',
    useCase: 'Two photos assign the dancer and spectator separately for a preset 15-second performance.',
    source: { href: 'https://rumpelstiltskin.info/', label: 'Official tool, credit details and FAQ' },
  },
  {
    name: 'Rumpelstiltskin-ai.com',
    href: 'https://www.rumpelstiltskin-ai.com/',
    freeAllowance: 'Five low-resolution, muted, watermarked previews per day.',
    login: 'No account for free previews. Full-export login requirements are not publicly disclosed.',
    speed: 'Not publicly disclosed.',
    useCase: 'Preview a preset dancer in your own background. Paid options also offer character replacement and prompt-based scenes.',
    source: { href: 'https://www.rumpelstiltskin-ai.com/', label: 'Official tool and free-preview rules' },
  },
  {
    name: 'Rumpelstiltskin-ai.org',
    href: 'https://rumpelstiltskin-ai.org/',
    freeAllowance: 'Not publicly disclosed. The site describes a pay-per-video service.',
    login: 'Not publicly disclosed.',
    speed: 'Typically 2–4 minutes, according to its FAQ.',
    useCase: 'Two full-body character photos in a preset vintage straw setting, producing a 12-second clip.',
    source: { href: 'https://rumpelstiltskin-ai.org/', label: 'Official tool and generation-time FAQ' },
  },
] as const

export const comparisonCopy = {
  intro: 'The best Rumpelstiltskin AI generators serve different jobs: animating your own character, recasting a familiar clip, or placing a ready-made dancer in another scene. Compare the published trial rules and workflow before choosing where to upload your photo.',
  heading: 'Compare Rumpelstiltskin AI Video Tools',
  method: 'Official public pages reviewed on October 14, 2026. External allowances and timings are the providers’ published claims, not results of our own benchmarks. “Not publicly disclosed” means the linked pages do not give a clear answer. Video length and generation time are different.',
  tableLabel: 'Rumpelstiltskin video generator comparison',
  scrollHint: 'Swipe horizontally to compare all columns.',
  caption: 'Free allowances, account requirements, generation times and use cases',
  columns: ['Tool', 'Free allowance', 'Login required', 'Generation time', 'Best suited to'],
  chooseHeading: 'Choose a Tool for Your Version of the Meme',
  selectionNotes: [
    'For a character-led remake, look for separate dancer and spectator inputs and a motion template that describes the shush gesture, reaction and tiptoe steps. A background-compositing tool serves a different purpose: it places an existing dancer in a scene rather than turning your portrait into the dancer.',
    'Check what a free preview actually includes. A short, low-resolution or watermarked preview is different from a full-resolution export, and free allowances do not establish how closely a tool follows the original choreography. The listed generation times are estimates where published; a busy queue can change the wait.',
  ],
  sitePosition: 'Our tool uses your dancer photo, an optional princess reference and a fixed vintage straw corner with a 10-second dance template. Each video costs $4.99 USD, with no account or subscription required. Open',
  entrySuffix: 'to upload your photo and try the prepared dance sequence.',
} as const
