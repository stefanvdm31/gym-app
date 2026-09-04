import type { ReactNode } from 'react'

/** Losse bouwstenen die overal in de app terugkomen. */

export function Kaart({
  children,
  className = '',
  vlak = false,
}: {
  children: ReactNode
  className?: string
  vlak?: boolean
}) {
  const achtergrond = vlak ? 'bg-transparent border-line-2' : 'bg-surface border-line-3'
  return (
    <div className={`rounded-[12px] border ${achtergrond} ${className}`}>{children}</div>
  )
}

export function Kop({ children }: { children: ReactNode }) {
  return <h1 className="t-h2 text-ink">{children}</h1>
}

export function Wenkbrauw({ children }: { children: ReactNode }) {
  return <div className="t-eyebrow text-ink-muted uppercase">{children}</div>
}

export type BadgeToon = 'neutraal' | 'accent' | 'goed' | 'let-op' | 'fout'

const BADGE_STIJL: Record<BadgeToon, string> = {
  neutraal: 'bg-surface-2 border-line-4 text-ink-2',
  accent: 'bg-accent/12 border-accent/35 text-accent',
  goed: 'bg-goed/14 border-goed/35 text-goed',
  'let-op': 'bg-let-op/12 border-let-op/35 text-let-op',
  fout: 'bg-fout/12 border-fout/35 text-fout',
}

export function Badge({
  children,
  toon = 'neutraal',
  icoon,
}: {
  children: ReactNode
  toon?: BadgeToon
  icoon?: ReactNode
}) {
  return (
    <span
      className={`t-eyebrow inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-[3px] ${BADGE_STIJL[toon]}`}
    >
      {icoon}
      {children}
    </span>
  )
}

/** Melding in een kaart. Kleur is nooit de enige drager: er staat altijd tekst bij. */
export function Melding({
  toon = 'let-op',
  titel,
  children,
}: {
  toon?: 'let-op' | 'accent' | 'fout' | 'goed'
  titel?: string
  children: ReactNode
}) {
  const stijl = {
    'let-op': 'bg-let-op/10 border-let-op/30 text-let-op-tekst',
    accent: 'bg-accent/10 border-accent/30 text-accent-soft',
    fout: 'bg-fout/10 border-fout/30 text-fout',
    goed: 'bg-goed/10 border-goed/30 text-goed',
  }[toon]

  return (
    <div className={`rounded-[8px] border px-3 py-2.5 ${stijl}`}>
      {titel !== undefined && <div className="t-eyebrow mb-0.5 uppercase">{titel}</div>}
      <div className="t-caption">{children}</div>
    </div>
  )
}

export function LegeStaat({
  titel,
  uitleg,
  actie,
}: {
  titel: string
  uitleg: string
  actie?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-[12px] border border-line-2 bg-surface-dim px-6 py-10 text-center">
      <div className="t-title text-ink">{titel}</div>
      <p className="t-caption max-w-[36ch] text-ink-muted">{uitleg}</p>
      {actie}
    </div>
  )
}

export function Scheiding() {
  return <div className="h-px bg-line-2" />
}

/** Rij in een lijst, met optionele pijl naar rechts. */
export function Rij({
  titel,
  onder,
  rechts,
  onClick,
  pijl = false,
  gedimd = false,
}: {
  titel: ReactNode
  onder?: ReactNode
  rechts?: ReactNode
  onClick?: () => void
  pijl?: boolean
  gedimd?: boolean
}) {
  const inhoud = (
    <>
      <div className="flex min-w-0 flex-col gap-[3px] text-left">
        <div className="t-body-sm truncate text-ink">{titel}</div>
        {onder !== undefined && <div className="t-caption text-ink-muted">{onder}</div>}
      </div>
      <div className="flex shrink-0 items-center gap-2.5">
        {rechts}
        {pijl && <PijlRechts />}
      </div>
    </>
  )

  const basis = `flex min-h-[56px] w-full items-center justify-between gap-3 px-3.5 py-3 ${
    gedimd ? 'opacity-55' : ''
  }`

  if (onClick === undefined) return <div className={basis}>{inhoud}</div>

  return (
    <button type="button" onClick={onClick} className={`${basis} text-left hover:bg-white/[0.03]`}>
      {inhoud}
    </button>
  )
}

export function PijlRechts() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" className="text-ink-faint" />
    </svg>
  )
}

export function Vink({ className = '' }: { className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" className={className}>
      <path d="M3.2 8.4l3.2 3.2L12.8 5" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function Staafjes({ className = '' }: { className?: string }) {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true" className={className}>
      <path d="M1.5 8.5V5M5 8.5V2M8.5 8.5V6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}
