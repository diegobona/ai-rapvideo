import { memeArticleCopy, memeSources, movieArticleCopy } from '@/lib/meme-article-copy'
import { pageRegistry } from '@/lib/page-registry'
import { danceFactSources } from '@/lib/dance-fact-sources'

function Source({ source }: { source: { href: string; label: string } }) {
  return <> <a href={source.href} rel="nofollow">{source.label}</a>.</>
}

export function MemeArticle() {
  const copy = memeArticleCopy
  return (
    <>
      <section className="article-section" aria-labelledby="meme-ai">
        <h2 id="meme-ai">{copy.ai.heading}</h2>
        <p>{copy.ai.answer}<Source source={memeSources.reporting} /></p>
        <p>{copy.ai.explanation}</p>
      </section>
      <section className="article-section" aria-labelledby="meme-origin">
        <h2 id="meme-origin">{copy.origin.heading}</h2>
        {copy.origin.paragraphs.map((text, index) => <p key={text}>{text}<Source source={index === 0 ? memeSources.reporting : memeSources.history} /></p>)}
        <p>{copy.origin.more} <a href={copy.origin.link.path}>{copy.origin.link.anchorText}</a>.</p>
      </section>
      <section className="article-section" aria-labelledby="meme-make">
        <h2 id="meme-make">{copy.make.heading}</h2>
        <p>{copy.make.intro}</p>
        <ol>{copy.make.steps.map((step) => <li key={step}>{step}</li>)}</ol>
        <p>{copy.make.timing}</p>
        <p>{copy.make.toolLead} <a href={pageRegistry.videoGenerator.path}>{pageRegistry.videoGenerator.anchorText}</a>. {copy.make.homeLead} <a href={pageRegistry.home.path}>{pageRegistry.home.anchorText}</a>. {copy.make.guideLead} <a href={pageRegistry.howTo.path}>{pageRegistry.howTo.anchorText}</a>.</p>
      </section>
      <section className="article-section" aria-labelledby="meme-faq">
        <h2 id="meme-faq">{copy.faq.heading}</h2>
        {copy.faq.items.map((item) => (
          <div className="article-faq" key={item.question}>
            <h3>{item.question}</h3>
            <p>{item.answer}{'source' in item && <Source source={item.source} />}{'secondSource' in item && <Source source={item.secondSource} />}</p>
          </div>
        ))}
      </section>
    </>
  )
}

export function MovieArticle() {
  const copy = movieArticleCopy
  return (
    <>
      <section className="article-section" aria-labelledby="movie-scene">
        <h2 id="movie-scene">{copy.scene.heading}</h2>
        <p>{copy.scene.correction}<Source source={danceFactSources.reporting} /></p>
        <p>{copy.scene.distinction}</p>
      </section>
      <section className="article-section" aria-labelledby="movie-films">
        <h2 id="movie-films">{copy.films.heading}</h2>
        {copy.films.items.map((film) => (
          <div key={film.heading}>
            <h3>{film.heading}</h3>
            <p>{film.body}<Source source={film.source} /></p>
          </div>
        ))}
        <p>{copy.films.distinction}<Source source={danceFactSources.reporting} /></p>
      </section>
      <section className="article-section" aria-labelledby="movie-music">
        <h2 id="movie-music">{copy.music.heading}</h2>
        <p>{copy.music.body}<Source source={danceFactSources.meme} /><Source source={danceFactSources.song} /></p>
        <p>{copy.music.more} <a href={copy.music.link.path}>{copy.music.link.anchorText}</a>.</p>
      </section>
      <section className="article-section" aria-labelledby="movie-make">
        <h2 id="movie-make">{copy.make.heading}</h2>
        <p>{copy.make.intro}</p>
        <p>{copy.make.expectations}</p>
        <p>{copy.make.toolLead} <a href={pageRegistry.home.path}>{pageRegistry.home.anchorText}</a>, {copy.make.guideLead} <a href={pageRegistry.howTo.path}>{pageRegistry.howTo.anchorText}</a>.</p>
      </section>
    </>
  )
}
