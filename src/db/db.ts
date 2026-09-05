import Dexie, { type EntityTable } from 'dexie'
import type {
  BodyWeight,
  Exercise,
  Measurement,
  Meta,
  MuscleGroup,
  Session,
  Settings,
  WorkoutTemplate,
} from './types'

/**
 * De database.
 *
 * Over schemaversies: elke `this.version(n)` hieronder is een stap in de
 * geschiedenis van de database. Bestaande gegevens worden door Dexie
 * automatisch door alle nieuwere stappen heen gehaald. Voeg bij een
 * toekomstige wijziging dus ALTIJD een nieuwe version(n+1) toe en pas nooit
 * een bestaande aan — dan blijft alles wat je al gelogd hebt behouden.
 */
export const HUIDIGE_SCHEMA_VERSIE = 2

class KrachtDatabase extends Dexie {
  muscleGroups!: EntityTable<MuscleGroup, 'id'>
  exercises!: EntityTable<Exercise, 'id'>
  templates!: EntityTable<WorkoutTemplate, 'id'>
  sessions!: EntityTable<Session, 'id'>
  bodyWeights!: EntityTable<BodyWeight, 'datum'>
  measurements!: EntityTable<Measurement, 'datum'>
  settings!: EntityTable<Settings, 'id'>
  meta!: EntityTable<Meta, 'id'>

  constructor() {
    super('krachttraining')

    this.version(1).stores({
      muscleGroups: 'id, volgorde, gearchiveerd',
      exercises: 'id, naam, spiergroepPrimair, gearchiveerd',
      templates: 'id, volgorde, type, actief',
      sessions: 'id, datum, status, templateId, [status+datum]',
      bodyWeights: 'datum',
      measurements: 'datum',
      settings: 'id',
      meta: 'id',
    })

    // Versie 2: het thema is uitgebreid van alleen 'donker' naar een keuze
    // tussen systeem, licht en donker. Wie de app al gebruikte stond op
    // 'donker'; die zetten we op 'systeem', want dat is nu de standaard.
    // De indexen veranderen niet, dus alleen deze omzetting is nodig.
    this.version(2).upgrade(async (tx) => {
      const instellingen = await tx.table('settings').get('settings')
      if (instellingen === undefined) return
      if (instellingen.thema === 'licht' || instellingen.thema === 'systeem') return
      await tx.table('settings').put({ ...instellingen, thema: 'systeem' })
    })
  }
}

export const db = new KrachtDatabase()

/** Korte, unieke id. Geen externe library nodig. */
export function nieuwId(prefix: string): string {
  const rnd =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10)
  return `${prefix}_${Date.now().toString(36)}${rnd}`
}
