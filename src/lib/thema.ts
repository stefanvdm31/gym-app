/**
 * Licht of donker.
 *
 * De keuze staat in je instellingen (en gaat dus mee in je back-up), maar
 * wordt ook los in de browseropslag gezet. Dat laatste is nodig omdat de
 * database pas beschikbaar is als de app al draait: zonder die kopie zou je
 * bij elke start een korte flits van het verkeerde thema zien.
 *
 * Het script dat die kopie uitleest staat in index.html en draait vóór het
 * eerste beeld. Verander je hier iets aan de sleutel of de kleuren, pas het
 * daar dan ook aan.
 */

export type ThemaKeuze = 'systeem' | 'licht' | 'donker'
export type ThemaEffectief = 'licht' | 'donker'

export const THEMA_SLEUTEL = 'kracht.thema'

/** Achtergrondkleur van de Android-statusbalk, per thema. */
const STATUSBALK: Record<ThemaEffectief, string> = {
  donker: '#101010',
  licht: '#f6f5f4',
}

export function systeemThema(): ThemaEffectief {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return 'donker'
  // Alleen een uitgesproken voorkeur voor licht maakt het licht. Weet het
  // toestel het niet, dan blijft donker de veilige keuze in de sportschool.
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'licht' : 'donker'
}

export function bepaalThema(keuze: ThemaKeuze): ThemaEffectief {
  if (keuze === 'licht') return 'licht'
  if (keuze === 'donker') return 'donker'
  return systeemThema()
}

export function pasThemaToe(effectief: ThemaEffectief): void {
  if (typeof document === 'undefined') return
  document.documentElement.classList.toggle('licht', effectief === 'licht')
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', STATUSBALK[effectief])
}

export function bewaarKeuzeLokaal(keuze: ThemaKeuze): void {
  try {
    localStorage.setItem(THEMA_SLEUTEL, keuze)
  } catch {
    // Privémodus of vol geheugen: dan zie je bij de volgende start heel even
    // het donkere thema voordat je keuze uit de database komt.
  }
}

export function themaLabel(keuze: ThemaKeuze): string {
  switch (keuze) {
    case 'systeem':
      return 'Volg systeem'
    case 'licht':
      return 'Licht'
    case 'donker':
      return 'Donker'
  }
}
