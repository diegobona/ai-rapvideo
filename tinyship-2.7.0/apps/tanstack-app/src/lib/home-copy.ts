// English homepage copy is rendered on the server and shared with the maker.
import { danceExamples } from './dance-examples'

export const homeCopy = {
  presentation: {
    eyebrow: 'Two faces. One unforgettable verse.',
    previewNote: 'Start with a free 3-second preview',
    examplesHeading: 'A little inspiration.',
    examplesNote: 'Different people. Same main-character energy.',
    previewPricing: {
      label: 'The first impression',
      price: 'Free',
      title: '3-second preview',
      description: 'Your photos, voices, and scene. One free preview per public IP address, with no account or payment required.',
      action: 'Create free preview',
    },
  },
  subtitle: 'Turn two photos into an AI rap video with original verses and a beat.',
  share: {
    image: 'https://ai-rapvideo.co/images/examples/rap-orange-studio.jpg',
    imageAlt: 'Two rappers performing together at a hanging microphone in a bright orange studio.',
  },
  intro: 'Try a free 3-second AI rap video preview from two photos. Choose a scene and topic, then generate and download. One preview per public IP address, with no account required.',
  how: {
    heading: 'How to Make an AI Rap Video',
    steps: [
      {
        title: 'Upload the first portrait',
        body: 'Upload a clear portrait of your first performer, or upload one photo of both people to split automatically. Choose a JPG, PNG, or WebP up to 20 MB.',
        image: '/images/rap/step-person-1.png',
        alt: 'AI-generated illustration of a first performer portrait with an upload arrow',
      },
      {
        title: 'Add the second portrait',
        body: 'Add your second portrait, or check the two portraits automatically cropped from your joint photo. Use the arrows to swap the people if needed.',
        image: '/images/rap/step-person-2.png',
        alt: 'AI-generated illustration of two separate performer portrait uploads',
      },
      {
        title: 'Generate your rap video',
        body: 'Choose a stage, optionally add a topic, then generate your free 3-second preview.',
        image: '/images/rap/step-generate.png',
        alt: 'AI-generated illustration of two rappers performing into a studio microphone during video generation',
      },
      {
        title: 'Download and share',
        body: 'Play your finished clip, then download the MP4 within 24 hours to save and share your rap video.',
        image: '/images/rap/step-download.png',
        alt: 'AI-generated illustration of a finished rap duo video on a phone with a download arrow',
      },
    ],
  },
  pricing: {
    heading: 'Pricing',
    availability: 'One-time payment',
    price: '$8.90',
    pack: '1 credit',
    detail: 'Generate one full 12-second AI rap video',
    note: 'One credit generates one full 12-second video. Generation failures receive a full refund to the original payment method.',
  },
  editorial: {
    whatIs: {
      heading: 'What Is an AI Rap Video?',
      body: 'An AI rap video is a short visual performance combining recognizable people, rap delivery, and a beat. Two uploaded portraits provide the people for a shared scene. An AI rap song focuses on audio and may run for a whole song; a rap video adds faces, gestures, framing, and a setting. It differs from an AI face-swap dance video: the focus is a rap performance, rather than placing a face onto a dancing character. Preview the examples to choose a look.',
    },
    audience: {
      heading: 'Who It Is For',
      paragraphs: [
        'A birthday rap video turns two familiar faces into a greeting you can send in a group chat. Pair the birthday person with a friend, partner, or sibling. The same idea works for anniversaries: share a short performance that feels personal, then keep a downloaded copy with your celebration photos.',
        'Try a personalized diss track video for a friendly roast between people who are in on the joke. Pick two photos, keep the mood playful, and share the result privately before posting it. Use photos with permission, and let your friend decide whether the clip belongs in the group chat.',
        'Make a two person rap video for your duo account, shared project, or weekend recap. The fixed portrait format suits TikTok and Reels, where a tall frame works well for phone viewing. Check that both faces stay clear in the preview, then save the MP4 before posting from your own account.',
      ],
    },
    twoPhotos: {
      heading: 'Why Two Photos',
      body: 'Two portraits place both people in one performance. A single-person template centers one face; a duo shares the scene and attention. Upload separate, clear portraits, or let us crop one photo of both people into two individual reference images.',
    },
  },
  examples: danceExamples,
  examplesHeading: 'AI Rap Video Examples',
  faq: {
    heading: 'AI Rap Video FAQ',
    items: [
      {
        question: 'What is AI Rap Video?',
        answer: 'Upload two portraits, choose a stage and optionally add a topic. Generate a free 3-second preview of the opening rap bar with both people in the scene and a beat.',
        source: null,
      },
      {
        question: 'How much does it cost, and is there a subscription?',
        answer: 'Each public IP address gets one free 3-second preview without an account. Switching browsers or clearing cookies does not reset it, and shared networks share the allowance. For full videos, sign in and buy a $8.90 USD pack containing one video credit. One credit generates one complete 12-second rap video. There is no subscription.',
        source: null,
      },
      {
        question: 'What happens if generation fails?',
        answer: 'If the provider confirms that a free preview failed, its allowance is restored. If a full video funded by a purchased credit fails, the full $8.90 is refunded to the original payment method and that credit is invalidated. Pending or uncertain requests remain reserved while their status is checked; refreshing does not spend another credit.',
        source: null,
      },
      {
        question: 'Do I need to upload both photos?',
        answer: 'Both people are required. Upload two individual portraits, or upload one photo containing exactly two people and we automatically crop it into Person 1 and Person 2. There is no default second person. Choose clear faces in JPG, PNG, or WebP images, up to 20 MB each.',
        source: null,
      },
      {
        question: 'What format will my video use?',
        answer: 'Videos are portrait MP4 files with rap vocals and a beat, using one of four stages. The free preview is 3 seconds; a purchased video credit generates the complete 12-second performance. Download your finished video within 24 hours.',
        source: null,
      },
      {
        question: 'How are my photos and videos handled?',
        answer: 'Stored on Cloudflare. Automatic deletion is scheduled after 24 hours. Download your video within 24 hours to keep it.',
        source: null,
      },
      {
        question: 'Can I use the result commercially?',
        answer: 'Check the rights needed for your intended use, including permission for the photos, people and music. AI results do not carry guaranteed exclusive rights.',
        source: null,
      },
    ],
  },
  related: {
    heading: 'Explore AI Rap Video',
    items: [
      { category: 'Create', href: '#rap-maker', anchorText: 'AI Rap Video Generator', description: 'Upload two portraits and make your own AI rap video.' },
      { category: 'Guide', href: '#how-to-make', anchorText: 'How to Make an AI Rap Video', description: 'Follow four steps from choosing photos to downloading your clip.' },
      { category: 'Help', href: '#video-faq', anchorText: 'AI Rap Video FAQ', description: 'Check photo requirements, generation settings and automatic file deletion.' },
    ],
  },
} as const
