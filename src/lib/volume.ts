import type { Exercise, MuscleGroup, Session } from '../db/types'

/**
 * Sets per spiergroep per week.
 *
 * Een voltooide werkset telt heel mee voor de primaire spiergroep en voor de
 * helft voor elke secundaire spiergroep. Opwarmsets tellen niet mee.
 */

export type VolumeStatus = 'te-weinig' | 'goed' | 'te-veel' | 'geen'

export interface SpiergroepVolume {
  spiergroepId: string
  naam: string
  sets: number
  status: VolumeStatus
}

export function tellSetsPerSpiergroep(
  sessies: Session[],
  oefeningen: Map<string, Exercise>,
): Map<string, number> {
  const totalen = new Map<string, number>()

  const erbij = (spiergroepId: string, aantal: number): void => {
    totalen.set(spiergroepId, (totalen.get(spiergroepId) ?? 0) + aantal)
  }

  for (const sessie of sessies) {
    for (const entry of sessie.entries) {
      if (entry.overgeslagen) continue
      const oefening = oefeningen.get(entry.exerciseId)
      if (oefening === undefined) continue

      const werksets = entry.sets.filter((s) => s.voltooid && !s.isOpwarm).length
      if (werksets === 0) continue

      erbij(oefening.spiergroepPrimair, werksets)
      for (const secundair of oefening.spiergroepenSecundair) {
        erbij(secundair, werksets * 0.5)
      }
    }
  }

  return totalen
}

export function bepaalStatus(sets: number, min: number, max: number): VolumeStatus {
  if (sets === 0) return 'geen'
  if (sets < min) return 'te-weinig'
  if (sets > max) return 'te-veel'
  return 'goed'
}

export function volumeOverzicht(
  sessies: Session[],
  oefeningen: Map<string, Exercise>,
  spiergroepen: MuscleGroup[],
  min: number,
  max: number,
): SpiergroepVolume[] {
  const totalen = tellSetsPerSpiergroep(sessies, oefeningen)

  return spiergroepen
    .filter((g) => !g.gearchiveerd || (totalen.get(g.id) ?? 0) > 0)
    .map((g) => {
      const sets = totalen.get(g.id) ?? 0
      return { spiergroepId: g.id, naam: g.naam, sets, status: bepaalStatus(sets, min, max) }
    })
    .sort((a, b) => b.sets - a.sets || a.naam.localeCompare(b.naam, 'nl'))
}

export function statusLabel(status: VolumeStatus): string {
  switch (status) {
    case 'te-weinig':
      return 'te weinig'
    case 'goed':
      return 'op schema'
    case 'te-veel':
      return 'te veel'
    case 'geen':
      return 'nog niets'
  }
}
