import { db } from '../db/db'
import { haalVorigeSets } from '../db/repo'
import type { Exercise, WorkoutTemplate } from '../db/types'
import { berekenAdvies, vorigeUitvoeringUitSets, type ProgressieAdvies } from './progression'

export interface SchemaRegel {
  exercise: Exercise
  aantalSets: number
  repMin: number
  repMax: number
  notitie?: string
  advies: ProgressieAdvies
  /** Kort zinnetje over de vorige keer, of null als je hem nog nooit deed. */
  vorigeTekst: string | null
}

/**
 * Zet een schema om in de regels die je op het scherm ziet: de oefening, het
 * aantal sets van vandaag en het progressieadvies op basis van je vorige keer.
 */
export async function haalSchemaOverzicht(template: WorkoutTemplate): Promise<SchemaRegel[]> {
  const regels: SchemaRegel[] = []

  for (const item of [...template.items].sort((a, b) => a.volgorde - b.volgorde)) {
    const exercise = await db.exercises.get(item.exerciseId)
    if (exercise === undefined || exercise.gearchiveerd) continue

    const aantalSets =
      template.uitvoering === 'rondes'
        ? template.rondes
        : (item.setsOverride ?? exercise.standaardSets)
    const repMin = item.repMinOverride ?? exercise.repMin
    const repMax = item.repMaxOverride ?? exercise.repMax

    const vorigeSets = await haalVorigeSets(exercise.id)
    const vorige = vorigeUitvoeringUitSets(exercise, vorigeSets)
    const advies = berekenAdvies({ ...exercise, repMin, repMax }, vorige, aantalSets)

    regels.push({
      exercise,
      aantalSets,
      repMin,
      repMax,
      notitie: item.notitie,
      advies,
      vorigeTekst:
        vorige === null
          ? null
          : exercise.isTijdgebonden
            ? `vorige ${vorige.waarden.join(' · ')} s`
            : `vorige ${vorige.gewichtKg.toLocaleString('nl-NL')} kg × ${vorige.waarden.join('/')}`,
    })
  }

  return regels
}

/** Ruwe schatting van de duur: sets × (rusttijd + 45 seconden werk). */
export function schatDuurSeconden(regels: SchemaRegel[]): number {
  return regels.reduce(
    (som, r) => som + r.aantalSets * (r.exercise.rustSeconden + 45),
    0,
  )
}

export function telSets(regels: SchemaRegel[]): number {
  return regels.reduce((som, r) => som + r.aantalSets, 0)
}
