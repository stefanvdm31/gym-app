import { useNavigate } from 'react-router-dom'
import { normaliseerYoutube } from '../lib/youtube'

/**
 * Opent de video in een nieuw tabblad of in de YouTube-app. We laden nooit
 * een video ín de app: dat kost data en breekt het offline werken.
 *
 * Staat er geen link, dan zie je geen dode knop maar een stille uitnodiging om
 * er één toe te voegen.
 */
export function YoutubeKnop({
  url,
  exerciseId,
  naam,
}: {
  url: string
  exerciseId: string
  naam: string
}) {
  const navigeer = useNavigate()
  const link = normaliseerYoutube(url)

  if (link === null) {
    return (
      <button
        type="button"
        onClick={() => navigeer(`/meer/oefeningen/${exerciseId}`)}
        className="t-caption flex min-h-[40px] items-center gap-1.5 rounded-[8px] px-2 text-ink-faint hover:text-ink-muted"
      >
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M8 3.5v9M3.5 8h9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
        Video toevoegen
      </button>
    )
  }

  return (
    <a
      href={link}
      target="_blank"
      rel="noopener noreferrer"
      className="t-caption flex min-h-[48px] items-center gap-2 rounded-[8px] border border-line-4 bg-surface-2 px-3 font-medium text-ink hover:border-line-5"
    >
      <svg width="17" height="17" viewBox="0 0 18 18" fill="none" aria-hidden="true">
        <rect x="1.5" y="3.5" width="15" height="11" rx="3" stroke="currentColor" strokeWidth="1.5" />
        <path d="M7.5 6.8l4 2.2-4 2.2V6.8z" fill="currentColor" />
      </svg>
      Video
      <span className="sr-only">van {naam} openen op YouTube</span>
    </a>
  )
}
