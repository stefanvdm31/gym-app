import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { getal, leesGetal } from '../../lib/format'

export function Veld({
  label,
  hulp,
  fout,
  children,
}: {
  label: string
  hulp?: string
  fout?: string | null
  children: ReactNode
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="t-eyebrow text-ink-muted uppercase">{label}</span>
      {children}
      {fout != null && fout !== '' ? (
        <span className="t-caption text-fout">{fout}</span>
      ) : hulp !== undefined ? (
        <span className="t-caption text-ink-muted">{hulp}</span>
      ) : null}
    </label>
  )
}

const INVOER_BASIS =
  'w-full min-h-[48px] rounded-[4px] border border-line-4 bg-surface-2 px-3 text-ink t-body-sm placeholder:text-ink-faint focus:border-accent focus:outline-none'

export function TekstVeld({
  waarde,
  onWijzig,
  placeholder,
  type = 'text',
  inputMode,
}: {
  waarde: string
  onWijzig: (v: string) => void
  placeholder?: string
  type?: string
  inputMode?: 'text' | 'decimal' | 'numeric' | 'url'
}) {
  return (
    <input
      type={type}
      inputMode={inputMode}
      value={waarde}
      placeholder={placeholder}
      onChange={(e) => onWijzig(e.target.value)}
      className={INVOER_BASIS}
    />
  )
}

export function TekstGebied({
  waarde,
  onWijzig,
  placeholder,
  regels = 4,
}: {
  waarde: string
  onWijzig: (v: string) => void
  placeholder?: string
  regels?: number
}) {
  return (
    <textarea
      value={waarde}
      rows={regels}
      placeholder={placeholder}
      onChange={(e) => onWijzig(e.target.value)}
      className={`${INVOER_BASIS} resize-y py-3 leading-relaxed`}
    />
  )
}

export function Keuze<T extends string>({
  waarde,
  opties,
  onWijzig,
}: {
  waarde: T
  opties: Array<{ waarde: T; label: string }>
  onWijzig: (v: T) => void
}) {
  return (
    <select
      value={waarde}
      onChange={(e) => onWijzig(e.target.value as T)}
      className={`${INVOER_BASIS} appearance-none bg-[length:16px] pr-9`}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='none' stroke='%238e8b87' stroke-width='1.6'%3E%3Cpath d='M4 6l4 4 4-4'/%3E%3C/svg%3E\")",
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 12px center',
      }}
    >
      {opties.map((o) => (
        <option key={o.waarde} value={o.waarde}>
          {o.label}
        </option>
      ))}
    </select>
  )
}

export function Schakelaar({
  aan,
  onWijzig,
  label,
  uitleg,
}: {
  aan: boolean
  onWijzig: (v: boolean) => void
  label: string
  uitleg?: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={aan}
      onClick={() => onWijzig(!aan)}
      className="flex min-h-[56px] w-full items-center justify-between gap-4 px-3.5 py-3 text-left"
    >
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="t-body-sm text-ink">{label}</span>
        {uitleg !== undefined && <span className="t-caption text-ink-muted">{uitleg}</span>}
      </span>
      <span
        className={`flex h-[30px] w-[52px] shrink-0 items-center rounded-full border px-[3px] transition-colors ${
          aan ? 'border-accent bg-accent' : 'border-line-4 bg-surface-2'
        }`}
      >
        {/* Uit staat het knopje op inktkleur: wit-op-wit is in de lichte
            modus niet te zien. */}
        <span
          className={`h-[22px] w-[22px] rounded-full transition-transform ${
            aan ? 'translate-x-[22px] bg-white' : 'translate-x-0 bg-ink'
          }`}
        />
      </span>
    </button>
  )
}

/**
 * Rij knoppen waarvan er precies één aan staat. Alles is meteen zichtbaar,
 * dus je hoeft geen lijst open te klappen om te zien wat er te kiezen valt.
 */
export function Segment<T extends string>({
  waarde,
  opties,
  onWijzig,
  label,
}: {
  waarde: T
  opties: Array<{ waarde: T; label: string }>
  onWijzig: (v: T) => void
  label: string
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="flex gap-1 rounded-[8px] border border-line-3 bg-surface-2 p-1"
    >
      {opties.map((optie) => {
        const aan = optie.waarde === waarde
        return (
          <button
            key={optie.waarde}
            type="button"
            role="radio"
            aria-checked={aan}
            onClick={() => onWijzig(optie.waarde)}
            className={`t-body-sm min-h-[48px] flex-1 rounded-[5px] px-2 font-medium transition-colors ${
              aan ? 'bg-accent text-white' : 'text-ink-2 hover:bg-ink/[0.05]'
            }`}
          >
            {optie.label}
          </button>
        )
      })}
    </div>
  )
}

