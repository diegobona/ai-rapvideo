import { pageRegistry } from './page-registry'
import { danceFactSources } from './dance-fact-sources'

export const memeSources = {
  afi: { href: 'https://catalog.afi.com/Film/57804-RUMPELSTILTSKIN', label: 'AFI Catalog' },
  history: danceFactSources.meme,
  reporting: danceFactSources.reporting,
} as const

export const memeArticleCopy = {
  ai: {
    heading: 'Is the Rumpelstiltskin Meme AI?',
    answer: 'Yes. The viral video of an imp-like dancer performing for a frightened woman in a straw-filled setting was generated with AI. Its old-film appearance led viewers to mistake it for footage from the 1987 movie Rumpelstiltskin.',
    explanation: 'That answer applies to this particular viral clip. Rumpelstiltskin is also the title of a real film, so finding a movie listing with that name does not establish where a reposted dance came from. Check the clip’s source before treating a caption such as “Rumpelstiltskin (1987)” as a credit.',
  },
  origin: {
    heading: 'Where the Rumpelstiltskin Meme Came From',
    paragraphs: [
      'The dance was made with AI in the style of an older fantasy film. The muted lighting and film-like texture help explain why viewers looked for a movie credit. The 1987 film is real, but it does not contain this viral performance.',
      'The familiar music edit pairs the dance with Riff Raff’s 2014 song “Tip Toe Wing In My Jawwdinz.” The song was added to the meme; it is not the score from either of the real Rumpelstiltskin films.',
    ],
    more: 'For the cast and film credits that often get mixed into this story, read about',
    link: pageRegistry.movie1987,
  },
  make: {
    heading: 'How to Make Your Own Rumpelstiltskin Meme',
    intro: 'You can make a new version with your own dancer photo. The template requests a 10-second dance sequence with a princess reaction and a footwork detail shot; generated movement and cuts can vary.',
    steps: [
      'Open the maker and select Choose dancer photo. Pick one JPG, PNG or WebP file up to 10 MB showing one person with a clearly visible face; no account is required.',
      'Keep the included princess or select Choose princess photo to replace her. The straw-corner setting and dance sequence are already selected.',
      'Confirm the photo-permission checkbox and select Generate video. Generation can take a few minutes; keep the page open.',
      'Watch the result, then select Download video to save the MP4. Check the face and footwork before sharing it.',
    ],
    timing: 'A new result may differ from the meme’s steps or cut timing.',
    toolLead: 'Start with',
    homeLead: 'The same maker is on',
    guideLead: 'For screenshots of each control, follow',
  },
  faq: {
    heading: 'FAQ',
    items: [
      {
        question: 'Is Billy Barty the dancer in the meme?',
        answer: 'Billy Barty played Rumpelstiltskin in the real 1987 film. The viral AI dancer is a separate character; the movie’s casting credit does not identify him.',
        source: memeSources.afi,
        secondSource: memeSources.reporting,
      },
      {
        question: 'Will my video copy the original dance exactly?',
        answer: 'The maker prompts a shush gesture, a frightened princess reaction and measured tiptoe dancing. AI generation can change the pacing, framing or movement, so preview the result before you download it.',
      },
      {
        question: 'How much does it cost to make a meme video?',
        answer: 'One video costs $4.99 USD through Stripe, with no account or subscription required. Choose your photos, pay before generation, then preview and download the result.',
      },
    ],
  },
} as const

export const movieArticleCopy = {
  scene: {
    heading: 'Is the Viral Dance from the 1987 Film?',
    correction: 'No. The tiptoe dance with the frightened princess is AI-generated. LADBible’s October 6, 2026 report directly addresses the claim that it came from the 1987 Rumpelstiltskin film and explains that the clip imitates the look of 1980s fantasy films.',
    distinction: 'The 1987 film itself does exist. A caption naming it can look like a movie credit, but the name and vintage style do not establish the source of the dance.',
  },
  films: {
    heading: 'The Real 1987 and 1995 Films',
    items: [
      {
        heading: 'The 1987 Rumpelstiltskin Film',
        body: 'The AFI Catalog records a 1987 release directed by David Irving, with Billy Barty as Rumpelstiltskin and Amy Irving as Katie. Those are credits for the real film; Billy Barty’s name does not identify the AI dancer.',
        source: danceFactSources.film1987,
      },
      {
        heading: 'The Rumpelstiltskin Movie from 1995',
        body: 'The 1995 Rumpelstiltskin movie is a separate film directed by Mark Jones, with Max Grodénchik as Rumpelstiltskin and Kim Johnston Ulrich starring. It is another title to check when a search result says only “Rumpelstiltskin movie.”',
        source: danceFactSources.film1995,
      },
    ],
    distinction: 'Neither film supplies the viral AI dance. Their release years and cast lists identify separate productions, not a source scene for this meme.',
  },
  music: {
    heading: 'Where the Tip Toe Music Comes From',
    body: 'The meme pairs the AI dance with Riff Raff’s 2014 song “Tip Toe Wing In My Jawwdinz.” It is music added to the dance edit, not a soundtrack cue from the 1987 or 1995 film.',
    more: 'For an explanation of the AI clip and how to make a new version, read',
    link: pageRegistry.meme,
  },
  make: {
    heading: 'Make Your Own Version',
    intro: 'Use a photo to make your own interpretation of the dance. The maker supplies the straw corner and a default princess; you choose the dancer and can replace the princess with a second photo.',
    expectations: 'The maker requests a 10-second video, delivered as an MP4. Generation can take a few minutes. Preview the character likeness and motion before sharing.',
    toolLead: 'Open',
    guideLead: 'or follow the illustrated guide:',
  },
} as const
