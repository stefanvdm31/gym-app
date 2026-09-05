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

/*
 * Over de statusbalk van je telefoon:
 *
 * Die wordt door twee dingen bepaald, en die moeten het eens zijn.
 *  - De ACHTERGROND komt uit `theme_color` in het manifest. Die waarde legt
 *    Android vast op het moment dat je de app installeert en is daarna niet
 *    meer te wijzigen zonder opnieuw te installeren.
 *  - De KLEUR VAN DE ICOONTJES leidt Android af uit de meta-tag `theme-color`
 *    in de pagina, die we wél live kunnen aanpassen.
 *
 * Lieten we die meta meeschakelen met het thema, dan kreeg je in de lichte
 * modus donkere icoontjes op een zwarte balk: onleesbaar. We laten de meta
 * daarom staan op dezelfde donkere waarde als het manifest. De statusbalk is
 * dus in beide thema's donker met lichte icoontjes — altijd leesbaar, en
 * 's avonds in de sportschool geen witte balk in je gezicht.
 */
export function pasThemaToe(effectief: ThemaEffectief): void {
  if (typeof document === 'undefined') return
  document.documentElement.classList.toggle('licht', effectief === 'licht')
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
