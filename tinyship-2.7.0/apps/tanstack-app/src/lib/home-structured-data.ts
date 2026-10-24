import { homeCopy } from './home-copy'
import { SITE_ORIGIN } from './site'
import { VIDEO_PAYMENT_REQUIRED, videoPurchaseConfig } from '../../../../config/videoPurchase'

/** Use the same FAQ strings as the visible, server-rendered homepage. */
export function homeStructuredData() {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'SoftwareApplication',
        name: 'AI Rap Video Generator',
        applicationCategory: 'MultimediaApplication',
        operatingSystem: 'Web',
        url: `${SITE_ORIGIN}/`,
        offers: {
          '@type': 'Offer',
          price: VIDEO_PAYMENT_REQUIRED ? videoPurchaseConfig.amount / 100 : 0,
          priceCurrency: videoPurchaseConfig.currency.toUpperCase(),
        },
      },
      {
        '@type': 'FAQPage',
        mainEntity: homeCopy.faq.items.map(({ question, answer }) => ({
          '@type': 'Question',
          name: question,
          acceptedAnswer: { '@type': 'Answer', text: answer },
        })),
      },
    ],
  }
}

