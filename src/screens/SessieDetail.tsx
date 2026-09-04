import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'

import { haalSessie, verwijderSessie, wijzigSessieNotitie } from '../db/repo'
import { duurTekst, langeDatum } from '../lib/date'
import { getal, kg, meervoud } from '../lib/format'
import { Laden, Schil, SubKop } from '../components/Schil'
import { Badge, Kaart, Staafjes, Wenkbrauw } from '../components/ui/basis'
import { Knop } from '../components/ui/Knop'
import { Bevestig, Sheet } from '../components/ui/Sheet'
import { TekstGebied } from '../components/ui/Invoer'

export function SessieDetail() {
  const { sessieId } = useParams<{ sessieId: string }>()
  const navigeer = useNavigate()
  const [notitieOpen, setNotitieOpen] = useState(false)
  const [notitie, setNotitie] = useState('')
  const [verwijderOpen, setVerwijderOpen] = useState(false)

  const sessie = useLiveQuery(
    async () => (sessieId === undefined ? undefined : haalSessie(sessieId)),
    [sessieId],
  )

  if (sessie === undefined) {
    return (
      <Schil>
        <Laden />
      </Schil>
    )
  }

  const duur =
    sessie.eindTijd === undefined
      ? null
      : (new Date(sessie.eindTijd).getTime() - new Date(sessie.startTijd).getTime()) / 1000
  const sets = sessie.entries.reduce((som, e) => som + e.sets.length, 0)
  const volume = sessie.entries.reduce(
    (som, e) => som + e.sets.reduce((v, s) => v + s.gewichtKg * s.reps, 0),
    0,
  )
  const nietGedaan = sessie.entries
    .filter((e) => e.sets.length === 0)
    .map((e) => e.exerciseNaam)

  return (
    <Schil>
      <SubKop
        titel={sessie.templateLabel}
        rechts={
          <Knop
            maat="klein"
            soort="stil"
            onClick={() => {
              setNotitie(sessie.sessieNotitie)
              setNotitieOpen(true)
            }}
          >
            Notitie
          </Knop>
        }
      />

      <div className="flex flex-col gap-4 pt-4">
        <div className="flex flex-col gap-1">
          <Wenkbrauw>{langeDatum(sessie.datum)}</Wenkbrauw>
          <div className="t-caption text-ink-muted">
            Week {sessie.programmaWeek}
            {sessie.isDeload ? ' · deload' : ''}
            {duur === null ? '' : ` · ${duurTekst(duur)}`} · {meervoud(sets, 'set', 'sets')} ·{' '}
            {getal(volume, 0)} kg volume
          </div>
        </div>

        {sessie.sessieNotitie.trim() !== '' && (
          <Kaart className="p-3.5">
            <Wenkbrauw>Notitie</Wenkbrauw>
            <p className="t-body-sm mt-1.5 whitespace-pre-wrap text-ink-2">
              {sessie.sessieNotitie}
            </p>
          </Kaart>
        )}

        {sessie.entries
          .filter((entry) => entry.sets.length > 0)
          .map((entry) => (
          <Kaart key={entry.exerciseId} className="flex flex-col gap-2.5 p-3.5">
            <div className="flex items-start justify-between gap-2">
              <h2 className="t-body-sm font-semibold text-ink">{entry.exerciseNaam}</h2>
              {entry.vervangtExerciseId !== undefined && <Badge>vervanging</Badge>}
            </div>

            {(
              <div className="flex flex-col gap-1">
                {entry.sets.map((set, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between gap-3 border-t border-line-2 py-2 first:border-t-0"
                  >
                    <span className="cijfers t-caption w-6 shrink-0 text-ink-muted">{i + 1}</span>
                    <span className="cijfers t-body-sm flex-1 text-ink">
                      {kg(set.gewichtKg)} ×{' '}
                      {set.seconden !== undefined ? `${set.seconden} s` : set.reps}
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      {set.isOpwarm && <Badge>opwarm</Badge>}
                      {set.isPR && (
                        <Badge toon="goed" icoon={<Staafjes />}>
                          PR
                        </Badge>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {entry.notitie.trim() !== '' && (
              <p className="t-caption border-t border-line-2 pt-2 text-ink-muted">
                {entry.notitie}
              </p>
            )}
          </Kaart>
        ))}

        {nietGedaan.length > 0 && (
          <Kaart vlak className="px-3.5 py-3">
            <Wenkbrauw>Niet gedaan</Wenkbrauw>
            <p className="t-caption mt-1 text-ink-muted">{nietGedaan.join(' · ')}</p>
          </Kaart>
        )}

        <Knop soort="gevaar" vol onClick={() => setVerwijderOpen(true)}>
          Deze training verwijderen
        </Knop>
      </div>

      <Sheet
        open={notitieOpen}
        titel="Notitie bij deze training"
        onSluit={() => setNotitieOpen(false)}
        voet={
          <Knop
            soort="primair"
            vol
            onClick={() => {
              void wijzigSessieNotitie(sessie.id, notitie)
              setNotitieOpen(false)
            }}
          >
            Bewaren
          </Knop>
        }
      >
        <TekstGebied waarde={notitie} onWijzig={setNotitie} regels={6} />
      </Sheet>

      <Bevestig
        open={verwijderOpen}
        titel="Training verwijderen?"
        gevaarlijk
        bevestigLabel="Verwijderen"
        tekst="Deze training verdwijnt uit je historie en telt niet meer mee in je records en grafieken. Dit kun je niet ongedaan maken."
        onAnnuleer={() => setVerwijderOpen(false)}
        onBevestig={() => {
          void verwijderSessie(sessie.id)
          navigeer('/historie', { replace: true })
        }}
      />
    </Schil>
  )
}
