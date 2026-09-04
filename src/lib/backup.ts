import { db, HUIDIGE_SCHEMA_VERSIE } from '../db/db'
import { wijzigInstellingen } from '../db/repo'
import type {
  BodyWeight,
  Exercise,
  Measurement,
  MuscleGroup,
  Session,
  Settings,
  WorkoutTemplate,
} from '../db/types'
import { naarIso } from './date'

/**
 * Back-up en herstel.
 *
 * Het exportbestand is gewone JSON: leesbaar, en over tien jaar nog te openen
 * ook als deze app niet meer bestaat.
 */

export interface BackupBestand {
  formaat: 'krachttraining-backup'
  schemaVersie: number
  gemaaktOp: string
  data: {
    muscleGroups: MuscleGroup[]
    exercises: Exercise[]
    templates: WorkoutTemplate[]
    sessions: Session[]
    bodyWeights: BodyWeight[]
    measurements: Measurement[]
    settings: Settings[]
  }
}

export async function maakBackup(): Promise<BackupBestand> {
  const [muscleGroups, exercises, templates, sessions, bodyWeights, measurements, settings] =
    await Promise.all([
      db.muscleGroups.toArray(),
      db.exercises.toArray(),
      db.templates.toArray(),
      db.sessions.toArray(),
      db.bodyWeights.toArray(),
      db.measurements.toArray(),
      db.settings.toArray(),
    ])

  return {
    formaat: 'krachttraining-backup',
    schemaVersie: HUIDIGE_SCHEMA_VERSIE,
    gemaaktOp: new Date().toISOString(),
    data: { muscleGroups, exercises, templates, sessions, bodyWeights, measurements, settings },
  }
}

export function bestandsnaam(prefix: string, extensie: string): string {
  return `${prefix}-${naarIso(new Date())}.${extensie}`
}

export function downloadTekst(inhoud: string, naam: string, mime: string): void {
  const blob = new Blob([inhoud], { type: `${mime};charset=utf-8` })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = naam
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 2000)
}

export async function exporteerBackup(): Promise<void> {
  const backup = await maakBackup()
  downloadTekst(
    JSON.stringify(backup, null, 2),
    bestandsnaam('krachttraining-backup', 'json'),
    'application/json',
  )
  await wijzigInstellingen({ laatsteBackupOp: new Date().toISOString() })
}

export type ImportModus = 'samenvoegen' | 'vervangen'

export interface ImportSamenvatting {
  oefeningen: number
  schemas: number
  sessies: number
  wegingen: number
  metingen: number
  spiergroepen: number
  gemaaktOp: string | null
}

export function leesBackup(tekst: string): BackupBestand {
  const ruw: unknown = JSON.parse(tekst)
  if (typeof ruw !== 'object' || ruw === null) {
    throw new Error('Dit bestand bevat geen leesbare gegevens.')
  }
  const bestand = ruw as Partial<BackupBestand>
  if (bestand.formaat !== 'krachttraining-backup' || bestand.data === undefined) {
    throw new Error('Dit is geen back-upbestand van deze app.')
  }
  if ((bestand.schemaVersie ?? 0) > HUIDIGE_SCHEMA_VERSIE) {
    throw new Error(
      'Dit bestand komt uit een nieuwere versie van de app. Werk de app eerst bij en probeer het opnieuw.',
    )
  }
  return bestand as BackupBestand
}

export function vatSamen(bestand: BackupBestand): ImportSamenvatting {
  return {
    oefeningen: bestand.data.exercises.length,
    schemas: bestand.data.templates.length,
    sessies: bestand.data.sessions.length,
    wegingen: bestand.data.bodyWeights.length,
    metingen: bestand.data.measurements.length,
    spiergroepen: bestand.data.muscleGroups.length,
    gemaaktOp: bestand.gemaaktOp ?? null,
  }
}

export async function herstelBackup(
  bestand: BackupBestand,
  modus: ImportModus,
): Promise<void> {
  const { data } = bestand

  await db.transaction(
    'rw',
    [
      db.muscleGroups,
      db.exercises,
      db.templates,
      db.sessions,
      db.bodyWeights,
      db.measurements,
      db.settings,
      db.meta,
    ],
    async () => {
      if (modus === 'vervangen') {
        await Promise.all([
          db.muscleGroups.clear(),
          db.exercises.clear(),
          db.templates.clear(),
          db.sessions.clear(),
          db.bodyWeights.clear(),
          db.measurements.clear(),
        ])
      }

      // bulkPut overschrijft records met dezelfde sleutel en voegt de rest toe.
      await db.muscleGroups.bulkPut(data.muscleGroups)
      await db.exercises.bulkPut(data.exercises)
      await db.templates.bulkPut(data.templates)
      await db.sessions.bulkPut(data.sessions)
      await db.bodyWeights.bulkPut(data.bodyWeights)
      await db.measurements.bulkPut(data.measurements)

      const instellingen = data.settings[0]
      if (instellingen !== undefined) {
        await db.settings.put({ ...instellingen, id: 'settings' })
      }

      await db.meta.put({ id: 'meta', schemaVersie: HUIDIGE_SCHEMA_VERSIE })
    },
  )
}

// ── CSV-export van je trainingshistorie ──────────────────────────────────

function csvVeld(waarde: string | number | boolean): string {
  const tekst = String(waarde)
  return /[";\n]/.test(tekst) ? `"${tekst.replace(/"/g, '""')}"` : tekst
}

/**
 * Eén regel per set. Puntkomma als scheidingsteken en komma als
 * decimaalteken, zodat Excel in het Nederlands het bestand meteen goed opent.
 */
export async function exporteerCsv(): Promise<void> {
  const sessies = (await db.sessions.toArray())
    .filter((s) => s.status === 'afgerond')
    .sort((a, b) => a.startTijd.localeCompare(b.startTijd))

  const kop = [
    'datum',
    'trainingsdag',
    'programmaweek',
    'deload',
    'oefening',
    'setnummer',
    'ronde',
    'gewicht_kg',
    'herhalingen',
    'seconden',
    'opwarmset',
    'pr',
    'oefeningnotitie',
    'sessienotitie',
  ]

  const regels: string[] = [kop.join(';')]

  for (const sessie of sessies) {
    for (const entry of sessie.entries) {
      entry.sets.forEach((set, i) => {
        regels.push(
          [
            sessie.datum,
            sessie.templateLabel,
            sessie.programmaWeek,
            sessie.isDeload ? 'ja' : 'nee',
            entry.exerciseNaam,
            i + 1,
            set.ronde ?? '',
            String(set.gewichtKg).replace('.', ','),
            set.reps,
            set.seconden ?? '',
            set.isOpwarm ? 'ja' : 'nee',
            set.isPR ? 'ja' : 'nee',
            entry.notitie,
            sessie.sessieNotitie,
          ]
            .map(csvVeld)
            .join(';'),
        )
      })
    }
  }

  // BOM zodat Excel de accenten goed leest.
  downloadTekst(
    `﻿${regels.join('\r\n')}`,
    bestandsnaam('krachttraining-historie', 'csv'),
    'text/csv',
  )
}
