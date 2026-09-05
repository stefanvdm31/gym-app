import { klok } from '../lib/date'
import { useRustTimer } from '../state/RustTimer'

/**
 * De rusttimer, altijd zichtbaar zolang hij loopt — ook als je door de app
 * scrolt. Hij staat net boven de onderbalk, buiten de weg van je duim.
 */
export function RustBalk() {
  const rust = useRustTimer()
  if (!rust.actief) return null

  const klaar = rust.resterend <= 0
  const percentage = rust.totaal === 0 ? 0 : Math.max(0, (rust.resterend / rust.totaal) * 100)

  return (
    <div className="shrink-0 px-3 pb-2">
      <div
        className={`mx-auto max-w-[560px] overflow-hidden rounded-[12px] border shadow-[var(--schaduw-zwevend)] ${
          klaar ? 'border-goed/50 bg-goed/10' : 'border-line-4 bg-surface-2'
        }`}
        role="timer"
        aria-live="off"
      >
        <div className="h-[3px] bg-surface-3">
          <div
            className={`h-full transition-[width] duration-200 ${klaar ? 'bg-goed' : 'bg-accent'}`}
            style={{ width: `${percentage}%` }}
          />
        </div>

        <div className="flex flex-col gap-2.5 px-3.5 py-3">
          <div className="flex items-center gap-3">
            <div className="flex shrink-0 items-baseline gap-2">
              <span className="t-eyebrow uppercase text-ink-muted">
                {klaar ? 'Rust voorbij' : 'Rust'}
              </span>
              <span className={`cijfers t-h2 ${klaar ? 'text-goed' : 'text-ink'}`}>
                {klok(rust.resterend)}
              </span>
            </div>
            <div className="flex min-w-0 flex-1 flex-col items-end">
              <span className="t-caption truncate text-ink-2">{rust.label}</span>
              <span className="t-caption truncate text-ink-muted">{rust.subLabel}</span>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => rust.verleng(-30)}
              className="t-body-sm min-h-[48px] flex-1 rounded-[8px] bg-surface-3 font-semibold text-ink hover:bg-line-5"
            >
              &minus;30 s
            </button>
            <button
              type="button"
              onClick={() => rust.verleng(30)}
              className="t-body-sm min-h-[48px] flex-1 rounded-[8px] bg-surface-3 font-semibold text-ink hover:bg-line-5"
            >
              +30 s
            </button>
            <button
              type="button"
              onClick={rust.stop}
              className="t-body-sm flex min-h-[48px] flex-1 items-center justify-center gap-1.5 rounded-[8px] border border-line-5 text-ink-2 hover:border-ink-muted"
            >
              <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path d="M3 3l5 4-5 4M10.5 3v8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {klaar ? 'Sluiten' : 'Sla over'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
