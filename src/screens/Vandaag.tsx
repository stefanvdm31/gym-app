import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'

import { db } from '../db/db'
import {
  bepaalVolgendSchema,
  haalAfgerondeSessies,
  haalInstellingen,
  haalLopendeSessie,
  startSessie,
  verwijderSessie,
} from '../db/repo'
import type { WorkoutTemplate } from '../db/types'
import { haalSchemaOverzicht, schatDuurSeconden, telSets } from '../lib/schemaHulp'
import {
  dagenVerschil,
  duurTekst,
  isDeloadWeek,
  korteDatum,
  langeDatum,
  programmaWeek,
  vandaagIso,
} from '../lib/date'
import { getal, kg, meervoud } from '../lib/format'
import { ontgrendelGeluid } from '../lib/signalen'
import { Schil, Laden } from '../components/Schil'
import { Badge, Kaart, LegeStaat, Melding, PijlRechts, Rij, Wenkbrauw } from '../components/ui/basis'
import { Knop } from '../components/ui/Knop'
import { Sheet } from '../components/ui/Sheet'

export function Vandaag() {
  const navigeer = useNavigate()
  const [kiezerOpen, setKiezerOpen] = useState(false)
  const [gekozenId, setGekozenId] = useState<string | null>(null)
  const [bezig, setBezig] = useState(false)

  const instellingen = useLiveQuery(() => haalInstellingen(), [])
  const lopend = useLiveQuery(() => haalLopendeSessie(), [])
  const schemas = useLiveQuery(
    async () => (await db.templates.toArray()).sort((a, b) => a.volgorde - b.volgorde),
    [],
  )
  const laatsteSessies = useLiveQuery(() => haalAfgerondeSessies(3), [])
  const wegingen = useLiveQuery(() => db.bodyWeights.toArray(), [])

  const voorstelId = useLiveQuery(async () => (await bepaalVolgendSchema())?.id ?? null, [])

  const actiefSchema: WorkoutTemplate | null =
    schemas === undefined
      ? null
      : (schemas.find((t) => t.id === (gekozenId ?? voorstelId)) ??
        schemas.find((t) => t.actief) ??
        schemas[0] ??
        null)

  const regels = useLiveQuery(
    async () => (actiefSchema === null ? [] : haalSchemaOverzicht(actiefSchema)),
    [actiefSchema?.id, actiefSchema?.items.length],
  )

  if (instellingen === undefined || schemas === undefined) {
    return (
      <Schil>
        <Laden />
      </Schil>
    )
  }

  const datum = vandaagIso()
  const week = programmaWeek(instellingen.programmaStartdatum, datum)
  const deload = isDeloadWeek(week, instellingen.deloadWeken)
  const laatsteWeging = [...(wegingen ?? [])].sort((a, b) => b.datum.localeCompare(a.datum))[0]

  const backupOud =
    instellingen.laatsteBackupOp === undefined
      ? (laatsteSessies?.length ?? 0) > 0
      : dagenVerschil(instellingen.laatsteBackupOp.slice(0, 10), datum) > 30

  const start = async (): Promise<void> => {
    if (actiefSchema === null || bezig) return
    setBezig(true)
    try {
      ontgrendelGeluid()
      const sessie = await startSessie(actiefSchema)
      navigeer(`/training/${sessie.id}`)
    } finally {
      setBezig(false)
    }
  }

  const zichtbareRegels = regels ?? []
  const eersteDrie = zichtbareRegels.slice(0, 3)
  const rest = zichtbareRegels.length - eersteDrie.length

  return (
    <Schil>
      <div className="flex flex-col gap-4 pt-4">
        {/* Kop */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-0.5">
            <Wenkbrauw>{langeDatum(datum)}</Wenkbrauw>
            <h1 className="t-h2 text-ink">{actiefSchema?.label ?? 'Nog geen schema'}</h1>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1.5">
            <Badge toon={deload ? 'let-op' : 'neutraal'}>Week {week}</Badge>
            {deload && <Badge toon="let-op">Deload</Badge>}
          </div>
        </div>

        {deload && (
          <Melding toon="let-op" titel="Deloadweek">
            Halve sets en 60% van je gewichten. Dit is een geplande rustweek, geen mislukte week.
          </Melding>
        )}

        {backupOud && (
          <button type="button" onClick={() => navigeer('/meer/backup')} className="text-left">
            <Melding toon="accent" titel="Back-up">
              {instellingen.laatsteBackupOp === undefined
                ? 'Je hebt nog nooit een back-up gemaakt. Tik hier om er één te downloaden.'
                : `Je laatste back-up is van ${korteDatum(instellingen.laatsteBackupOp.slice(0, 10))}. Tik hier om er een nieuwe te maken.`}
            </Melding>
          </button>
        )}

        {/* Onderbroken training hervatten */}
        {lopend !== undefined && (
          <Kaart className="p-4">
            <div className="flex flex-col gap-3">
              <div>
                <Wenkbrauw>Onderbroken training</Wenkbrauw>
                <div className="t-title mt-1 text-ink">{lopend.templateLabel}</div>
                <div className="t-caption text-ink-muted">
                  Gestart op {korteDatum(lopend.datum)} ·{' '}
                  {meervoud(
                    lopend.entries.reduce(
                      (som, e) => som + e.sets.filter((s) => s.voltooid).length,
                      0,
                    ),
                    'set gelogd',
                    'sets gelogd',
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <Knop
                  soort="primair"
                  vol
                  onClick={() => {
                    ontgrendelGeluid()
                    navigeer(`/training/${lopend.id}`)
                  }}
                >
                  Hervatten
                </Knop>
                <Knop
                  soort="stil"
                  onClick={() => {
                    void verwijderSessie(lopend.id)
                  }}
                >
                  Weggooien
                </Knop>
              </div>
            </div>
          </Kaart>
        )}

        {/* Trainingsdag van vandaag */}
        {actiefSchema === null ? (
          <LegeStaat
            titel="Nog geen trainingsdag"
            uitleg="Maak eerst een schema aan onder Meer › Schema's."
            actie={
              <Knop soort="primair" onClick={() => navigeer('/meer/schemas')}>
                Naar schema's
              </Knop>
            }
          />
        ) : (
          <Kaart>
            <div className="flex flex-col gap-3 px-4 pt-4 pb-3">
              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setKiezerOpen(true)}
                  className="t-body-sm flex items-center gap-1.5 font-semibold text-ink"
                >
                  {actiefSchema.type === 'thuis' ? 'Thuis' : 'Sportschool'}
                  <span className="text-accent">wisselen</span>
                </button>
                <div className="t-caption text-ink-muted">
                  ± {duurTekst(schatDuurSeconden(zichtbareRegels))} ·{' '}
                  {meervoud(telSets(zichtbareRegels), 'set', 'sets')}
                </div>
              </div>

              {regels === undefined ? (
                <div className="t-caption py-4 text-ink-muted">Advies berekenen…</div>
              ) : zichtbareRegels.length === 0 ? (
                <div className="t-caption py-4 text-ink-muted">
                  Dit schema heeft nog geen oefeningen.
                </div>
              ) : (
                <div className="flex flex-col">
                  {eersteDrie.map((regel) => (
                    <div
                      key={regel.exercise.id}
                      className="flex items-center justify-between gap-3 border-t border-line-2 py-2.5"
                    >
                      <div className="flex min-w-0 flex-col gap-0.5">
                        <div className="t-body-sm truncate text-ink">{regel.exercise.naam}</div>
                        <div className="t-caption text-ink-muted">
                          {regel.aantalSets} × {regel.repMin}
                          {regel.repMax !== regel.repMin ? `-${regel.repMax}` : ''}
                          {regel.vorigeTekst !== null ? ` · ${regel.vorigeTekst}` : ' · eerste keer'}
                        </div>
                      </div>
                      {/* Bij een eerste keer is er geen advies: dan blijft het
                          veld leeg in plaats van dat er een streepje staat. */}
                      {regel.advies.gewichtKg !== null && (
                        <div className="t-caption shrink-0 font-semibold text-accent">
                          {kg(regel.advies.gewichtKg, {
                            toonPlus: regel.exercise.isLichaamsgewicht,
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                  {rest > 0 && (
                    <div className="flex items-center justify-between border-t border-line-2 py-2.5">
                      <span className="t-body-sm text-ink-muted">
                        + {meervoud(rest, 'oefening', 'oefeningen')}
                      </span>
                      <PijlRechts />
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="px-4 pb-4">
              <Knop
                soort="primair"
                maat="groot"
                vol
                disabled={bezig || zichtbareRegels.length === 0}
                onClick={() => void start()}
              >
                {bezig ? 'Bezig…' : 'Start training'}
              </Knop>
            </div>
          </Kaart>
        )}

        {/* Snelkoppelingen */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setKiezerOpen(true)}
            className="flex flex-1 flex-col gap-1.5 rounded-[12px] border border-line-3 bg-surface p-3.5 text-left"
          >
            <span className="t-body-sm font-semibold text-ink">Andere dag</span>
            <span className="t-caption text-ink-muted">Kies zelf een schema</span>
          </button>
          <button
            type="button"
            onClick={() => navigeer('/lichaam')}
            className="flex flex-1 flex-col gap-1.5 rounded-[12px] border border-line-3 bg-surface p-3.5 text-left"
          >
            <span className="t-body-sm font-semibold text-ink">Weeglog</span>
            {laatsteWeging === undefined ? (
              <span className="t-caption text-ink-muted">Nog niets gewogen</span>
            ) : (
              <span className="flex items-baseline gap-1.5">
                <span className="cijfers t-title text-ink">{getal(laatsteWeging.gewichtKg, 1)}</span>
                <span className="t-caption text-ink-muted">
                  kg · {korteDatum(laatsteWeging.datum)}
                </span>
              </span>
            )}
          </button>
        </div>

        {/* Laatste trainingen */}
        <div className="flex flex-col gap-2">
          <Wenkbrauw>Laatste trainingen</Wenkbrauw>
          {laatsteSessies === undefined || laatsteSessies.length === 0 ? (
            <Kaart vlak className="px-4 py-5">
              <p className="t-caption text-ink-muted">
                Nog geen trainingen gelogd. Zodra je er één afrondt, staat hij hier.
              </p>
            </Kaart>
          ) : (
            <Kaart vlak className="divide-y divide-line-2 overflow-hidden">
              {laatsteSessies.map((sessie) => {
                const sets = sessie.entries.reduce(
                  (som, e) => som + e.sets.filter((s) => s.voltooid).length,
                  0,
                )
                const prs = sessie.entries.reduce(
                  (som, e) => som + e.sets.filter((s) => s.isPR).length,
                  0,
                )
                const duur =
                  sessie.eindTijd === undefined
                    ? null
                    : (new Date(sessie.eindTijd).getTime() -
                        new Date(sessie.startTijd).getTime()) /
                      1000
                return (
                  <Rij
                    key={sessie.id}
                    titel={sessie.templateLabel}
                    onder={`${korteDatum(sessie.datum)}${duur === null ? '' : ` · ${duurTekst(duur)}`} · ${meervoud(sets, 'set', 'sets')}`}
                    rechts={
                      prs > 0 ? (
                        <Badge toon="goed">{meervoud(prs, 'PR', 'PR')}</Badge>
                      ) : sessie.isDeload ? (
                        <Badge toon="let-op">deload</Badge>
                      ) : undefined
                    }
                    pijl
                    onClick={() => navigeer(`/historie/${sessie.id}`)}
                  />
                )
              })}
            </Kaart>
          )}
        </div>
      </div>

      {/* Schemakiezer */}
      <Sheet open={kiezerOpen} titel="Welke training doe je?" onSluit={() => setKiezerOpen(false)}>
        <div className="flex flex-col gap-2">
          {schemas.length === 0 && (
            <p className="t-caption text-ink-muted">Je hebt nog geen schema's aangemaakt.</p>
          )}
          {schemas.map((schema) => {
            const gekozen = schema.id === actiefSchema?.id
            return (
              <button
                key={schema.id}
                type="button"
                onClick={() => {
                  setGekozenId(schema.id)
                  setKiezerOpen(false)
                }}
                className={`flex min-h-[56px] items-center justify-between gap-3 rounded-[12px] border px-4 py-3 text-left ${
                  gekozen ? 'border-accent bg-accent/10' : 'border-line-3 bg-surface'
                }`}
              >
                <span className="flex min-w-0 flex-col">
                  <span className="t-body-sm text-ink">{schema.label}</span>
                  <span className="t-caption text-ink-muted">
                    {schema.type === 'thuis' ? 'Thuis' : 'Sportschool'} ·{' '}
                    {schema.uitvoering === 'rondes'
                      ? `${schema.rondes} rondes`
                      : meervoud(schema.items.length, 'oefening', 'oefeningen')}
                    {schema.id === voorstelId ? ' · aan de beurt' : ''}
                  </span>
                </span>
                {gekozen && <Badge toon="accent">gekozen</Badge>}
              </button>
            )
          })}
        </div>
      </Sheet>
    </Schil>
  )
}
