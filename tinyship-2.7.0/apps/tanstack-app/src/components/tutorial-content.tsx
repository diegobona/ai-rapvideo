import { pageRegistry } from '@/lib/page-registry'
import { tutorialCopy } from '@/lib/tutorial-copy'
import { VIDEO_PAYMENT_REQUIRED } from '../../../../config/videoPurchase'

export function TutorialContent() {
  return (
    <>
      <p className="article-intro">
        {tutorialCopy.introBeforeLink}
        <a href={pageRegistry.home.path}>{pageRegistry.home.anchorText}</a>
        {tutorialCopy.introAfterLink}
      </p>
      <p>
        {tutorialCopy.toolLinks.generatorLead} <a href={pageRegistry.videoGenerator.path}>{pageRegistry.videoGenerator.anchorText}</a>.{' '}
        {tutorialCopy.toolLinks.danceLead} <a href={pageRegistry.danceVideo.path}>{pageRegistry.danceVideo.anchorText}</a>.
      </p>
      {tutorialCopy.steps.map((step) => (
        <section className="article-section article-step" aria-labelledby={step.id} key={step.id}>
          <h2 id={step.id}>{step.heading}</h2>
          {step.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
          {(VIDEO_PAYMENT_REQUIRED || step.id !== 'generate-video') && <figure className="article-figure" style={{ maxWidth: Math.min(step.width, 900) }}>
            <img src={step.image} alt={step.alt} width={step.width} height={step.height} loading="lazy" decoding="async" />
            <figcaption>{step.caption}</figcaption>
          </figure>}
        </section>
      ))}
      <section className="article-section article-faq" aria-labelledby="common-problems">
        <h2 id="common-problems">{tutorialCopy.problems.heading}</h2>
        {tutorialCopy.problems.items.map((item) => (
          <div key={item.question}>
            <h3>{item.question}</h3>
            <p>{item.answer}</p>
          </div>
        ))}
      </section>
    </>
  )
}
