import type { BodyWeight, GewichtsDoel, IsoDatum } from '../db/types'
import { dagenVerschil, vandaagIso } from './date'

/**
 * Lichaamsgewicht: dagpunten plus een lopend gemiddelde over 7 dagen.
 *
 * Het weekgemiddelde is het eerlijke getal om op te sturen. Een losse weging
 * schommelt met vocht, zout en darminhoud; het gemiddelde niet.
 */

export interface GewichtPunt {
  datum: IsoDatum
  gewichtKg: number
  /** null zolang er in de zeven dagen ervoor niets gemeten is. */
  weekGemiddelde: number | null
}

/** Verwacht wegingen op datum-volgorde (oud naar nieuw). */
export function metWeekGemiddelde(wegingen: BodyWeight[]): GewichtPunt[] {
  const gesorteerd = [...wegingen].sort((a, b) => a.datum.localeCompare(b.datum))

  return gesorteerd.map((weging, i) => {
    const venster: number[] = []
    for (let j = i; j >= 0; j -= 1) {
      const kandidaat = gesorteerd[j]
      if (kandidaat === undefined) break
      if (dagenVerschil(kandidaat.datum, weging.datum) > 6) break
      venster.push(kandidaat.gewichtKg)
    }
    const gemiddelde =
      venster.length === 0 ? null : venster.reduce((a, b) => a + b, 0) / venster.length
    return { datum: weging.datum, gewichtKg: weging.gewichtKg, weekGemiddelde: gemiddelde }
  })
}

export type TempoOordeel = 'op-schema' | 'te-snel' | 'te-langzaam' | 'verkeerde-kant' | 'onbekend'

export interface TempoAnalyse {
  huidigGemiddelde: number | null
  vorigGemiddelde: number | null
  /** Verandering in kg per week. Positief is aankomen. */
  veranderingKgPerWeek: number | null
  oordeel: TempoOordeel
  tekst: string
}

/**
 * Vergelijkt het weekgemiddelde van nu met dat van een week eerder en
 * beoordeelt of dat binnen je doeltempo valt.
 */
export function analyseerTempo(
  punten: GewichtPunt[],
  doel: GewichtsDoel,
  tempoMin: number,
  tempoMax: number,
): TempoAnalyse {
  const laatste = punten.at(-1)
  if (laatste === undefined || laatste.weekGemiddelde === null) {
    return {
      huidigGemiddelde: null,
      vorigGemiddelde: null,
      veranderingKgPerWeek: null,
      oordeel: 'onbekend',
      tekst: 'Nog te weinig wegingen voor een weekgemiddelde',
    }
  }

  // Zoek het punt dat het dichtst bij precies zeven dagen eerder ligt.
  let vorig: GewichtPunt | null = null
  let besteAfstand = Number.POSITIVE_INFINITY
  for (const punt of punten) {
    if (punt.weekGemiddelde === null) continue
    const dagen = dagenVerschil(punt.datum, laatste.datum)
    if (dagen < 4 || dagen > 14) continue
    const afstand = Math.abs(dagen - 7)
    if (afstand < besteAfstand) {
      besteAfstand = afstand
      vorig = punt
    }
  }

  if (vorig === null || vorig.weekGemiddelde === null) {
    return {
      huidigGemiddelde: laatste.weekGemiddelde,
      vorigGemiddelde: null,
      veranderingKgPerWeek: null,
      oordeel: 'onbekend',
      tekst: 'Nog geen weekgemiddelde van vorige week om mee te vergelijken',
    }
  }

  const dagen = dagenVerschil(vorig.datum, laatste.datum)
  const verandering = ((laatste.weekGemiddelde - vorig.weekGemiddelde) / dagen) * 7

  const oordeel = beoordeel(verandering, doel, tempoMin, tempoMax)
  return {
    huidigGemiddelde: laatste.weekGemiddelde,
    vorigGemiddelde: vorig.weekGemiddelde,
    veranderingKgPerWeek: verandering,
    oordeel,
    tekst: oordeelTekst(oordeel, doel, tempoMin, tempoMax),
  }
}

function beoordeel(
  verandering: number,
  doel: GewichtsDoel,
  tempoMin: number,
  tempoMax: number,
): TempoOordeel {
  if (doel === 'behouden') {
    return Math.abs(verandering) <= tempoMax ? 'op-schema' : 'te-snel'
  }

  const richting = doel === 'aankomen' ? 1 : -1
  const inRichting = verandering * richting

  if (inRichting < 0) return 'verkeerde-kant'
  if (inRichting < tempoMin) return 'te-langzaam'
  if (inRichting > tempoMax) return 'te-snel'
  return 'op-schema'
}

function oordeelTekst(
  oordeel: TempoOordeel,
  doel: GewichtsDoel,
  tempoMin: number,
  tempoMax: number,
): string {
  const bereik = `${tempoMin.toLocaleString('nl-NL')}-${tempoMax.toLocaleString('nl-NL')} kg per week`
  switch (oordeel) {
    case 'op-schema':
      return doel === 'behouden'
        ? 'Je blijft stabiel op gewicht'
        : `Binnen je doeltempo van ${bereik}`
    case 'te-snel':
      return doel === 'behouden'
        ? 'Je gewicht schuift meer dan je wilt'
        : `Sneller dan je doeltempo van ${bereik}`
    case 'te-langzaam':
      return `Langzamer dan je doeltempo van ${bereik}`
    case 'verkeerde-kant':
      return doel === 'aankomen'
        ? 'Je gaat omlaag terwijl je wilt aankomen'
        : 'Je gaat omhoog terwijl je wilt afvallen'
    case 'onbekend':
      return 'Nog te weinig gegevens'
  }
}

/** Is er vandaag al gewogen? */
export function isVandaagGewogen(wegingen: BodyWeight[]): boolean {
  const vandaag = vandaagIso()
  return wegingen.some((w) => w.datum === vandaag)
}
