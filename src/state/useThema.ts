import { useEffect } from 'react'
import {
  bepaalThema,
  bewaarKeuzeLokaal,
  pasThemaToe,
  type ThemaKeuze,
} from '../lib/thema'

/**
 * Houdt het uiterlijk in de pas met je instelling.
 *
 * Zolang de instellingen nog uit de database komen (`undefined`) doen we
 * niets: het scriptje in index.html heeft dan al het juiste thema gezet op
 * basis van de vorige keer.
 *
 * Staat de keuze op 'systeem', dan luisteren we ook naar je telefoon: schakelt
 * die 's avonds naar donker, dan gaat de app meteen mee zonder herstart.
 */
export function useThema(keuze: ThemaKeuze | undefined): void {
  useEffect(() => {
    if (keuze === undefined) return

    bewaarKeuzeLokaal(keuze)
    const werkBij = (): void => pasThemaToe(bepaalThema(keuze))
    werkBij()

    if (keuze !== 'systeem') return
    const voorkeur = window.matchMedia('(prefers-color-scheme: light)')
    voorkeur.addEventListener('change', werkBij)
    return () => voorkeur.removeEventListener('change', werkBij)
  }, [keuze])
}
