import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'

import { haalAfgerondeSessies } from '../db/repo'
import type { Session } from '../db/types'
import { duurTekst, korteDatum, maandagVan, vandaagIso } from '../lib/date'
import { getal, meervoud } from '../lib/format'
import { Laden, Schil, SchermKop } from '../components/Schil'
import { Badge, Kaart, LegeStaat, Rij, Wenkbrauw } from '../components/ui/basis'
import { Knop } from '../components/ui/Knop'

function sessieDuur(sessie: Session): number | null {
  if (sessie.eindTijd === undefined) return null
  return (new Date(sessie.eindTijd).getTime() - new Date(sessie.startTijd).getTime()) / 1000
}

export function Historie() {
  const navigeer = useNavigate()
  const sessies = useLiveQuery(() => haalAfgerondeSessies(), [])

  if (sessies === undefined) {
    return (
      <Schil>
        <Laden />
      </Schil>
    )
  }

  if (sessies.length === 0) {
    return (
      <Schil>
        <SchermKop titel="Historie" />
        <LegeStaat
          titel="Nog geen trainingen"
          uitleg="Zodra je een training afrondt, verschijnt hij hier met al je sets, records en notities."
          actie={
            <Knop soort="primair" onClick={() => navigeer('/')}>
              Naar vandaag
            </Knop>
          }
        />
      </Schil>
    )
  }

  const dezeMaand = vandaagIso().slice(0, 7)
  const aantalDezeMaand = sessies.filter((s) => s.datum.startsWith(dezeMaand)).length

  const eersteDatum = sessies.at(-1)?.datum ?? vandaagIso()
  const wekenActief = Math.max(
    1,
    Math.round(
      (new Date(vandaagIso()).getTime() - new Date(eersteDatum).getTime()) / (7 * 86_400_000),
    ) + 1,
  )
  const perWeek = sessies.length / wekenActief

  // Groepeer per week, nieuwste week eerst.
  const perWeekGroep = new Map<string, Session[]>()
  for (const sessie of sessies) {
    const maandag = maandagVan(sessie.datum)
    const lijst = perWeekGroep.get(maandag) ?? []
    lijst.push(sessie)
    perWeekGroep.set(maandag, lijst)
  }

  const dezeWeek = maandagVan(vandaagIso())

  return (
    <Schil>
      <SchermKop
        titel="Historie"
        rechts={
          <Knop maat="klein" soort="stil" onClick={() => navigeer('/notities')}>
            Notities
          </Knop>
        }
      />

      <div className="flex gap-3 pb-4">
        <Kaart className="flex-1 p-3.5">
          <div className="cijfers t-title text-ink">{aantalDezeMaand}</div>
          <div className="t-caption text-ink-muted">trainingen deze maand</div>
        </Kaart>
        <Kaart className="flex-1 p-3.5">
          <div className="cijfers t-title text-ink">{getal(perWeek, 1)}</div>
          <div className="t-caption text-ink-muted">per week gemiddeld</div>
        </Kaart>
      </div>

      <div className="flex flex-col gap-5">
        {[...perWeekGroep.entries()].map(([maandag, lijst]) => (
          <div key={maandag} className="flex flex-col gap-2">
            <Wenkbrauw>
              {maandag === dezeWeek ? 'Deze week' : `Week van ${korteDatum(maandag)}`}
            </Wenkbrauw>
            <Kaart vlak className="divide-y divide-line-2 overflow-hidden">
              {lijst.map((sessie) => {
                const sets = sessie.entries.reduce((som, e) => som + e.sets.length, 0)
                const prs = sessie.entries.reduce(
                  (som, e) => som + e.sets.filter((s) => s.isPR).length,
                  0,
                )
                const duur = sessieDuur(sessie)
                return (
                  <Rij
                    key={sessie.id}
                    titel={`${sessie.templateLabel}${sessie.isDeload ? ' · deload' : ''}`}
                    onder={`${korteDatum(sessie.datum)}${duur === null ? '' : ` · ${duurTekst(duur)}`} · ${meervoud(sets, 'set', 'sets')}`}
                    rechts={
                      prs > 0 ? (
                        <Badge toon="goed">{prs} PR</Badge>
                      ) : sessie.sessieNotitie.trim() !== '' ? (
                        <Badge toon="neutraal">notitie</Badge>
                      ) : undefined
                    }
                    pijl
                    onClick={() => navigeer(`/historie/${sessie.id}`)}
                  />
                )
              })}
            </Kaart>
          </div>
        ))}
      </div>
    </Schil>
  )
}
