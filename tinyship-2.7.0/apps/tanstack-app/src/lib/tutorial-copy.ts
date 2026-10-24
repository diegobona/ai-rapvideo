import { VIDEO_PAYMENT_REQUIRED } from '../../../../config/videoPurchase'

export const tutorialCopy = {
  introBeforeLink: 'Open ',
  introAfterLink: VIDEO_PAYMENT_REQUIRED ? ' and choose your photos. Each video costs $4.99 USD, with no account or subscription required.' : ' and choose your photos. Access is temporarily free, with no payment, account or subscription required.',
  toolLinks: {
    generatorLead: 'These instructions also work on',
    danceLead: 'For details of the movement in the included preset, see',
  },
  steps: [
    {
      id: 'choose-photo',
      heading: '1. Choose your dancer photo',
      paragraphs: [
        'Click "Choose dancer photo" in the "Dancer photo · required" box and select a JPG, PNG, or WebP file up to 10 MB from your device.',
        'Use one person per photo and include as much of the body as possible, including the feet. Check the preview and click "Change photo" if you need a different image.',
      ],
      image: '/images/tutorial/01-choose-photo.png',
      width: 549,
      height: 538,
      alt: 'Maker screenshot showing a selected example dancer photo, the Change photo button and the 10 MB file limit',
      caption: 'Photo selection in the maker, using an illustrative sample image.',
    },
    {
      id: 'choose-dance',
      heading: '2. Use the included dance template',
      paragraphs: [
        'The maker uses one preset: a 10-second dance in a straw corner. The background and dance sequence are already selected.',
        'Keep "Default princess included", or click "Choose princess photo" to replace her with a second JPG, PNG, or WebP file up to 10 MB.',
        'The template uses period costumes, the fixed straw background and measured tiptoe steps.',
      ],
      image: '/images/tutorial/02-dance-setting.png',
      width: 549,
      height: 300,
      alt: 'Maker screenshot showing the included princess, Choose princess photo button and optional photo upload instructions',
      caption: 'Keep the included princess or replace her with your own photo.',
    },
    {
      id: 'generate-video',
      heading: '3. Generate the video',
      paragraphs: [
        VIDEO_PAYMENT_REQUIRED ? 'Tick "I have permission to use the photos I upload." and click "Generate video — $4.99".' : 'Tick "I have permission to use the photos I upload." and click "Generate video".',
        VIDEO_PAYMENT_REQUIRED ? 'In the payment window, select "Pay $4.99 & generate" and complete Stripe checkout. You return to the maker after payment; generation can take a few minutes.' : 'Generation starts directly and can take a few minutes. Your selected photos and expression notes remain in the maker.',
        'The finished preview appears under "Your dance video" when the job completes.',
      ],
      image: '/images/tutorial/03-generate-video.png',
      width: 416,
      height: 648,
      alt: 'Payment window showing the $4.99 USD price, one video and the Pay $4.99 & generate button',
      caption: 'Review the one-time price, then continue to secure Stripe checkout.',
    },
    {
      id: 'download-video',
      heading: '4. Download the MP4',
      paragraphs: [
        'When "Your video is ready." appears, use the preview player to check the clip, then click "Download video" to save the MP4.',
        'Download your video within 24 hours to keep it.',
        'The download is named rumpelstiltskin-ai-dance.mp4; on a phone, look in your browser\'s downloads if it does not open automatically.',
        'If the download fails, try "Download video" again while the result is available. Contact zw83716@gmail.com if the problem continues.',
      ],
      image: '/images/tutorial/04-download-video.png',
      width: 509,
      height: 300,
      alt: 'Maker screenshot showing Your video is ready and the enabled Download video button in a sample completion state',
      caption: 'Download controls in a sample completion state. The screenshot shows the buttons to use when your own video is ready.',
    },
  ],
  problems: {
    heading: 'Common Problems',
    items: [
      {
        question: 'Why is Generate video greyed out?',
        answer: 'Choose a dancer photo and tick the photo-permission checkbox. Changing either reference photo clears that checkbox, so tick it again after making changes. The button also stays disabled while a video is being generated or when generation is unavailable.',
      },
      {
        question: 'What if the video is taking too long?',
        answer: VIDEO_PAYMENT_REQUIRED ? 'Generation can take a few minutes after payment. Return in the same browser to check its progress. Do not pay again to check an existing order. Contact zw83716@gmail.com if generation remains stuck.' : 'Generation can take a few minutes. Return in the same browser to check its progress. Contact zw83716@gmail.com if generation remains stuck.',
      },
      {
        question: 'Why does the face or dance look different from the reference?',
        answer: 'The model generates new motion, so facial details and shot timing can vary. Use a sharp photo with the face and body visible before starting, then preview the finished result before sharing.',
      },
    ],
  },
} as const
