export const legalDetails = {
  operator: 'ColdStone co.',
  supportEmail: 'support@ai-rapvideo.co',
  updated: 'October 25, 2026',
  updatedLabel: 'Last updated:',
  contactHeading: 'Contact',
  contactLead: 'For support, privacy requests or questions about these terms, email',
} as const

export const legalPages = {
  privacy: {
    path: '/privacy-policy',
    label: 'Privacy Policy',
    title: 'Privacy Policy | AI Rap Video',
    description: 'How ColdStone co. handles visitor sessions, uploaded photos and video generation data for AI Rap Video.',
    intro: 'ColdStone co. operates AI Rap Video. This policy describes the information used for visitor sessions and photo-to-video generation.',
    sections: [
      {
        heading: 'Information used by the service',
        paragraphs: [
          'The service creates an anonymous session with a generated internal identifier to associate uploads and video tasks with your browser. Registration, a name, an email address and a password are not required. Session records can include your IP address and browser information.',
          'Google sign-in is optional. If you use it, Google provides your account identifier, name, email address, verification status and profile image. We store account and session records to recognize your account and associate your previous video tasks. Google OAuth tokens may be stored in the account record. We do not receive your Google password or request access to Gmail or Google Drive.',
          'When you generate a free preview, the service uploads your selected photos and stores the generation request, task status and a link to the result. Support emails contain the information you choose to send us.',
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
          'Google handles the optional sign-in and consent flow under its own privacy policies. Signing in does not reset the one-time free preview allowance for your network or account.',
          'Photos are uploaded when you start generation and provided to the video processor through image links. Image links grant access to the corresponding photos and should be kept private. Selecting a photo for a local preview does not upload it.',
        ],
      },
      {
        heading: 'Current free access and historical payment records',
        paragraphs: [
          'A single 3-second preview is free per public IP address and does not require checkout or payment details. Stripe processed payments for earlier paid orders; we did not receive or store full card numbers or card security codes.',
          'Records for earlier purchases may include the amount, currency, payment references and refund status, and may be retained for order support. New free generation requests are not sent to Stripe.',
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
          'Example videos and their preview images are served from this website. The videos do not autoplay. Playing an example does not upload your photos or start a generation.',
        ],
      },
      {
        heading: 'Cookies and analytics',
        paragraphs: [
          'The service uses a signed, HttpOnly visitor cookie for session continuity and misuse prevention. This cookie can last up to one year. We use keyed hashes of Cloudflare-provided public IP addresses to limit request bursts and enforce one free preview per network. The preview allowance record is retained after photo and video deletion and does not reset when browsers or cookies change. These records do not store raw IP addresses. Devices sharing a public IP share the allowance.',
          'The authentication system uses session cookies, and the interface may store your theme preference in the browser. The current tab may keep your latest video task ID, uploaded-photo links, selected scene and rap topic for recovery. It does not keep uploaded photo bytes in this browser record.',
          'We use PostHog for basic visit and referral-source statistics, including visits from AI assistants. A page-load event includes the page URL, referring website, campaign tags, and browser and device information. PostHog uses anonymous identifiers in browser storage to estimate visitor counts. Its US-hosted service processes analytics requests, including the network information needed to receive them.',
          'Session recording, automatic click capture and person profiles are disabled. We do not track video-generation, upload, preview or download actions. We do not send uploaded photos, filenames, generation prompts, generated-video URLs, names or email addresses as analytics event data. Unrelated query parameters and URL fragments are removed from page URLs before analytics events are sent.',
        ],
      },
    ],
  },
  terms: {
    path: '/terms-of-service',
    label: 'Terms of Service',
    title: 'Terms of Service | AI Rap Video',
    description: 'Terms for using the free AI Rap Video photo-to-video tool operated by ColdStone co., including uploads and generated results.',
    intro: 'These terms cover your use of AI Rap Video, operated by ColdStone co. Please read them before uploading photos or starting a generation.',
    sections: [
      {
        heading: 'The service',
        paragraphs: [
          'The tool creates a short AI video featuring two people from two separately uploaded photos. Both photos are required. Faces, motion and shot timing can vary; a particular likeness, exact movement or completion time is not guaranteed.',
          'AI Rap Video is an independently operated AI video creation tool.',
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
        heading: 'Free access and generation',
        paragraphs: [
          'Each public IP address can generate one free 3-second portrait preview from four selectable scenes. No payment or account is required. An $8.90 pack for one full 12-second video is planned; checkout is not yet available.',
          'Only selecting Generate free 3-second preview starts a new request. Refreshing, checking an existing task or downloading does not create another video. The allowance is reserved before submission and consumed after successful generation; clearing cookies or changing browsers does not restore it. Requests with an uncertain submission status remain reserved until resolved.',
          'Keep access to the same browser session to retrieve your video. Generation may continue after you close the page. Contact support@ai-rapvideo.co with your approximate generation time if you need help finding a task.',
        ],
      },
      {
        heading: 'Generation failures and refunds',
        paragraphs: [
          'Free previews have no payment to refund. If the provider confirms generation failed, the preview allowance is restored for a retry using your selected photos and settings. Earlier paid orders keep their original failure-refund handling; contact support@ai-rapvideo.co for help with an unresolved historical order.',
          'A temporary network or status-check error is not proof that generation failed; the service continues checking the existing order. A completed video can differ from the reference photos or intended motion. A completed result is not automatically refunded solely for a difference in appearance or movement; contact support if you have a concern. Nothing in these terms limits refund rights required by applicable law.',
        ],
      },
      {
        heading: 'Availability and downloads',
        paragraphs: [
          'Generation can take a few minutes. Preview your finished video and download the MP4 within 24 hours to save and share. Uploaded photos and saved generated videos are scheduled for automatic deletion from our Cloudflare storage 24 hours after each file is stored. Removal runs in the background and can take additional time.',
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
