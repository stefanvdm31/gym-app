import { useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { db } from '../db/db'
import { haalHistorieVanOefening, haalVorigeSets } from '../db/repo'
import { besteRecords, epley } from '../lib/pr'
import { vorigeUitvoeringUitSets, watNogNodig } from '../lib/progression'
import { korteDatum } from '../lib/date'
import { getal, kg } from '../lib/format'
import { Laden, Schil, SubKop } from '../components/Schil'
import { Badge, Kaart, LegeStaat, Melding, Wenkbrauw } from '../components/ui/basis'
import { YoutubeKnop } from '../components/YoutubeKnop'

interface Punt {
  datum: string
  label: string
  zwaarste: number
  e1rm: number
}

export function OefeningProgressie() {
  const { exerciseId } = useParams<{ exerciseId: string }>()

  const oefening = useLiveQuery(
    async () => (exerciseId === undefined ? undefined : db.exercises.get(exerciseId)),
    [exerciseId],
  )
  const historie = useLiveQuery(
    async () => (exerciseId === undefined ? [] : haalHistorieVanOefening(exerciseId)),
    [exerciseId],
  )
  const vorigeSets = useLiveQuery(
    async () => (exerciseId === undefined ? [] : haalVorigeSets(exerciseId)),
    [exerciseId],
  )

  if (oefening === undefined || historie === undefined || vorigeSets === undefined) {
    return (
      <Schil>
        <Laden />
      </Schil>
    )
  }

  const werksets = historie.filter((h) => h.set.voltooid && !h.set.isOpwarm)

  if (werksets.length === 0) {
    return (
      <Schil>
        <SubKop titel={oefening.naam} />
        <div className="pt-6">
          <LegeStaat
            titel="Nog geen gegevens"
            uitleg={`Zodra je ${oefening.naam} een keer hebt gelogd, zie je hier je verloop, je records en hoe dichtbij de volgende gewichtssprong is.`}
          />
        </div>
      </Schil>
    )
  }

  // Eén punt per trainingsdag: de zwaarste set en de beste geschatte 1RM.
  const perDatum = new Map<string, Punt>()
  for (const item of werksets) {
    const bestaand = perDatum.get(item.datum) ?? {
      datum: item.datum,
      label: korteDatum(item.datum),
      zwaarste: 0,
      e1rm: 0,
    }
    bestaand.zwaarste = Math.max(bestaand.zwaarste, item.set.gewichtKg)
    bestaand.e1rm = Math.max(
      bestaand.e1rm,
      oefening.isTijdgebonden
        ? (item.set.seconden ?? 0)
        : epley(item.set.gewichtKg, item.set.reps),
    )
    perDatum.set(item.datum, bestaand)
  }
  const punten = [...perDatum.values()].sort((a, b) => a.datum.localeCompare(b.datum))

  const records = besteRecords(oefening, historie)
  const vorige = vorigeUitvoeringUitSets(oefening, vorigeSets)
  const nodig = watNogNodig(oefening, vorige, oefening.standaardSets)

  const eerste = punten[0]
  const laatste = punten.at(-1)
  const groei =
    eerste === undefined || laatste === undefined ? 0 : laatste.e1rm - eerste.e1rm

  const eenheid = oefening.isTijdgebonden ? 's' : 'kg'
  const grafiekSleutel: keyof Punt = oefening.isTijdgebonden ? 'e1rm' : 'e1rm'

  return (
    <Schil>
      <SubKop titel={oefening.naam} />

      <div className="flex flex-col gap-4 pt-4">
        <Kaart className="flex flex-col gap-3.5 p-3.5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col gap-0.5">
              <Wenkbrauw>
                {oefening.isTijdgebonden ? 'Beste tijd' : 'Geschat 1RM'}
              </Wenkbrauw>
              <div className="flex items-baseline gap-2">
                <span className="cijfers t-h1 text-ink">
                  {getal(laatste?.e1rm ?? 0, 1)}
                </span>
                <span className="t-body-sm text-ink-muted">{eenheid}</span>
              </div>
            </div>
            {punten.length > 1 && (
              <Badge toon={groei >= 0 ? 'goed' : 'let-op'}>
                {groei >= 0 ? '+' : ''}
                {getal(groei, 1)} {eenheid}
              </Badge>
            )}
          </div>

          <div className="h-[150px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={punten} margin={{ top: 4, right: 6, bottom: 0, left: -18 }}>
                <CartesianGrid stroke="#2e2e2e" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: '#8e8b87', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  minTickGap={24}
                />
                <YAxis
                  tick={{ fill: '#8e8b87', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={44}
                  domain={['dataMin - 3', 'dataMax + 3']}
                />
                <Tooltip
                  contentStyle={{
                    background: '#2c2c2c',
                    border: '1px solid #3d3d3d',
                    borderRadius: 8,
                    fontSize: 13,
                  }}
                  labelStyle={{ color: '#cbc9c6' }}
                  formatter={(waarde) => [`${getal(Number(waarde), 1)} ${eenheid}`, '']}
                />
                <Line
                  type="monotone"
                  dataKey={grafiekSleutel}
                  stroke="#4c9ff0"
                  strokeWidth={2}
                  dot={{ r: 2.5, fill: '#4c9ff0' }}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Kaart>

        {nodig !== null && (
          <Melding toon="accent" titel="Dubbele progressie">
            {nodig}
          </Melding>
        )}

        <Kaart className="flex flex-col gap-2.5 p-3.5">
          <Wenkbrauw>Records</Wenkbrauw>
          {records.besteGewicht !== null && (
            <RecordRegel
              label={oefening.isLichaamsgewicht ? 'Zwaarste extra gewicht' : 'Zwaarste gewicht'}
              waarde={`${kg(records.besteGewicht.waarde, { toonPlus: oefening.isLichaamsgewicht })} × ${records.besteGewicht.reps}`}
              datum={records.besteGewicht.datum}
            />
          )}
          {records.besteE1rm !== null && (
            <RecordRegel
              label="Beste geschatte 1RM"
              waarde={`${getal(records.besteE1rm.waarde, 1)} kg`}
              datum={records.besteE1rm.datum}
            />
          )}
          {records.besteSeconden !== null && (
            <RecordRegel
              label="Langste tijd"
              waarde={`${records.besteSeconden.waarde} s`}
              datum={records.besteSeconden.datum}
            />
          )}
        </Kaart>

        <Kaart className="flex flex-col gap-2.5 p-3.5">
          <Wenkbrauw>Instelling</Wenkbrauw>
          <p className="t-body-sm text-ink-2">
            {oefening.standaardSets} × {oefening.repMin}
            {oefening.repMax !== oefening.repMin ? `-${oefening.repMax}` : ''} · stap{' '}
            {getal(oefening.gewichtsstapKg)} kg · rust {oefening.rustSeconden} s
          </p>
          {oefening.aandachtspunt.trim() !== '' && (
            <p className="t-caption text-ink-muted">{oefening.aandachtspunt}</p>
          )}
          <div className="flex">
            <YoutubeKnop
              url={oefening.youtubeUrl}
              exerciseId={oefening.id}
              naam={oefening.naam}
            />
          </div>
        </Kaart>
      </div>
    </Schil>
  )
}

function RecordRegel({
  label,
  waarde,
  datum,
}: {
  label: string
  waarde: string
  datum: string
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-line-2 pt-2.5 first:border-t-0 first:pt-0">
      <span className="t-body-sm text-ink-2">{label}</span>
      <span className="flex shrink-0 items-baseline gap-2">
        <span className="cijfers t-body-sm font-semibold text-ink">{waarde}</span>
        <span className="t-caption text-ink-muted">{korteDatum(datum)}</span>
      </span>
    </div>
  )
}
