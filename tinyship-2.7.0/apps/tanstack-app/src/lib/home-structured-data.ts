import { homeCopy } from './home-copy'
import { SITE_ORIGIN } from './site'
import { rapCreditConfig } from '../../../../config/rapCredits'

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
        offers: [
          { '@type': 'Offer', name: '3-second preview', price: 0, priceCurrency: 'USD' },
          { '@type': 'Offer', name: '1 video credit — one full 12-second video', price: rapCreditConfig.amount / 100, priceCurrency: rapCreditConfig.currency.toUpperCase(), url: `${SITE_ORIGIN}/#pricing` },
        ],
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

