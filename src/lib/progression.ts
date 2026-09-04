import type { Exercise, SetLog } from '../db/types'
import { afrondenOpStap, getal, kg } from './format'

/**
 * Dubbele progressie.
 *
 * Je werkt binnen een herhalingsbereik (bijvoorbeeld 8-10). Zolang je de
 * bovenkant niet in alle sets haalt, probeer je er herhalingen bij te doen.
 * Haal je de bovenkant in alle sets, dan gaat het gewicht een stap omhoog en
 * begin je onderin het bereik opnieuw.
 *
 * Het advies wordt nooit automatisch ingevuld: het staat als suggestie in
 * beeld en jij bepaalt wat je doet.
 */

export type AdviesSoort = 'eerste-keer' | 'gewicht-omhoog' | 'reps-omhoog' | 'zwaarder-maken'

export interface ProgressieAdvies {
  soort: AdviesSoort
  /** null bij 'eerste-keer' en bij tijdgebonden lichaamsgewichtsoefeningen. */
  gewichtKg: number | null
  /** Advies per set. Bij tijdgebonden oefeningen zijn dit seconden. */
  perSet: number[]
  /** Korte zin voor op het scherm. */
  tekst: string
}

export interface VorigeUitvoering {
  gewichtKg: number
  /** Reps, of seconden bij een tijdgebonden oefening. */
  waarden: number[]
}

/**
 * Haalt uit een lijst gelogde sets de vorige uitvoering: het gewicht van de
 * zwaarste werkset en de behaalde reps of seconden per set.
 */
export function vorigeUitvoeringUitSets(
  exercise: Exercise,
  sets: SetLog[],
): VorigeUitvoering | null {
  const werksets = sets.filter((s) => s.voltooid && !s.isOpwarm)
  if (werksets.length === 0) return null

  const waarden = werksets.map((s) =>
    exercise.isTijdgebonden ? (s.seconden ?? 0) : s.reps,
  )
  const gewichtKg = Math.max(...werksets.map((s) => s.gewichtKg))
  return { gewichtKg, waarden }
}

/**
 * Berekent het advies voor vandaag.
 *
 * @param aantalSets Het aantal sets dat vandaag op het programma staat.
 */
export function berekenAdvies(
  exercise: Exercise,
  vorige: VorigeUitvoering | null,
  aantalSets: number,
): ProgressieAdvies {
  const { repMin, repMax, isTijdgebonden, isLichaamsgewicht, gewichtsstapKg } = exercise
  const sets = Math.max(1, aantalSets)
  const eenheid = isTijdgebonden ? 'seconden' : 'herhalingen'

  if (vorige === null || vorige.waarden.length === 0) {
    return {
      soort: 'eerste-keer',
      gewichtKg: null,
      perSet: Array<number>(sets).fill(repMin),
      tekst: isTijdgebonden
        ? `Eerste keer: houd ${repMin} seconden aan en stop zodra je vorm verslapt`
        : `Eerste keer: kies een gewicht waarmee je ${repMin} haalt met 2-3 herhalingen over`,
    }
  }

  // Alleen sets die vandaag ook op het programma staan tellen mee in de vraag
  // "haalde ik in alle sets de bovenkant?".
  const relevant = vorige.waarden.slice(0, sets)
  const alleBovenkant = relevant.length >= sets && relevant.every((v) => v >= repMax)

  if (alleBovenkant) {
    // Bij een tijdgebonden lichaamsgewichtsoefening bestaat er geen gewicht om
    // omhoog te doen: daar komt progressie uit hefboom en tempo.
    if (isTijdgebonden && isLichaamsgewicht) {
      return {
        soort: 'zwaarder-maken',
        gewichtKg: null,
        perSet: Array<number>(sets).fill(repMin),
        tekst: `Je haalde overal ${repMax} seconden. Maak de oefening zwaarder (hefboom of tempo) en begin weer op ${repMin} seconden. Noteer bij de oefening wat je hebt aangepast`,
      }
    }

    const nieuwGewicht = afrondenOpStap(vorige.gewichtKg + gewichtsstapKg, gewichtsstapKg)
    return {
      soort: 'gewicht-omhoog',
      gewichtKg: nieuwGewicht,
      perSet: Array<number>(sets).fill(repMin),
      tekst: `Vorige keer overal ${repMax} ${eenheid}. Ga naar ${kg(nieuwGewicht, { toonPlus: isLichaamsgewicht })} en mik op ${repMin} ${eenheid}`,
    }
  }

  const perSet: number[] = []
  for (let i = 0; i < sets; i += 1) {
    const vorigeWaarde = relevant[i] ?? relevant[relevant.length - 1] ?? repMin
    perSet.push(Math.min(repMax, vorigeWaarde + 1))
  }

  const zelfdeGewicht = afrondenOpStap(vorige.gewichtKg, gewichtsstapKg)
  const doelTekst = perSet.every((v) => v === perSet[0])
    ? `${perSet[0]}`
    : perSet.map((v) => getal(v)).join(' · ')

  return {
    soort: 'reps-omhoog',
    gewichtKg: zelfdeGewicht,
    perSet,
    tekst: isTijdgebonden
      ? `Blijf op ${kg(zelfdeGewicht, { toonPlus: isLichaamsgewicht })} en probeer ${doelTekst} seconden per set`
      : `Blijf op ${kg(zelfdeGewicht, { toonPlus: isLichaamsgewicht })} en probeer ${doelTekst} ${eenheid} per set`,
  }
}

/**
 * Wat is er nog nodig om het gewicht omhoog te mogen doen? Voor de
 * progressiepagina, zodat je ziet hoe dichtbij je zit.
 */
export function watNogNodig(
  exercise: Exercise,
  vorige: VorigeUitvoering | null,
  aantalSets: number,
): string | null {
  if (vorige === null) return null
  const relevant = vorige.waarden.slice(0, aantalSets)
  if (relevant.length < aantalSets) return null

  const tekort = relevant.reduce((som, v) => som + Math.max(0, exercise.repMax - v), 0)
  if (tekort === 0) return null

  const eenheid = exercise.isTijdgebonden ? 'seconden' : 'herhalingen'
  const volgend = afrondenOpStap(
    vorige.gewichtKg + exercise.gewichtsstapKg,
    exercise.gewichtsstapKg,
  )
  const nodig = `Nog ${getal(tekort)} ${eenheid} te gaan`
  return exercise.isTijdgebonden && exercise.isLichaamsgewicht
    ? `${nodig} tot je de oefening zwaarder maakt`
    : `${nodig} tot ${kg(volgend, { toonPlus: exercise.isLichaamsgewicht })}`
}
