import { useState } from 'react'
import { danceExamples as copy } from '@/lib/dance-examples'

function ExamplePlayer({ video, poster, title, width, height }: {
  video: string
  poster: string
  title: string
  width: number
  height: number
}) {
  const [failed, setFailed] = useState(false)

  return (
    <div className="example-player">
      <video
        src={video}
        poster={poster}
        width={width}
        height={height}
        style={{ aspectRatio: `${width} / ${height}` }}
        controls
        playsInline
        preload="none"
        aria-label={title}
        onError={() => setFailed(true)}
      >
        <a href={video} target="_blank" rel="noopener noreferrer">{copy.fallback}</a>
      </video>
      {failed && <p className="example-error" role="status">{copy.unavailable}</p>}
    </div>
  )
}

export function VideoExamples({ heading = copy.heading }: { heading?: string }) {
  return (
    <section className="home-section section-examples" aria-labelledby="video-examples">
      <h2 id="video-examples">{heading}</h2>
      <div className="example-grid">
        {copy.items.map((example) => (
          <figure className="example-card" key={example.video}>
            <ExamplePlayer {...example} />
            <figcaption>
              <h3>{example.title}</h3>
              <p>{example.body}</p>
              <p className="example-details">{example.details}</p>
              <p className="example-use-case">{example.useCase}</p>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  )
}
