/**
 * De recordmelding: een pil die bovenaan het scherm binnenglijdt.
 *
 * Hij staat bewust bovenin, ver weg van de rusttimer en de hoofdknop onderin.
 * Zo kun je tijdens je rust gewoon op −30 s, +30 s of Sla over tikken terwijl
 * de melding nog in beeld staat. De pil vangt geen tikken op
 * (`pointer-events-none`), dus ook wat eronder zit blijft bruikbaar.
 */
export function RecordPil({ waarde, sluit }: { waarde: string; sluit: boolean }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[80] flex justify-center px-4 pt-[max(env(safe-area-inset-top),10px)]">
      <div
        role="status"
        aria-live="polite"
        className={`flex max-w-full items-center gap-2.5 rounded-full border border-goed/45 bg-[color-mix(in_srgb,var(--color-goed)_16%,var(--color-surface-2))] py-2.5 pr-4 pl-3.5 shadow-[0_6px_20px_rgba(0,0,0,0.5),0_0_0_1px_rgba(69,198,94,0.18)] ${
          sluit ? 'pil-weg' : 'pil-binnen'
        }`}
      >
        <span aria-hidden="true" className="text-[17px] leading-none">
          🔥
        </span>
        <span className="t-body-sm min-w-0 truncate">
          <span className="text-goed">Lekker! Nieuw PR: </span>
          <span className="cijfers font-semibold text-ink">{waarde}</span>
        </span>
      </div>
    </div>
  )
}
