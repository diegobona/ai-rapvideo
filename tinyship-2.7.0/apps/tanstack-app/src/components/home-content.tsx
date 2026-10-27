import { homeCopy } from '@/lib/home-copy'
import { VideoExamples } from './video-examples'
import { RapPricingCard } from './rap-credit-purchase'

type RelatedTool = {
  category: string
  href: string
  anchorText: string
  description: string
}

type HomeContentProps = {
  relatedTools?: readonly RelatedTool[]
}

export function HomeContent({ relatedTools = homeCopy.related.items }: HomeContentProps) {
  return (
    <div className="home-content">
      <VideoExamples heading={homeCopy.presentation.examplesHeading} note={homeCopy.presentation.examplesNote} />

      <section className="home-section section-how" aria-labelledby="how-to-make">
        <h2 id="how-to-make">{homeCopy.how.heading}</h2>
        <ol className="step-grid">
          {homeCopy.how.steps.map((step, index) => (
            <li className="step-card" key={step.title}>
              <img src={step.image} alt={step.alt} width={960} height={640} loading="lazy" decoding="async" />
              <div className="step-copy">
                <h3><span className="step-number" aria-hidden="true">{index + 1}</span>{step.title}</h3>
                <p>{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="home-section section-pricing" aria-labelledby="pricing">
        <h2 id="pricing">{homeCopy.pricing.heading}</h2>
        <div className="pricing-options">
          <article className="pricing-card pricing-preview">
            <span className="pricing-availability">{homeCopy.presentation.previewPricing.label}</span>
            <div className="pricing-offer"><strong className="pricing-price">{homeCopy.presentation.previewPricing.price}</strong></div>
            <h3>{homeCopy.presentation.previewPricing.title}</h3>
            <p className="pricing-note">{homeCopy.presentation.previewPricing.description}</p>
            <a className="pricing-preview-link" href="#rap-maker">{homeCopy.presentation.previewPricing.action}<span aria-hidden="true">↗</span></a>
          </article>
          <RapPricingCard />
        </div>
      </section>

      <section className="home-section section-editorial" aria-labelledby="what-is-rap-video">
        <h2 id="what-is-rap-video">{homeCopy.editorial.whatIs.heading}</h2>
        <p>{homeCopy.intro}</p>
        <p>{homeCopy.editorial.whatIs.body}</p>
      </section>

      <section className="home-section section-editorial" aria-labelledby="who-it-is-for">
        <h2 id="who-it-is-for">{homeCopy.editorial.audience.heading}</h2>
        {homeCopy.editorial.audience.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
      </section>

      <section className="home-section section-editorial" aria-labelledby="why-two-photos">
        <h2 id="why-two-photos">{homeCopy.editorial.twoPhotos.heading}</h2>
        <p>{homeCopy.editorial.twoPhotos.body}</p>
      </section>

      <section className="home-section section-faq" aria-labelledby="video-faq">
        <h2 id="video-faq">{homeCopy.faq.heading}</h2>
        <div className="faq-list">
          {homeCopy.faq.items.map((item) => (
            <details className="faq-item" key={item.question}>
              <summary>{item.question}</summary>
              <p>
                {item.answer}
              </p>
            </details>
          ))}
        </div>
      </section>

      <section className="home-section section-related" aria-labelledby="more-video-tools">
        <h2 id="more-video-tools">{homeCopy.related.heading}</h2>
        <div className="related-grid">
          {relatedTools.map((tool) => (
            <article className="related-card" key={tool.href}>
              <p className="related-category">{tool.category}</p>
              <h3><a href={tool.href}>{tool.anchorText}</a></h3>
              <p className="related-description">{tool.description}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}
