import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { piep, tril } from '../lib/signalen'

/**
 * De rusttimer.
 *
 * We bewaren het eindtijdstip, niet het aantal resterende seconden. Zo loopt
 * de timer goed door als Android de app even op een lager pitje zet, en klopt
 * hij nog steeds als je terugkomt.
 */

const OPSLAG_SLEUTEL = 'kracht.rusttimer'

interface RustStand {
  /** Tijdstip waarop de rust afgelopen is, in milliseconden sinds 1970. */
  eindMs: number
  totaalSeconden: number
  /** Waar de timer bij hoort, voor het label in de balk. */
  label: string
  subLabel: string
}

interface RustApi {
  actief: boolean
  resterend: number
  totaal: number
  label: string
  subLabel: string
  start: (seconden: number, label: string, subLabel: string) => void
  verleng: (seconden: number) => void
  stop: () => void
}

const Context = createContext<RustApi | null>(null)

function leesOpslag(): RustStand | null {
  try {
    const ruw = localStorage.getItem(OPSLAG_SLEUTEL)
    if (ruw === null) return null
    const stand = JSON.parse(ruw) as RustStand
    if (typeof stand.eindMs !== 'number' || stand.eindMs <= Date.now()) return null
    return stand
  } catch {
    return null
  }
}

function schrijfOpslag(stand: RustStand | null): void {
  try {
    if (stand === null) localStorage.removeItem(OPSLAG_SLEUTEL)
    else localStorage.setItem(OPSLAG_SLEUTEL, JSON.stringify(stand))
  } catch {
    // Privémodus of vol geheugen: de timer werkt dan alleen niet meer over een herstart heen.
  }
}

export function RustTimerProvider({
  children,
  geluidAan,
  trillenAan,
}: {
  children: ReactNode
  geluidAan: boolean
  trillenAan: boolean
}) {
  const [stand, setStand] = useState<RustStand | null>(() => leesOpslag())
  const [nu, setNu] = useState(() => Date.now())
  const afgegaan = useRef(false)

  useEffect(() => {
    if (stand === null) return
    const interval = window.setInterval(() => setNu(Date.now()), 250)
    return () => window.clearInterval(interval)
  }, [stand])

  const resterend = stand === null ? 0 : Math.max(0, Math.ceil((stand.eindMs - nu) / 1000))

  useEffect(() => {
    if (stand === null || afgegaan.current) return
    if (resterend > 0) return

    afgegaan.current = true
    if (geluidAan) piep()
    if (trillenAan) tril()

    // De balk blijft nog even op 0 staan, zodat je ziet dat de rust op is.
    const timeout = window.setTimeout(() => {
      setStand(null)
      schrijfOpslag(null)
    }, 4000)
    return () => window.clearTimeout(timeout)
  }, [resterend, stand, geluidAan, trillenAan])

  const start = useCallback((seconden: number, label: string, subLabel: string) => {
    afgegaan.current = false
    const nieuw: RustStand = {
      eindMs: Date.now() + seconden * 1000,
      totaalSeconden: seconden,
      label,
      subLabel,
    }
    setStand(nieuw)
    setNu(Date.now())
    schrijfOpslag(nieuw)
  }, [])

  const verleng = useCallback((seconden: number) => {
    setStand((huidig) => {
      if (huidig === null) return null
      const eindMs = Math.max(Date.now(), huidig.eindMs + seconden * 1000)
      const nieuw: RustStand = {
        ...huidig,
        eindMs,
        totaalSeconden: Math.max(huidig.totaalSeconden, Math.ceil((eindMs - Date.now()) / 1000)),
      }
      if (eindMs > Date.now()) afgegaan.current = false
      schrijfOpslag(nieuw)
      return nieuw
    })
  }, [])

  const stop = useCallback(() => {
    afgegaan.current = true
    setStand(null)
    schrijfOpslag(null)
  }, [])

  const api = useMemo<RustApi>(
    () => ({
      actief: stand !== null,
      resterend,
      totaal: stand?.totaalSeconden ?? 0,
      label: stand?.label ?? '',
      subLabel: stand?.subLabel ?? '',
      start,
      verleng,
      stop,
    }),
    [stand, resterend, start, verleng, stop],
  )

  return <Context.Provider value={api}>{children}</Context.Provider>
}

export function useRustTimer(): RustApi {
  const api = useContext(Context)
  if (api === null) throw new Error('useRustTimer buiten RustTimerProvider gebruikt')
  return api
}
