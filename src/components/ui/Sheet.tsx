import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { Knop, IcoonKnop } from './Knop'

/**
 * Paneel dat vanaf de onderkant opkomt. Alle acties zitten binnen duimbereik
 * en er is altijd een sluitknop — sluiten mag nooit alleen met een veegbeweging.
 */
export function Sheet({
  open,
  titel,
  onSluit,
  children,
  voet,
}: {
  open: boolean
  titel: string
  onSluit: () => void
  children: ReactNode
  voet?: ReactNode
}) {
  useEffect(() => {
    if (!open) return
    const bij = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onSluit()
    }
    document.addEventListener('keydown', bij)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', bij)
      document.body.style.overflow = ''
    }
  }, [open, onSluit])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="Sluiten"
        onClick={onSluit}
        className="absolute inset-0 bg-black/60"
      />
      <div className="veilig-onder relative flex max-h-[88vh] w-full max-w-[520px] flex-col rounded-t-[16px] border border-line-3 bg-shell sm:rounded-[16px]">
        <div className="flex shrink-0 items-center gap-2 border-b border-line-2 py-2 pr-2 pl-4">
          <div className="t-body-sm flex-1 font-semibold text-ink">{titel}</div>
          <IcoonKnop label="Sluiten" onClick={onSluit}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
            </svg>
          </IcoonKnop>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">{children}</div>
        {voet !== undefined && (
          <div className="shrink-0 border-t border-line-2 p-3">{voet}</div>
        )}
      </div>
    </div>
  )
}

/** Bevestiging voor iets dat je niet zomaar ongedaan maakt. */
export function Bevestig({
  open,
  titel,
  tekst,
  bevestigLabel = 'Doorgaan',
  gevaarlijk = false,
  onBevestig,
  onAnnuleer,
}: {
  open: boolean
  titel: string
  tekst: ReactNode
  bevestigLabel?: string
  gevaarlijk?: boolean
  onBevestig: () => void
  onAnnuleer: () => void
}) {
  return (
    <Sheet
      open={open}
      titel={titel}
      onSluit={onAnnuleer}
      voet={
        <div className="flex gap-2">
          <Knop soort="stil" vol onClick={onAnnuleer}>
            Annuleren
          </Knop>
          <Knop soort={gevaarlijk ? 'gevaar' : 'primair'} vol onClick={onBevestig}>
            {bevestigLabel}
          </Knop>
        </div>
      }
    >
      <div className="t-body-sm text-ink-2">{tekst}</div>
    </Sheet>
  )
}
