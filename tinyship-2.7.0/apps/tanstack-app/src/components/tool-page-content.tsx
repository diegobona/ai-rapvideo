import { pageRegistry } from '@/lib/page-registry'
import { toolPageCopy } from '@/lib/tool-page-copy'
import { danceFactSources } from '@/lib/dance-fact-sources'
import { danceOutputSpecs } from '@/lib/dance-output-specs'

type Step = { title: string; body: string }
type Question = { question: string; answer: string }

function ToolSteps({ id, heading, steps }: { id: string; heading: string; steps: readonly Step[] }) {
  return (
    <section className="home-section" aria-labelledby={id}>
      <h2 id={id}>{heading}</h2>
      <ol className="step-grid tool-step-grid">
        {steps.map((step, index) => (
          <li className="step-card" key={step.title}>
            <div className="step-copy">
              <h3><span className="step-number" aria-hidden="true">{index + 1}</span>{step.title}</h3>
              <p>{step.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}

function ToolFaq({ id, heading, items }: { id: string; heading: string; items: readonly Question[] }) {
  return (
    <section className="home-section section-faq" aria-labelledby={id}>
      <h2 id={id}>{heading}</h2>
      <div className="faq-list">
        {items.map((item) => (
          <div className="faq-item" key={item.question}>
            <h3>{item.question}</h3>
            <p>{item.answer}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

export function VideoGeneratorContent() {
  const copy = toolPageCopy.videoGenerator
  const related = [pageRegistry.home, pageRegistry.danceVideo, pageRegistry.howTo]
  return (
    <div className="home-content">
      <p className="home-intro">{copy.intro}</p>
      <p className="section-note">
        {copy.links.danceLead} <a href={pageRegistry.danceVideo.path}>{pageRegistry.danceVideo.anchorText}</a>.{' '}
        {copy.links.guideLead} <a href={pageRegistry.howTo.path}>{pageRegistry.howTo.anchorText}</a>.
      </p>
      <ToolSteps id="generator-how-it-works" heading={copy.how.heading} steps={copy.how.steps} />
      <section className="home-section" aria-labelledby="generator-output">
        <h2 id="generator-output">{copy.output.heading}</h2>
        <div className="generator-output-layout">
          <div>
            <table className="generator-spec-table">
              <thead><tr><th scope="col">{copy.output.parameterLabel}</th><th scope="col">{copy.output.valueLabel}</th></tr></thead>
              <tbody>{danceOutputSpecs.map((spec) => <tr key={spec.label}><th scope="row">{spec.label}</th><td>{spec.value}</td></tr>)}</tbody>
            </table>
            <p className="section-note">{copy.output.note}</p>
            <figure className="generator-demo-cover">
              <img src={copy.demo.cover} alt={copy.demo.alt} width={720} height={1280} loading="lazy" decoding="async" />
              <figcaption>{copy.demo.coverLabel}</figcaption>
            </figure>
          </div>
          <figure className="generator-demo">
            <h3 id="generator-demo-title">{copy.demo.title}</h3>
            <video controls playsInline preload="metadata" width={720} height={1280} poster={copy.demo.cover} title={copy.demo.title} aria-labelledby="generator-demo-title" aria-describedby="generator-demo-description">
              <source src={copy.demo.video} type="video/mp4" />
              <a href={copy.demo.video}>{copy.demo.fallback}</a>
            </video>
            <figcaption>
              <p id="generator-demo-description">{copy.demo.description}</p>
              <p>{copy.demo.note}</p>
            </figcaption>
          </figure>
        </div>
      </section>
      <section className="home-section tool-prose" aria-labelledby="generator-photos">
        <h2 id="generator-photos">{copy.photos.heading}</h2>
        <p>{copy.photos.intro}</p>
        <ul className="generator-photo-list">{copy.photos.requirements.map((requirement) => <li key={requirement}>{requirement}</li>)}</ul>
        <p>{copy.photos.limits}</p>
      </section>
      <section className="home-section tool-prose" aria-labelledby="generator-pricing">
        <h2 id="generator-pricing">{copy.pricing.heading}</h2>
        {copy.pricing.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
      </section>
      <section className="home-section" aria-labelledby="generator-troubleshooting">
        <h2 id="generator-troubleshooting">{copy.troubleshooting.heading}</h2>
        <div className="generator-troubleshooting tool-prose">
          {copy.troubleshooting.items.map((item) => <div key={item.title}><h3>{item.title}</h3><p>{item.body}</p></div>)}
        </div>
      </section>
      <ToolFaq id="generator-faq" heading={copy.faq.heading} items={copy.faq.items} />
      <section className="home-section section-related" aria-labelledby="generator-related">
        <h2 id="generator-related">{copy.relatedHeading}</h2>
        <div className="related-grid">
          {related.map((page) => (
            <article className="related-card" key={page.path}>
              <p className="related-category">{page.category}</p>
              <h3><a href={page.path}>{page.anchorText}</a></h3>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}

export function DanceVideoContent() {
  const copy = toolPageCopy.danceVideo
  const related = [pageRegistry.home, pageRegistry.videoGenerator]
  return (
    <div className="home-content">
      <p className="home-intro">{copy.intro}</p>
      <p className="section-note">
        {copy.links.homeLead} <a href={pageRegistry.home.path}>{pageRegistry.home.anchorText}</a>.{' '}
        {copy.links.memeLead} <a href={pageRegistry.meme.path}>{pageRegistry.meme.anchorText}</a>.
      </p>
      <section className="home-section" aria-labelledby="dance-appearance">
        <h2 id="dance-appearance">{copy.appearance.heading}</h2>
        <p className="section-note">{copy.appearance.intro}</p>
        <div className="dance-action-grid">
          {copy.appearance.actions.map((action) => (
            <div className="dance-action" key={action.title}>
              <h3>{action.title}</h3>
              <p className="dance-action-time">{action.timing}</p>
              <p>{action.body}</p>
            </div>
          ))}
        </div>
      </section>
      <ToolSteps id="dance-how-to-make" heading={copy.how.heading} steps={copy.how.steps} />
      <p className="section-note">
        {copy.links.generatorLead} <a href={pageRegistry.videoGenerator.path}>{pageRegistry.videoGenerator.anchorText}</a>.{' '}
        {copy.links.guideLead} <a href={pageRegistry.howTo.path}>{pageRegistry.howTo.anchorText}</a> {copy.links.guideEnd}
      </p>
      <section className="home-section tool-prose dance-sound" aria-labelledby="dance-sound">
        <h2 id="dance-sound">{copy.sound.heading}</h2>
        <p>{copy.sound.intro}{' '}
          <a href={danceFactSources.meme.href} rel="nofollow">{danceFactSources.meme.label}</a>;{' '}
          <a href={danceFactSources.song.href} rel="nofollow">{danceFactSources.song.label}</a>.
        </p>
        <ol>{copy.sound.steps.map((step) => <li key={step}>{step}</li>)}</ol>
        <p>{copy.sound.note}</p>
        <p>{copy.sound.sourceLead} <a href={danceFactSources.tiktok.href} rel="nofollow">{danceFactSources.tiktok.label}</a>.</p>
      </section>
      <ToolFaq id="dance-faq" heading={copy.faq.heading} items={copy.faq.items} />
      <section className="home-section section-related" aria-labelledby="dance-related">
        <h2 id="dance-related">{copy.relatedHeading}</h2>
        <div className="related-grid">
          {related.map((page) => (
            <article className="related-card" key={page.path}>
              <p className="related-category">{page.category}</p>
              <h3><a href={page.path}>{page.anchorText}</a></h3>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}
