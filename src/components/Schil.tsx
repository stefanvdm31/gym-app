import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { IcoonKnop } from './ui/Knop'
import { RustBalk } from './RustBalk'
import { OnderNavigatie } from './OnderNavigatie'

/**
 * Vaste opbouw van elk scherm: een schuifbaar middenstuk, daaronder de
 * rusttimer en onderin de navigatie of de hoofdactie van dat scherm.
 */
export function Schil({
  children,
  onderbalk,
  toonNavigatie = true,
}: {
  children: ReactNode
  onderbalk?: ReactNode
  toonNavigatie?: boolean
}) {
  return (
    <div className="veilig-zijkant flex h-dvh flex-col bg-canvas">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-[560px] px-5 pb-6">{children}</div>
      </div>
      <RustBalk />
      {onderbalk !== undefined && (
        <div className="veilig-onder shrink-0 border-t border-line bg-shell px-4 pt-2">
          <div className="mx-auto max-w-[560px]">{onderbalk}</div>
        </div>
      )}
      {toonNavigatie && <OnderNavigatie />}
    </div>
  )
}

/** Kop van een hoofdscherm: titel plus optioneel iets rechts. */
export function SchermKop({ titel, rechts }: { titel: string; rechts?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 pt-4 pb-4">
      <h1 className="t-h2 text-ink">{titel}</h1>
      {rechts}
    </div>
  )
}

/** Kop van een onderliggend scherm, met een terugknop. */
export function SubKop({
  titel,
  rechts,
  onTerug,
}: {
  titel: string
  rechts?: ReactNode
  onTerug?: () => void
}) {
  const navigeer = useNavigate()
  return (
    <div className="sticky top-0 z-10 -mx-5 flex items-center gap-1 border-b border-line bg-canvas/95 px-2 py-2 backdrop-blur">
      <IcoonKnop label="Terug" onClick={onTerug ?? (() => navigeer(-1))}>
        <svg width="20" height="20" viewBox="0 0 18 18" fill="none" aria-hidden="true">
          <path d="M11 4L6 9l5 5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </IcoonKnop>
      <div className="t-body-sm min-w-0 flex-1 truncate font-semibold text-ink">{titel}</div>
      <div className="flex shrink-0 items-center gap-1 pr-1">{rechts}</div>
    </div>
  )
}

export function Laden({ tekst = 'Bezig met laden…' }: { tekst?: string }) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-2 text-ink-muted">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-line-4 border-t-accent" />
      <span className="t-caption">{tekst}</span>
    </div>
  )
}
