import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'

import { db } from '../db/db'
import { haalAfgerondeSessies, haalInstellingen } from '../db/repo'
import type { Session } from '../db/types'
import { isoWeekNummer, korteDatum, maandagVan, vandaagIso } from '../lib/date'
import { getal, meervoud } from '../lib/format'
import { statusLabel, volumeOverzicht, type VolumeStatus } from '../lib/volume'
import { Laden, Schil, SchermKop } from '../components/Schil'
import { Kaart, LegeStaat, Rij, Wenkbrauw } from '../components/ui/basis'
import { Knop } from '../components/ui/Knop'

const STATUS_BALK: Record<VolumeStatus, string> = {
  'te-weinig': 'bg-let-op',
  goed: 'bg-goed',
  'te-veel': 'bg-fout',
  geen: 'bg-surface-3',
}

const STATUS_TEKST: Record<VolumeStatus, string> = {
  'te-weinig': 'text-let-op',
  goed: 'text-goed',
  'te-veel': 'text-fout',
  geen: 'text-ink-faint',
}

export function Progressie() {
  const navigeer = useNavigate()

  const instellingen = useLiveQuery(() => haalInstellingen(), [])
  const sessies = useLiveQuery(() => haalAfgerondeSessies(), [])
  const oefeningen = useLiveQuery(() => db.exercises.toArray(), [])
  const spiergroepen = useLiveQuery(
    async () => (await db.muscleGroups.toArray()).sort((a, b) => a.volgorde - b.volgorde),
    [],
  )

  if (
    instellingen === undefined ||
    sessies === undefined ||
    oefeningen === undefined ||
    spiergroepen === undefined
  ) {
    return (
      <Schil>
        <Laden />
      </Schil>
    )
  }

  const oefeningPerId = new Map(oefeningen.map((o) => [o.id, o]))
  const dezeMaandag = maandagVan(vandaagIso())
  const sessiesDezeWeek = sessies.filter((s) => maandagVan(s.datum) === dezeMaandag)

  const volume = volumeOverzicht(
    sessiesDezeWeek,
    oefeningPerId,
    spiergroepen,
    instellingen.setsPerWeekMin,
    instellingen.setsPerWeekMax,
  ).filter((v) => v.sets > 0 || !spiergroepen.find((g) => g.id === v.spiergroepId)?.gearchiveerd)

  // Spiergroepen waar je nog niets voor deed, vatten we samen in één regel:
  // anders vult een lijst van vijftien nullen je hele scherm.
  const metSets = volume.filter((v) => v.sets > 0)
  const zonderSets = volume.filter((v) => v.sets === 0)

  // Weekvolume (totaal getild gewicht) over de laatste acht weken.
  const weekVolumes = berekenWeekVolumes(sessies, 8)
  const maxWeekVolume = Math.max(1, ...weekVolumes.map((w) => w.volume))

  const recenteRecords = sessies
    .flatMap((sessie) =>
      sessie.entries.flatMap((entry) =>
        entry.sets
          .filter((set) => set.isPR)
          .map((set) => ({
            datum: sessie.datum,
            naam: entry.exerciseNaam,
            exerciseId: entry.exerciseId,
            omschrijving:
              set.seconden !== undefined
                ? `${set.seconden} s`
                : `${getal(set.gewichtKg)} kg × ${set.reps}`,
          })),
      ),
    )
    .slice(0, 5)

  const meestGebruikt = [...oefeningPerId.values()]
    .filter((o) => !o.gearchiveerd)
    .map((o) => ({
      oefening: o,
      aantal: sessies.filter((s) => s.entries.some((e) => e.exerciseId === o.id)).length,
    }))
    .filter((r) => r.aantal > 0)
    .sort((a, b) => b.aantal - a.aantal)
    .slice(0, 8)

  if (sessies.length === 0) {
    return (
      <Schil>
        <SchermKop titel="Progressie" />
        <LegeStaat
          titel="Nog niets om te laten zien"
          uitleg="Na je eerste afgeronde training verschijnen hier je grafieken, je sets per spiergroep en je records."
          actie={
            <Knop soort="primair" onClick={() => navigeer('/')}>
              Naar vandaag
            </Knop>
          }
        />
      </Schil>
    )
  }

  return (
    <Schil>
      <SchermKop
        titel="Progressie"
        rechts={
          <Knop maat="klein" soort="stil" onClick={() => navigeer('/records')}>
            Records
          </Knop>
        }
      />

      <div className="flex flex-col gap-5">
        {/* Sets per spiergroep */}
        <div className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between">
            <Wenkbrauw>Sets deze week</Wenkbrauw>
            <span className="t-caption text-ink-muted">
              streefbereik {instellingen.setsPerWeekMin}-{instellingen.setsPerWeekMax}
            </span>
          </div>
          <Kaart className="flex flex-col gap-3 p-3.5">
            {metSets.length === 0 ? (
              <p className="t-caption text-ink-muted">Deze week nog geen sets gelogd.</p>
            ) : (
              metSets.map((rij) => {
                const breedte = Math.min(
                  100,
                  (rij.sets / (instellingen.setsPerWeekMax * 1.4)) * 100,
                )
                return (
                  <div key={rij.spiergroepId} className="flex flex-col gap-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="t-body-sm truncate text-ink">{rij.naam}</span>
                      <span className={`t-caption shrink-0 ${STATUS_TEKST[rij.status]}`}>
                        {getal(rij.sets, 1)} · {statusLabel(rij.status)}
                      </span>
                    </div>
                    <div className="relative h-1.5 overflow-hidden rounded-full bg-surface-2">
                      <div
                        className={`h-full rounded-full ${STATUS_BALK[rij.status]}`}
                        style={{ width: `${breedte}%` }}
                      />
                    </div>
                  </div>
                )
              })
            )}
            {zonderSets.length > 0 && (
              <div className="border-t border-line-2 pt-2.5">
                <span className="t-eyebrow uppercase text-ink-faint">Nog niets deze week</span>
                <p className="t-caption mt-1 text-ink-muted">
                  {zonderSets.map((rij) => rij.naam).join(' · ')}
                </p>
              </div>
            )}
            <p className="t-caption border-t border-line-2 pt-2.5 text-ink-muted">
              Een werkset telt heel mee voor de primaire spiergroep en half voor elke secundaire.
              Opwarmsets tellen niet mee.
            </p>
          </Kaart>
        </div>

        {/* Weekvolume */}
        <div className="flex flex-col gap-2">
          <Wenkbrauw>Weekvolume</Wenkbrauw>
          <Kaart className="flex h-[148px] items-end gap-2 p-3.5">
            {weekVolumes.map((week) => (
              <div
                key={week.maandag}
                className="flex h-full flex-1 flex-col items-center justify-end gap-1.5"
              >
                <div
                  className={`w-full rounded-t-[4px] ${
                    week.maandag === dezeMaandag
                      ? 'bg-accent'
                      : week.isDeload
                        ? 'bg-let-op/50'
                        : 'bg-surface-3'
                  }`}
                  style={{ height: `${Math.max(3, (week.volume / maxWeekVolume) * 100)}%` }}
                  title={`${getal(week.volume, 0)} kg`}
                />
                <span
                  className={`t-eyebrow ${week.isDeload ? 'text-let-op' : 'text-ink-muted'}`}
                >
                  {week.isDeload ? 'deload' : `w${isoWeekNummer(week.maandag)}`}
                </span>
              </div>
            ))}
          </Kaart>
        </div>

        {/* Per oefening */}
        <div className="flex flex-col gap-2">
          <Wenkbrauw>Per oefening</Wenkbrauw>
          <Kaart vlak className="divide-y divide-line-2 overflow-hidden">
            {meestGebruikt.map(({ oefening, aantal }) => (
              <Rij
                key={oefening.id}
                titel={oefening.naam}
                onder={meervoud(aantal, 'training', 'trainingen')}
                pijl
                onClick={() => navigeer(`/progressie/${oefening.id}`)}
              />
            ))}
          </Kaart>
        </div>

        {/* Recente records */}
        <div className="flex flex-col gap-2">
          <Wenkbrauw>Recente records</Wenkbrauw>
          {recenteRecords.length === 0 ? (
            <Kaart vlak className="px-4 py-5">
              <p className="t-caption text-ink-muted">Nog geen records gebroken.</p>
            </Kaart>
          ) : (
            <Kaart vlak className="divide-y divide-line-2 overflow-hidden">
              {recenteRecords.map((record, i) => (
                <Rij
                  key={i}
                  titel={record.naam}
                  rechts={
                    <span className="t-caption text-ink-muted">
                      {record.omschrijving} · {korteDatum(record.datum)}
                    </span>
                  }
                  onClick={() => navigeer(`/progressie/${record.exerciseId}`)}
                />
              ))}
            </Kaart>
          )}
          <Knop soort="stil" vol onClick={() => navigeer('/records')}>
            Alle records bekijken
          </Knop>
        </div>
      </div>
    </Schil>
  )
}

interface WeekVolume {
  maandag: string
  volume: number
  isDeload: boolean
}

function berekenWeekVolumes(sessies: Session[], aantalWeken: number): WeekVolume[] {
  const perWeek = new Map<string, WeekVolume>()

  const dezeMaandag = maandagVan(vandaagIso())
  for (let i = aantalWeken - 1; i >= 0; i -= 1) {
    const d = new Date(dezeMaandag)
    d.setDate(d.getDate() - i * 7)
    const sleutel = maandagVan(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
    )
    perWeek.set(sleutel, { maandag: sleutel, volume: 0, isDeload: false })
  }

  for (const sessie of sessies) {
    const maandag = maandagVan(sessie.datum)
    const week = perWeek.get(maandag)
    if (week === undefined) continue
    week.volume += sessie.entries.reduce(
      (som, e) => som + e.sets.reduce((v, s) => v + s.gewichtKg * s.reps, 0),
      0,
    )
    if (sessie.isDeload) week.isDeload = true
  }

  return [...perWeek.values()]
}
