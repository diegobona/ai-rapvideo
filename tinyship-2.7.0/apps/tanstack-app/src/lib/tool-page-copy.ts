import { VIDEO_PAYMENT_REQUIRED } from '../../../../config/videoPurchase'

/** English copy for the two public tool routes; rendered in the initial HTML. */
export const toolPageCopy = {
  videoGenerator: {
    intro: VIDEO_PAYMENT_REQUIRED
      ? 'The Rumpelstiltskin AI video generator uses one person’s photo and a prepared dance template to create a new video. Upload the dancer, keep the included princess or add her photo, then pay $4.99 USD for one video. No account or subscription is required. Generation can take a few minutes.'
      : 'Turn your photo into a Rumpelstiltskin dance. Choose your dancer, keep the included princess or add her photo, then select Generate video. Access is temporarily free, with no account or subscription required.',
    links: {
      danceLead: 'For a closer look at the steps and posture, see',
      guideLead: 'For screenshots of the upload and download controls, follow',
    },
    how: {
      heading: 'How the Generator Works',
      steps: [
        { title: 'Upload your photo', body: 'Select Choose dancer photo and add one JPG, PNG or WebP of the person you want to animate.' },
        { title: VIDEO_PAYMENT_REQUIRED ? 'Pay and generate' : 'Generate your video', body: VIDEO_PAYMENT_REQUIRED ? 'Confirm permission to use your photos and select Generate video — $4.99. Review the price, complete Stripe checkout and return to the maker.' : 'Confirm permission to use your photos and select Generate video. Your video starts directly; it can take a few minutes.' },
        { title: 'Preview the result', body: 'Play the finished video and check the face, movement and framing.' },
        { title: 'Download the MP4', body: 'Select Download video within 24 hours to keep the finished file on your device.' },
      ],
    },
    output: {
      heading: 'What You Get',
      parameterLabel: 'Parameter',
      valueLabel: 'Output',
      note: 'These are the maker’s current download settings. The video service determines the final pixel dimensions and can add a few frames beyond the requested duration.',
    },
    demo: {
      title: 'Rumpelstiltskin AI Video Generator Demo',
      description: 'A Rumpelstiltskin AI video generator sample showing a character dancing in a straw-filled scene.',
      note: 'Earlier generated example, presented in portrait format. Current downloads use landscape framing; motion and character likeness vary between results.',
      video: '/videos/rumpelstiltskin-ai-generator-demo.mp4',
      cover: '/images/dance/generator-demo-cover.jpg',
      alt: 'Cover of a generated Rumpelstiltskin AI video showing a dancer in a dark formal outfit and a seated blonde princess beside straw',
      coverLabel: 'Demo cover',
      fallback: 'Download the demo MP4',
    },
    photos: {
      heading: 'Which Photo Works Best',
      intro: 'Use one clearly visible person. A face looking toward the camera gives the model a useful identity reference, and a full-body photo leaves more information for the feet and posture.',
      requirements: [
        'Keep the face sharp and unobstructed; avoid sunglasses, masks and motion blur.',
        'Choose even, bright lighting so the facial features are visible.',
        'Use a single-person image and keep the shoes in frame where possible.',
        'Prefer the unfiltered photo over a heavily smoothed or distorted version.',
      ],
      limits: 'The upload accepts JPG, PNG and WebP files up to 10 MB. Pet and cartoon images can pass the file checks, but their results have not been verified with this human-dancer template. Group photos have no subject-selection control; crop the photo to one person before uploading.',
    },
    pricing: {
      heading: VIDEO_PAYMENT_REQUIRED ? 'Pricing and Refunds' : 'Free Access',
      paragraphs: VIDEO_PAYMENT_REQUIRED ? [
        'Each video costs $4.99 USD, paid through Stripe before generation. No account, subscription or recurring payment is required.',
        'A confirmed technical generation failure triggers a full refund to your original payment method. Temporary status-check errors do not trigger a new charge or a refund while the video may still be processing.',
        'A completed video can differ from your reference photos or the intended motion. Review the examples before purchasing. Each additional video is a new $4.99 purchase; contact zw83716@gmail.com for payment or result problems.',
      ] : ['Access is temporarily free. No payment or subscription is required.', 'After your current video finishes, you can choose photos and generate another. Contact zw83716@gmail.com if you need help with a result or an earlier paid order.'],
    },
    troubleshooting: {
      heading: 'Troubleshooting',
      items: [
        { title: 'Generation failed', body: VIDEO_PAYMENT_REQUIRED ? 'A confirmed generation failure triggers a full refund. Return to the same browser to check your video or refund status. Contact zw83716@gmail.com if generation or a refund remains stuck.' : 'Check the displayed reason and try again. Your selected photos and expression notes stay in the maker. Contact zw83716@gmail.com if the problem continues.' },
        { title: 'Photo rejected', body: 'Export the image as JPG, PNG or WebP and keep it at or below 10 MB, then select it again. Renaming a file extension does not convert its format; the upload checks the file type and extension.' },
        { title: 'Download does not work', body: 'Try Download video again while the result link is active. If it still fails or the link has expired, email zw83716@gmail.com with the approximate generation time.' },
      ],
    },
    faq: {
      heading: 'FAQ',
      items: [
        {
          question: 'What are the photo requirements?',
          answer: 'Choose a JPG, PNG or WebP up to 10 MB with one person, a clear face and good light. A full-body photo helps show the feet. Use the separate princess field if you want to choose that character too.',
        },
        {
          question: 'What are the output specifications?',
          answer: 'Choose landscape or portrait for your 10-second, 768p MP4. Exact pixel dimensions and the final frame count are set by the video service. The file can contain generated sound, but the Tip Toe song is not added.',
        },
        {
          question: 'How long does generation take?',
          answer: 'Generation can take a few minutes. Keep the page open until your video appears.',
        },
        {
          question: 'Can I use someone else’s photo?',
          answer: 'Use another person’s photo only with permission to use the image and depict that person in the generated video. The permission checkbox applies to both the dancer photo and any princess photo you upload.',
        },
        {
          question: 'Can I make more than one video?',
          answer: VIDEO_PAYMENT_REQUIRED ? 'Yes. Each new video costs $4.99 USD. You can choose photos and buy another video after your current generation finishes. Refreshing or checking the same paid order does not charge you again.' : 'Yes. After your current video finishes, you can generate another. Access is temporarily free.',
        },
      ],
    },
    relatedHeading: 'Related Pages',
  },
  danceVideo: {
    intro: 'This rumpelstiltskin ai dance video generator uses your photo with a 10-second template: a shush, a princess reaction, and measured sideways steps. The template places the dancer in a compact straw corner and includes a closer shot of the feet; generated motion and cuts can vary. ' + (VIDEO_PAYMENT_REQUIRED ? 'Each video costs $4.99 USD with no account or subscription required; the Tip Toe song is not included.' : 'Access is temporarily free, with no account or subscription required. The Tip Toe song is not included.'),
    links: {
      generatorLead: 'You can also use the same maker on',
      guideLead: 'If you need help with a control, the screenshots in',
      guideEnd: 'show each step from choosing a photo to saving the MP4.',
      homeLead: 'The homepage maker is at',
      memeLead: 'For the story behind the AI dance and its music, read',
    },
    appearance: {
      heading: 'What the Dance Looks Like',
      intro: 'The template sets out the sequence below. Times are targets for the generated shots; the exact movements and cuts can vary. The princess reaction sits between the opening gesture and the first dance step, at 1.8–3.0 seconds.',
      actions: [
        {
          title: 'The Shush Gesture',
          timing: '0.0–1.8 seconds · 1.8 seconds',
          body: 'Facing the seated princess at frame-right, the dancer leans forward and brings one index finger to his lips. His feet stay still while he holds a sly expression. This quiet opening gives a secret or a “keep this between us” caption time to land.',
        },
        {
          title: 'The Tip Toe Step',
          timing: '3.0–6.5 seconds · 3.5 seconds',
          body: 'The dancer begins small lateral tiptoe steps with bent knees, raised heels and a slight forward lean. Weight passes clearly from one foot to the other; bent elbows and outward forearms accompany a gentle shoulder bounce. The pace is measured, giving a joke about sneaking away or celebrating a small win room to read.',
        },
        {
          title: 'The Footwork Close-Up',
          timing: '6.5–8.2 seconds · 1.7 seconds',
          body: 'A closer view follows the same sideways steps: alternating foot placement, knees flexed and heels slightly lifted. The frame concentrates on the lower body, with no kicks, jumps or stomps. Use this beat when the joke depends on the shoes or stepping rhythm, and keep captions away from the feet.',
        },
        {
          title: 'The Small Finishing Pose',
          timing: '8.2–10.0 seconds · 1.8 seconds',
          body: 'Back in the medium shot, the dancer continues the lateral steps and gentle shoulder bounce at the same tempo, then settles into a small playful pose with a pleased grin. The arms stay part of the compact movement, without a big flourish. This gives a short victory caption a quiet ending.',
        },
      ],
    },
    how: {
      heading: 'How the Dance Video Is Made',
      steps: [
        { title: 'Upload your photo', body: 'Select Choose dancer photo and add one JPG, PNG or WebP up to 10 MB. Keep the included princess or upload her photo too.' },
        { title: VIDEO_PAYMENT_REQUIRED ? 'Pay and generate' : 'Generate your video', body: VIDEO_PAYMENT_REQUIRED ? 'Tick the photo-permission checkbox and select Generate video — $4.99. Review the price and complete Stripe checkout. Your dance starts after payment is confirmed.' : 'Tick the photo-permission checkbox and select Generate video. Your dance starts directly; wait for the finished preview.' },
        { title: 'Preview the result', body: 'Play the finished clip in Your Dance Video. Check the face, the princess reaction and the stepping rhythm before saving.' },
        { title: 'Download the MP4', body: 'Select Download video to save the 10-second MP4. Add a sound in TikTok if you want music with the dance.' },
      ],
    },
    sound: {
      heading: 'Adding the Tip Toe Sound on TikTok',
      intro: 'Your download may contain generated sound, but it does not include the Tip Toe song. The meme is commonly paired with Riff Raff’s 2014 song “Tip Toe Wing In My Jawwdinz”; that pairing is a music edit, not a film score.',
      steps: [
        'Save your MP4, open TikTok and tap +. Choose Upload and select the saved dance video.',
        'Open Add sound (called Sounds in some versions). Search for Tip Toe Wing In My Jawwdinz and check that the artist is Riff Raff before selecting an available result.',
        'Preview the sound with your video. If your editor offers trimming, adjust the sound’s start point to suit the first dance step, which the template places around three seconds in.',
        'Watch the full ten seconds before posting. Keep the shush and princess reaction at the start so the dance has its setup.',
      ],
      note: 'If you want only the song, mute the generated sound in your video editor before uploading. If the track is unavailable in your sound library, choose another available sound. Adding music does not automatically synchronize every generated step.',
      sourceLead: 'For the upload and sound controls, see',
    },
    faq: {
      heading: 'FAQ',
      items: [
        {
          question: 'How long is the dance itself?',
          answer: 'The template begins with a shush and the princess reaction, then places the dance from about three seconds to the end of the ten-second sequence. Actual cut timing and movement can vary.',
        },
        {
          question: 'How do I add the Tip Toe song?',
          answer: 'Download the video, upload it in TikTok and use Add sound to search for Tip Toe Wing In My Jawwdinz by Riff Raff. Preview the sound with the clip and adjust its start point if your editor offers trimming.',
        },
        {
          question: 'Can I loop the dance video?',
          answer: 'The maker exports one sequence. To repeat it, duplicate the clip in your video editor. The opening shush and final pose are different, so a repeat is not guaranteed to form a seamless loop.',
        },
        {
          question: 'Why do the steps not land on every beat of the song?',
          answer: 'The maker does not use the Tip Toe song as a timing reference. A sound added later has its own timing. Adjusting its start point can align a useful moment, but it does not make every foot placement match a beat.',
        },
      ],
    },
    relatedHeading: 'Related Pages',
  },
} as const
