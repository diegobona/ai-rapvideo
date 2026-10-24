import { homeCopy } from '@/lib/home-copy'
import { VideoExamples } from './video-examples'

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
      <p className="home-intro">{homeCopy.intro}</p>

      <VideoExamples heading={homeCopy.examplesHeading} />

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

      <section className="home-section section-editorial" aria-labelledby="what-is-rap-video">
        <h2 id="what-is-rap-video">{homeCopy.editorial.whatIs.heading}</h2>
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
            <div className="faq-item" key={item.question}>
              <h3>{item.question}</h3>
              <p>
                {item.answer}
              </p>
            </div>
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
