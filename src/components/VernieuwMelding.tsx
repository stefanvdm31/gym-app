import { useRegisterSW } from 'virtual:pwa-register/react'
import { Knop } from './ui/Knop'

/**
 * Nieuwe versie beschikbaar? Dan vraagt de app netjes of je wilt vernieuwen,
 * in plaats van halverwege je training om te vallen. Klik je niet, dan blijft
 * de oude versie gewoon werken tot je de app opnieuw opent.
 */
export function VernieuwMelding() {
  const {
    needRefresh: [moetVernieuwen, setMoetVernieuwen],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registratie) {
      // Eens per uur kijken of er een nieuwe versie klaarstaat.
      if (registratie === undefined) return
      window.setInterval(
        () => {
          void registratie.update().catch(() => undefined)
        },
        60 * 60 * 1000,
      )
    },
  })

  if (!moetVernieuwen) return null

  return (
    <div className="fixed inset-x-0 top-0 z-[70] flex justify-center px-4 pt-[max(env(safe-area-inset-top),8px)]">
      <div className="flex w-full max-w-[520px] items-center gap-3 rounded-[12px] border border-accent/40 bg-surface-2 px-3.5 py-3 shadow-[var(--schaduw-hoog)]">
        <div className="min-w-0 flex-1">
          <div className="t-body-sm font-semibold text-ink">Nieuwe versie klaar</div>
          <div className="t-caption text-ink-muted">Je gegevens blijven staan.</div>
        </div>
        <Knop maat="klein" soort="stil" onClick={() => setMoetVernieuwen(false)}>
          Later
        </Knop>
        <Knop maat="klein" soort="primair" onClick={() => void updateServiceWorker(true)}>
          Vernieuwen
        </Knop>
      </div>
    </div>
  )
}