/**
 * Getalinvoer met plus- en minknoppen én de mogelijkheid het getal direct te
 * typen. De tikvlakken zijn ruim: dit is de knop die je met natte handen en
 * buiten adem raakt.
 */
export function GetalStapper({
  waarde,
  stap,
  onWijzig,
  min = Number.NEGATIVE_INFINITY,
  max = Number.POSITIVE_INFINITY,
  achtervoegsel,
  decimalen = 2,
  compact = false,
  ariaLabel,
}: {
  waarde: number
  stap: number
  onWijzig: (v: number) => void
  min?: number
  max?: number
  achtervoegsel?: string
  decimalen?: number
  compact?: boolean
  ariaLabel: string
}) {
  const [typen, setTypen] = useState(false)
  const [ruwe, setRuwe] = useState('')
  const invoerRef = useRef<HTMLInputElement>(null)

  /*
   * Elke tik gaat naar de database en komt daarna pas terug als nieuwe waarde.
   * Tik je snel achter elkaar, dan zou je zonder deze tussenstand tikken
   * kwijtraken. We houden daarom zelf bij waar we naartoe onderweg zijn en
   * nemen de waarde van buiten pas weer over zodra die is bijgetrokken.
   */
  const [zichtbaar, setZichtbaar] = useState(waarde)
  const doelRef = useRef(waarde)
  const verzondenRef = useRef<number | null>(null)

  useEffect(() => {
    if (verzondenRef.current === null || waarde === verzondenRef.current) {
      verzondenRef.current = null
      doelRef.current = waarde
      setZichtbaar(waarde)
    }
  }, [waarde])

  useEffect(() => {
    if (typen) invoerRef.current?.select()
  }, [typen])

  const begrens = (v: number): number => Math.min(max, Math.max(min, Math.round(v * 1000) / 1000))

  const zetWaarde = (nieuw: number): void => {
    const begrensd = begrens(nieuw)
    doelRef.current = begrensd
    verzondenRef.current = begrensd
    setZichtbaar(begrensd)
    onWijzig(begrensd)
  }

  const stapper = (richting: 1 | -1): void => {
    zetWaarde(doelRef.current + richting * stap)
  }

  const bevestigTypen = (): void => {
    const gelezen = leesGetal(ruwe)
    if (gelezen !== null) zetWaarde(gelezen)
    setTypen(false)
  }

  const hoogte = compact ? 'h-[48px]' : 'h-[52px]'
  const knopBreedte = compact ? 'w-[42px]' : 'w-[48px]'

  return (
    <div
      className={`flex ${hoogte} items-center rounded-[4px] border border-line-4 bg-surface-2`}
      role="group"
      aria-label={ariaLabel}
    >
      <button
        type="button"
        aria-label={`${ariaLabel} omlaag`}
        onClick={() => stapper(-1)}
        className={`${knopBreedte} flex h-full shrink-0 items-center justify-center text-[22px] leading-none text-ink-muted hover:text-ink active:text-ink`}
      >
        &minus;
      </button>

      {typen ? (
        <input
          ref={invoerRef}
          type="text"
          inputMode="decimal"
          value={ruwe}
          onChange={(e) => setRuwe(e.target.value)}
          onBlur={bevestigTypen}
          onKeyDown={(e) => {
            if (e.key === 'Enter') bevestigTypen()
            if (e.key === 'Escape') setTypen(false)
          }}
          className="cijfers h-full min-w-0 flex-1 bg-transparent text-center text-[17px] font-medium text-ink focus:outline-none"
        />
      ) : (
        <button
          type="button"
          onClick={() => {
            setRuwe(getal(zichtbaar, decimalen))
            setTypen(true)
          }}
          className="cijfers h-full min-w-0 flex-1 truncate px-1 text-center text-[17px] font-medium text-ink"
        >
          {getal(zichtbaar, decimalen)}
          {achtervoegsel !== undefined && (
            <span className="t-caption ml-1 text-ink-muted">{achtervoegsel}</span>
          )}
        </button>
      )}

      <button
        type="button"
        aria-label={`${ariaLabel} omhoog`}
        onClick={() => stapper(1)}
        className={`${knopBreedte} flex h-full shrink-0 items-center justify-center text-[22px] leading-none text-ink-muted hover:text-ink active:text-ink`}
      >
        +
      </button>
    </div>
  )
}
