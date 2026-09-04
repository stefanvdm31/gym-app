import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'

import { db } from '../db/db'
import { haalHistorieVanOefening } from '../db/repo'
import { besteRecords } from '../lib/pr'
import { korteDatum } from '../lib/date'
import { getal, kg, meervoud } from '../lib/format'
import { Laden, Schil, SubKop } from '../components/Schil'
import { Kaart, LegeStaat, Wenkbrauw } from '../components/ui/basis'

export function Records() {
  const navigeer = useNavigate()

  const rijen = useLiveQuery(async () => {
    const oefeningen = (await db.exercises.toArray()).sort((a, b) =>
      a.naam.localeCompare(b.naam, 'nl'),
    )
    const uit = []
    for (const oefening of oefeningen) {
      const historie = await haalHistorieVanOefening(oefening.id)
      if (historie.length === 0) continue
      const records = besteRecords(oefening, historie)
      if (
        records.besteGewicht === null &&
        records.besteE1rm === null &&
        records.besteSeconden === null
      ) {
        continue
      }
      uit.push({ oefening, records })
    }
    return uit
  }, [])

  if (rijen === undefined) {
    return (
      <Schil>
        <Laden />
      </Schil>
    )
  }

  return (
    <Schil>
      <SubKop titel="Persoonlijke records" />

      <div className="flex flex-col gap-4 pt-4">
        {rijen.length === 0 ? (
          <LegeStaat
            titel="Nog geen records"
            uitleg="Elke set die zwaarder is dan alles wat je eerder deed, of een betere geschatte 1RM oplevert, komt hier automatisch te staan."
          />
        ) : (
          <>
            <p className="t-caption text-ink-muted">
              Een record wordt op twee manieren geteld: het zwaarste gewicht, en de beste geschatte
              1RM volgens Epley (gewicht × (1 + herhalingen / 30)).
            </p>
            {rijen.map(({ oefening, records }) => (
              <button
                key={oefening.id}
                type="button"
                onClick={() => navigeer(`/progressie/${oefening.id}`)}
                className="text-left"
              >
                <Kaart className="flex flex-col gap-2 p-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="t-body-sm font-semibold text-ink">{oefening.naam}</span>
                    {oefening.gearchiveerd && (
                      <span className="t-caption text-ink-faint">gearchiveerd</span>
                    )}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {records.besteGewicht !== null && (
                      <Regel
                        label={
                          oefening.isLichaamsgewicht ? 'Zwaarste extra gewicht' : 'Zwaarste gewicht'
                        }
                        waarde={`${kg(records.besteGewicht.waarde, { toonPlus: oefening.isLichaamsgewicht })} × ${records.besteGewicht.reps}`}
                        datum={records.besteGewicht.datum}
                      />
                    )}
                    {records.besteE1rm !== null && (
                      <Regel
                        label="Beste geschatte 1RM"
                        waarde={`${getal(records.besteE1rm.waarde, 1)} kg`}
                        datum={records.besteE1rm.datum}
                      />
                    )}
                    {records.besteSeconden !== null && (
                      <Regel
                        label="Langste tijd"
                        waarde={`${records.besteSeconden.waarde} s`}
                        datum={records.besteSeconden.datum}
                      />
                    )}
                  </div>
                </Kaart>
              </button>
            ))}
            <Wenkbrauw>{meervoud(rijen.length, 'oefening met een record', 'oefeningen met een record')}</Wenkbrauw>
          </>
        )}
      </div>
    </Schil>
  )
}

function Regel({ label, waarde, datum }: { label: string; waarde: string; datum: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="t-caption text-ink-muted">{label}</span>
      <span className="flex shrink-0 items-baseline gap-2">
        <span className="cijfers t-body-sm text-ink">{waarde}</span>
        <span className="t-caption text-ink-faint">{korteDatum(datum)}</span>
      </span>
    </div>
  )
}
