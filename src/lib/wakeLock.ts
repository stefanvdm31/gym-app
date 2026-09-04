import { useEffect } from 'react'

/**
 * Houdt het scherm aan tijdens een training (Wake Lock API).
 *
 * Android geeft de lock vrij zodra je de app naar de achtergrond stuurt, dus
 * we vragen hem opnieuw aan zodra je terugkomt.
 */
export function useWakeLock(actief: boolean): void {
  useEffect(() => {
    if (!actief) return
    if (!('wakeLock' in navigator)) return

    let lock: WakeLockSentinel | null = null
    let gestopt = false

    const vraagAan = async (): Promise<void> => {
      try {
        if (gestopt || document.visibilityState !== 'visible') return
        lock = await navigator.wakeLock.request('screen')
      } catch {
        // Bijvoorbeeld bij een lage accustand. Geen probleem: het scherm gaat
        // dan gewoon uit zoals normaal.
      }
    }

    const bijZichtbaar = (): void => {
      if (document.visibilityState === 'visible') void vraagAan()
    }

    void vraagAan()
    document.addEventListener('visibilitychange', bijZichtbaar)

    return () => {
      gestopt = true
      document.removeEventListener('visibilitychange', bijZichtbaar)
      void lock?.release().catch(() => undefined)
    }
  }, [actief])
}
