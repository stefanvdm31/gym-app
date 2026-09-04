import type { Exercise, IsoDatum, PrSoort, SetLog } from '../db/types'

/**
 * Persoonlijke records.
 *
 * Er zijn vier soorten, en welke gelden hangt af van het type oefening:
 *
 *  - Gewone oefening: 'gewicht' (zwaarste gewicht) en 'e1rm' (beste geschatte
 *    1RM volgens Epley).
 *  - Lichaamsgewichtsoefening: 'gewicht' (hoogste toegevoegde gewicht) en
 *    'reps' (meeste herhalingen bij datzelfde toegevoegde gewicht). Epley
 *    zegt niets zinnigs als het gewicht 0 is.
 *  - Tijdgebonden oefening: 'tijd' (langste volgehouden tijd).
 */

/** Geschatte 1RM volgens Epley. */
export function epley(gewichtKg: number, reps: number): number {
  if (gewichtKg <= 0 || reps <= 0) return 0
  return gewichtKg * (1 + reps / 30)
}

/** Eén gelogde set, met genoeg context om hem terug te vinden. */
export interface SetMetContext {
  /** Unieke sleutel binnen de historie van deze oefening. */
  sleutel: string
  datum: IsoDatum
  sessieId: string
  set: SetLog
}

export interface PrTreffer {
  sleutel: string
  soorten: PrSoort[]
}

interface Stand {
  besteGewicht: number
  besteE1rm: number
  besteSeconden: number
  /** Voor lichaamsgewichtsoefeningen: meeste reps per toegevoegd gewicht. */
  repsPerGewicht: Map<number, number>
}

function legeStand(): Stand {
  return {
    besteGewicht: Number.NEGATIVE_INFINITY,
    besteE1rm: 0,
    besteSeconden: 0,
    repsPerGewicht: new Map(),
  }
}

function teltMee(set: SetLog): boolean {
  if (!set.voltooid) return false
  if (set.isOpwarm) return false
  return true
}

/**
 * Loopt de historie van één oefening chronologisch door en bepaalt welke sets
 * op dat moment een record braken. Dit is opnieuw uit te rekenen zonder dat
 * de uitkomst verandert, dus we draaien het gewoon na elke wijziging.
 *
 * De sets moeten van oud naar nieuw aangeleverd worden.
 */
export function bepaalPrs(exercise: Exercise, historie: SetMetContext[]): PrTreffer[] {
  const stand = legeStand()
  const treffers: PrTreffer[] = []

  for (const item of historie) {
    const { set } = item
    if (!teltMee(set)) continue

    const soorten: PrSoort[] = []

    if (exercise.isTijdgebonden) {
      const seconden = set.seconden ?? 0
      if (seconden > 0 && seconden > stand.besteSeconden) {
        soorten.push('tijd')
        stand.besteSeconden = seconden
      }
    } else if (exercise.isLichaamsgewicht) {
      if (set.reps > 0) {
        if (set.gewichtKg > stand.besteGewicht) {
          soorten.push('gewicht')
          stand.besteGewicht = set.gewichtKg
        }
        const besteBijDitGewicht = stand.repsPerGewicht.get(set.gewichtKg) ?? 0
        if (set.reps > besteBijDitGewicht) {
          // Alleen een reps-record als je op of boven je zwaarste gewicht zit.
          // Anders is 20 reps met hulpband elke week weer een 'record'. En is
          // dit meteen ook een gewichtsrecord, dan zegt dat al genoeg: dan
          // melden we niet twee records voor dezelfde set.
          const isOokGewichtsrecord = soorten.includes('gewicht')
          if (set.gewichtKg >= stand.besteGewicht && !isOokGewichtsrecord) {
            soorten.push('reps')
          }
          stand.repsPerGewicht.set(set.gewichtKg, set.reps)
        }
      }
    } else {
      if (set.gewichtKg > 0 && set.reps > 0) {
        if (set.gewichtKg > stand.besteGewicht) {
          soorten.push('gewicht')
          stand.besteGewicht = set.gewichtKg
        }
        const e1rm = epley(set.gewichtKg, set.reps)
        if (e1rm > stand.besteE1rm + 0.001) {
          soorten.push('e1rm')
          stand.besteE1rm = e1rm
        }
      }
    }

    if (soorten.length > 0) treffers.push({ sleutel: item.sleutel, soorten })
  }

  return treffers
}

export interface BesteRecords {
  besteGewicht: { waarde: number; reps: number; datum: IsoDatum } | null
  besteE1rm: { waarde: number; gewicht: number; reps: number; datum: IsoDatum } | null
  besteSeconden: { waarde: number; datum: IsoDatum } | null
}

/** De huidige records van één oefening, voor de recordspagina. */
export function besteRecords(exercise: Exercise, historie: SetMetContext[]): BesteRecords {
  const uit: BesteRecords = { besteGewicht: null, besteE1rm: null, besteSeconden: null }

  for (const { set, datum } of historie) {
    if (!teltMee(set)) continue

    if (exercise.isTijdgebonden) {
      const seconden = set.seconden ?? 0
      if (seconden > 0 && (uit.besteSeconden === null || seconden > uit.besteSeconden.waarde)) {
        uit.besteSeconden = { waarde: seconden, datum }
      }
      continue
    }

    if (set.reps <= 0) continue

    if (uit.besteGewicht === null || set.gewichtKg > uit.besteGewicht.waarde) {
      uit.besteGewicht = { waarde: set.gewichtKg, reps: set.reps, datum }
    }

    if (!exercise.isLichaamsgewicht && set.gewichtKg > 0) {
      const e1rm = epley(set.gewichtKg, set.reps)
      if (uit.besteE1rm === null || e1rm > uit.besteE1rm.waarde) {
        uit.besteE1rm = { waarde: e1rm, gewicht: set.gewichtKg, reps: set.reps, datum }
      }
    }
  }

  return uit
}

export function prSoortLabel(soort: PrSoort): string {
  switch (soort) {
    case 'gewicht':
      return 'zwaarste gewicht'
    case 'e1rm':
      return 'beste geschatte 1RM'
    case 'reps':
      return 'meeste herhalingen'
    case 'tijd':
      return 'langste tijd'
  }
}
