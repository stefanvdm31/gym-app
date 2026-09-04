import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'

import { db } from '../db/db'
import { haalInstellingen } from '../db/repo'
import { klok, korteDatum } from '../lib/date'
import { meervoud } from '../lib/format'
import { Schil, SchermKop } from '../components/Schil'
import { Kaart, Rij } from '../components/ui/basis'

export function Meer() {
  const navigeer = useNavigate()
  const instellingen = useLiveQuery(() => haalInstellingen(), [])
  const aantalOefeningen = useLiveQuery(
    async () => (await db.exercises.toArray()).filter((o) => !o.gearchiveerd).length,
    [],
  )
  const schemas = useLiveQuery(() => db.templates.toArray(), [])

  const regels: Array<{ pad: string; titel: string; rechts?: string }> = [
    {
      pad: '/meer/schemas',
      titel: "Schema's",
      rechts:
        schemas === undefined
          ? undefined
          : schemas
              .slice()
              .sort((a, b) => a.volgorde - b.volgorde)
              .map((s) => s.label)
              .join(' · '),
    },
    {
      pad: '/meer/oefeningen',
      titel: 'Oefeningen',
      rechts: aantalOefeningen === undefined ? undefined : String(aantalOefeningen),
    },
    { pad: '/meer/spiergroepen', titel: 'Spiergroepen' },
    { pad: '/records', titel: 'Persoonlijke records' },
    { pad: '/notities', titel: 'Notities doorzoeken' },
    { pad: '/meer/schijven', titel: 'Schijvencalculator' },
    {
      pad: '/meer/instellingen',
      titel: 'Instellingen',
      rechts:
        instellingen === undefined
          ? undefined
          : `rust ${klok(instellingen.standaardRusttijdSeconden)}`,
    },
    {
      pad: '/meer/backup',
      titel: 'Back-up en export',
      rechts:
        instellingen?.laatsteBackupOp === undefined
          ? 'nog nooit'
          : korteDatum(instellingen.laatsteBackupOp.slice(0, 10)),
    },
  ]

  return (
    <Schil>
      <SchermKop titel="Meer" />
      <Kaart vlak className="divide-y divide-line-2 overflow-hidden">
        {regels.map((regel) => (
          <Rij
            key={regel.pad}
            titel={regel.titel}
            rechts={
              regel.rechts === undefined ? undefined : (
                <span className="t-caption max-w-[150px] truncate text-ink-muted">
                  {regel.rechts}
                </span>
              )
            }
            pijl
            onClick={() => navigeer(regel.pad)}
          />
        ))}
      </Kaart>

      <p className="t-caption mt-5 text-ink-muted">
        Alle gegevens staan alleen op dit toestel. Er gaat niets naar een server en er is geen
        account. Maak daarom regelmatig een back-up
        {schemas !== undefined && schemas.length > 0
          ? ` — je hebt ${meervoud(schemas.length, 'schema', "schema's")}.`
          : '.'}
      </p>
    </Schil>
  )
}
