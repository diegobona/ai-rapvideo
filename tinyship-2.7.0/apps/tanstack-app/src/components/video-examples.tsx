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
        onPlay={event => {
          const current = event.currentTarget
          current.closest('.example-grid')?.querySelectorAll('video').forEach(other => { if (other !== current) other.pause() })
        }}
        onError={() => setFailed(true)}
      >
        <a href={video} target="_blank" rel="noopener noreferrer">{copy.fallback}</a>
      </video>
      {failed && <p className="example-error" role="status">{copy.unavailable}</p>}
    </div>
  )
}

export function VideoExamples({ heading = copy.heading, note }: { heading?: string; note?: string }) {
  return (
    <section className="home-section section-examples" aria-labelledby="video-examples">
      <div className="examples-heading"><h2 id="video-examples">{heading}</h2>{note && <p>{note}</p>}</div>
      <div className="example-grid">
        {copy.items.map((example) => (
          <figure className="example-card" key={example.video}>
            <ExamplePlayer {...example} />
            <figcaption><h3 title={example.title}>{example.title}</h3></figcaption>
          </figure>
        ))}
      </div>
    </section>
  )
}
