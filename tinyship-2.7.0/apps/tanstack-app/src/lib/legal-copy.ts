export const legalDetails = {
  operator: 'ColdStone co.',
  supportEmail: 'zw83716@gmail.com',
  updated: 'October 21, 2026',
  updatedLabel: 'Last updated:',
  contactHeading: 'Contact',
  contactLead: 'For support, privacy requests or questions about these terms, email',
} as const

export const legalPages = {
  privacy: {
    path: '/privacy-policy',
    label: 'Privacy Policy',
    title: 'Privacy Policy | Rumpelstiltskin AI',
    description: 'How ColdStone co. handles visitor sessions, uploaded photos and video generation data for Rumpelstiltskin AI.',
    intro: 'ColdStone co. operates Rumpelstiltskin AI. This policy describes the information used for visitor sessions and photo-to-video generation.',
    sections: [
      {
        heading: 'Information used by the service',
        paragraphs: [
          'The service creates an anonymous session with a generated internal identifier to associate uploads and video tasks with your browser. Registration, a name, an email address and a password are not required. Session records can include your IP address and browser information.',
          'When you continue to checkout, the service uploads your selected photos and stores a purchase record with the prepared generation instructions. After payment, it processes the video job status and a link to the result. Support emails contain the information you choose to send us.',
        ],
      },
      {
        heading: 'Why we use this information',
        paragraphs: [
          'Visitor sessions protect access to uploads, purchases and video tasks. Purchase and refund records track payment, delivery and failure recovery. Uploaded photos and generation instructions are needed to create your requested video. Technical logs help diagnose errors and protect the service from misuse.',
          'We use information sent to the support address to respond to your request. Avoid including passwords, API keys or unnecessary personal information in your message.',
        ],
      },
      {
        heading: 'Storage and video processing',
        paragraphs: [
          'We use Cloudflare to host the service and store uploaded photos and saved generated videos. AutoDL creates new videos; earlier orders may use Compshare. These providers may process information outside your country.',
          'Photos are uploaded when you continue to checkout and provided to the video processor through image links. Image links grant access to the corresponding photos and should be kept private. Selecting a photo for a local preview does not upload it.',
        ],
      },
      {
        heading: 'Payments and refunds',
        paragraphs: [
          'Stripe processes your checkout and payment details on its own payment page. We do not receive or store your full card number or card security code. Stripe may collect information such as your email, billing details and payment-method information to process the transaction.',
          'We store the purchase amount and currency, Stripe checkout and payment references, payment status, and any refund reference and status. These records associate one paid video with your browser session, prevent duplicate generation, and support payment inquiries and refunds. Your uploaded photos and generation instructions are not sent to Stripe as payment metadata.',
        ],
      },
      {
        heading: 'Retention and deletion requests',
        paragraphs: [
          'Uploaded photos and saved generated videos are scheduled for automatic deletion from our Cloudflare storage 24 hours after each file is stored. Removal runs in the background and can take additional time. Download your completed MP4 within 24 hours to keep a copy. Purchase, refund and service records may be retained for payment processing and support.',
          'For access, correction or deletion requests, email us with the approximate order time or a reference that helps identify your records. We may verify your request before acting on it. Service providers manage their own retention under their respective policies.',
        ],
      },
      {
        heading: 'Video examples',
        paragraphs: [
          'Some creative-reference videos and their preview images load directly from third-party servers. Those servers receive the connection information needed to serve the media, such as your IP address and browser information. The videos do not autoplay. Playing an example does not upload your photos or start a generation.',
        ],
      },
      {
        heading: 'Cookies and analytics',
        paragraphs: [
          'The service uses a signed, HttpOnly visitor cookie for session continuity and misuse prevention. This cookie can last up to one year. We also use short-lived, keyed hashes of Cloudflare-provided IP addresses to limit request bursts; the trial rate counters do not store raw IP addresses.',
          'The authentication system uses session cookies, and the interface may store your theme preference in the browser. The current tab may keep your latest video task ID, uploaded-photo links, expression notes and selected format for recovery. It does not keep uploaded photo bytes in this browser record.',
          'We use PostHog for basic visit and referral-source statistics, including visits from AI assistants. A page-load event includes the page URL, referring website, campaign tags, and browser and device information. PostHog uses anonymous identifiers in browser storage to estimate visitor counts. Its US-hosted service processes analytics requests, including the network information needed to receive them.',
          'Session recording, automatic click capture and person profiles are disabled. We do not track video-generation, upload, preview or download actions. We do not send uploaded photos, filenames, generation prompts, generated-video URLs, names or email addresses as analytics event data. Unrelated query parameters and URL fragments are removed from page URLs before analytics events are sent.',
        ],
      },
    ],
  },
  terms: {
    path: '/terms-of-service',
    label: 'Terms of Service',
    title: 'Terms of Service | Rumpelstiltskin AI',
    description: 'Terms for using the Rumpelstiltskin AI photo-to-video tool operated by ColdStone co., including $4.99 purchases, refunds, uploads and generated results.',
    intro: 'These terms cover your use of Rumpelstiltskin AI, operated by ColdStone co. Please read them before uploading photos or starting a generation.',
    sections: [
      {
        heading: 'The service',
        paragraphs: [
          'The tool creates a new video from character photos and a prepared dance template. It uses an AI generation provider. Faces, motion and shot timing can vary; a particular likeness, exact choreography or completion time is not guaranteed.',
          'Rumpelstiltskin AI is an independent tool. It is not presented as an official service of the 1987 film, its performers or the creators of the viral meme.',
        ],
      },
      {
        heading: 'Your browser session and photos',
        paragraphs: [
          'Keep cookies enabled while using the maker so it can associate your uploads and video tasks with the same browser session. You are responsible for the photos and generation requests you submit.',
          'Upload only photos you have permission to use, including the permission needed to depict identifiable people. Do not use the tool to harass people, commit fraud or create unlawful content. We may restrict access when the service is misused.',
        ],
      },
      {
        heading: 'Permission to process uploads',
        paragraphs: [
          'You keep any rights you already hold in your uploads. By starting generation, you allow us and the service providers to store and process those uploads to produce and deliver the requested video.',
          'You are responsible for checking whether your intended use of an output respects other people’s rights. The service does not guarantee that an AI output is unique or that it grants exclusive rights in the result.',
        ],
      },
      {
        heading: 'Payment and generation',
        paragraphs: [
          'Each video costs $4.99 USD. The price is shown before Stripe checkout, and generation begins only after payment is confirmed. One payment covers one generated video. No account or subscription is required, and there is no automatic renewal. An additional video requires a separate purchase.',
          'Closing or cancelling an unpaid checkout does not start a generation. Refreshing the page, returning from checkout or checking an existing paid video does not buy another video or authorize a second charge.',
          'Keep access to the same browser session to retrieve your order and video. Payment confirmation and generation may continue after you close the page. Contact zw83716@gmail.com with your approximate purchase time and Stripe receipt reference if you need help finding an order.',
        ],
      },
      {
        heading: 'Generation failures and refunds',
        paragraphs: [
          'A confirmed technical generation failure triggers a full refund to the original payment method. Refund processing can take time, and your bank determines when the refund appears on your statement. Contact zw83716@gmail.com if a refund remains unresolved.',
          'A temporary network or status-check error is not proof that generation failed; the service continues checking the existing order. A completed video can differ from the reference photos or intended motion. A completed result is not automatically refunded solely for a difference in appearance or movement; contact support if you have a concern. Nothing in these terms limits refund rights required by applicable law.',
        ],
      },
      {
        heading: 'Availability and downloads',
        paragraphs: [
          'Generation can take a few minutes. Preview your finished video and download the MP4 within 24 hours to save and share. Uploaded photos and saved videos are scheduled for automatic deletion from our Cloudflare storage after 24 hours.',
          'Temporary links and unfinished job status can become unavailable. Contact support with the approximate generation time and any task reference you retained if you need help with an interrupted job.',
        ],
      },
      {
        heading: 'Changes and applicable rights',
        paragraphs: [
          'We may update the tool and these terms. The date on this page identifies the current version. Nothing in these terms is intended to remove rights that applicable law does not allow us to exclude.',
        ],
      },
    ],
  },
} as const
