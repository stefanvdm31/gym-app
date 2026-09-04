import { useState } from 'react'
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
import {
  bewaarMeting,
  bewaarWeging,
  haalInstellingen,
  verwijderMeting,
  verwijderWeging,
} from '../db/repo'
import type { Measurement } from '../db/types'
import { analyseerTempo, metWeekGemiddelde } from '../lib/bodyweight'
import { korteDatum, vandaagIso } from '../lib/date'
import { getal, leesGetal } from '../lib/format'
import { Laden, Schil, SchermKop } from '../components/Schil'
import { Kaart, LegeStaat, Melding, Wenkbrauw } from '../components/ui/basis'
import { Knop } from '../components/ui/Knop'
import { Bevestig, Sheet } from '../components/ui/Sheet'
import { GetalStapper, Keuze, TekstGebied, TekstVeld, Veld } from '../components/ui/Invoer'

const MAAT_VELDEN: Array<{ sleutel: keyof Measurement; label: string }> = [
  { sleutel: 'borst', label: 'Borst' },
  { sleutel: 'taille', label: 'Taille' },
  { sleutel: 'heup', label: 'Heup' },
  { sleutel: 'bovenarmL', label: 'Bovenarm links' },
  { sleutel: 'bovenarmR', label: 'Bovenarm rechts' },
  { sleutel: 'dijbeen', label: 'Dijbeen' },
]

export function Lichaam() {
  const [wegingOpen, setWegingOpen] = useState(false)
  const [metingOpen, setMetingOpen] = useState(false)

  const instellingen = useLiveQuery(() => haalInstellingen(), [])
  const wegingen = useLiveQuery(
    async () => (await db.bodyWeights.toArray()).sort((a, b) => a.datum.localeCompare(b.datum)),
    [],
  )
  const metingen = useLiveQuery(
    async () => (await db.measurements.toArray()).sort((a, b) => b.datum.localeCompare(a.datum)),
    [],
  )

  if (instellingen === undefined || wegingen === undefined || metingen === undefined) {
    return (
      <Schil>
        <Laden />
      </Schil>
    )
  }

  const punten = metWeekGemiddelde(wegingen)
  const tempo = analyseerTempo(
    punten,
    instellingen.gewichtsDoel,
    instellingen.tempoMinKgPerWeek,
    instellingen.tempoMaxKgPerWeek,
  )
  const laatste = punten.at(-1)

  const grafiek = punten.slice(-90).map((p) => ({
    label: korteDatum(p.datum),
    dag: p.gewichtKg,
    gemiddelde: p.weekGemiddelde,
  }))

  return (
    <Schil>
      <SchermKop titel="Lichaam" />

      <div className="flex flex-col gap-5">
        {/* Lichaamsgewicht */}
        <Kaart className="flex flex-col gap-3.5 p-3.5">
          <div className="flex items-end justify-between gap-3">
            <div className="flex flex-col gap-0.5">
              <Wenkbrauw>Lichaamsgewicht</Wenkbrauw>
              <div className="flex items-baseline gap-2">
                <span className="cijfers t-h1 text-ink">
                  {laatste === undefined ? '—' : getal(laatste.gewichtKg, 1)}
                </span>
                <span className="t-body-sm text-ink-muted">kg</span>
              </div>
            </div>
            {laatste?.weekGemiddelde != null && (
              <span className="t-caption text-right text-ink-muted">
                7-daags gem. {getal(laatste.weekGemiddelde, 1)}
              </span>
            )}
          </div>

          {wegingen.length === 0 ? (
            <p className="t-caption text-ink-muted">
              Nog geen wegingen. Weeg jezelf het liefst elke ochtend op hetzelfde moment.
            </p>
          ) : (
            <>
              <div className="h-[130px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={grafiek} margin={{ top: 4, right: 6, bottom: 0, left: -18 }}>
                    <CartesianGrid stroke="#2e2e2e" vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={{ fill: '#8e8b87', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      minTickGap={28}
                    />
                    <YAxis
                      tick={{ fill: '#8e8b87', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      width={44}
                      domain={['dataMin - 1', 'dataMax + 1']}
                    />
                    <Tooltip
                      contentStyle={{
                        background: '#2c2c2c',
                        border: '1px solid #3d3d3d',
                        borderRadius: 8,
                        fontSize: 13,
                      }}
                      labelStyle={{ color: '#cbc9c6' }}
                      formatter={(waarde, naam) => [
                        `${getal(Number(waarde), 1)} kg`,
                        naam === 'dag' ? 'weging' : 'weekgemiddelde',
                      ]}
                    />
                    <Line
                      type="monotone"
                      dataKey="dag"
                      stroke="#3f3f3f"
                      strokeWidth={1.5}
                      dot={false}
                      isAnimationActive={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="gemiddelde"
                      stroke="#4c9ff0"
                      strokeWidth={2}
                      dot={false}
                      connectNulls
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="flex items-center gap-3 border-t border-line-2 pt-3">
                <span className="flex items-center gap-1.5">
                  <span className="h-0.5 w-4 rounded bg-[#3f3f3f]" />
                  <span className="t-caption text-ink-muted">per dag</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-0.5 w-4 rounded bg-accent" />
                  <span className="t-caption text-ink-muted">weekgemiddelde</span>
                </span>
              </div>

              <TempoKaart tempo={tempo} />
            </>
          )}

          <Knop soort="secundair" vol onClick={() => setWegingOpen(true)}>
            {wegingen.some((w) => w.datum === vandaagIso())
              ? 'Weging van vandaag aanpassen'
              : 'Weging toevoegen'}
          </Knop>
        </Kaart>

        {/* Omtrekmaten */}
        <div className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between">
            <Wenkbrauw>Omtrekmaten</Wenkbrauw>
            <span className="t-caption text-ink-muted">elke vier weken</span>
          </div>
          {metingen.length === 0 ? (
            <LegeStaat
              titel="Nog geen maten"
              uitleg="Meet elke vier weken op hetzelfde moment van de dag. Twee metingen zijn genoeg om te vergelijken."
              actie={
                <Knop soort="primair" onClick={() => setMetingOpen(true)}>
                  Meting toevoegen
                </Knop>
              }
            />
          ) : (
            <>
              <MetingVergelijking metingen={metingen} />
              <Knop soort="secundair" vol onClick={() => setMetingOpen(true)}>
                Meting toevoegen
              </Knop>
            </>
          )}
        </div>
      </div>

      <WegingSheet
        open={wegingOpen}
        onSluit={() => setWegingOpen(false)}
        startGewicht={laatste?.gewichtKg ?? 80}
        alBestaand={wegingen}
      />
      <MetingSheet open={metingOpen} onSluit={() => setMetingOpen(false)} laatste={metingen[0]} />
    </Schil>
  )
}

function TempoKaart({ tempo }: { tempo: ReturnType<typeof analyseerTempo> }) {
  const toon =
    tempo.oordeel === 'op-schema'
      ? 'goed'
      : tempo.oordeel === 'onbekend'
        ? 'accent'
        : 'let-op'

  return (
    <Melding toon={toon} titel="Weekgemiddelde">
      {tempo.veranderingKgPerWeek === null ? (
        tempo.tekst
      ) : (
        <>
          {tempo.veranderingKgPerWeek >= 0 ? '+' : ''}
          {getal(tempo.veranderingKgPerWeek, 2)} kg ten opzichte van vorige week. {tempo.tekst}.
        </>
      )}
    </Melding>
  )
}

function MetingVergelijking({ metingen }: { metingen: Measurement[] }) {
  const [aId, setAId] = useState(metingen[0]?.datum ?? '')
  const [bId, setBId] = useState(metingen[1]?.datum ?? metingen[0]?.datum ?? '')
  const [verwijderDatum, setVerwijderDatum] = useState<string | null>(null)

  const a = metingen.find((m) => m.datum === aId) ?? metingen[0]
  const b = metingen.find((m) => m.datum === bId) ?? metingen[1] ?? metingen[0]

  const opties = metingen.map((m) => ({ waarde: m.datum, label: korteDatum(m.datum) }))

  return (
    <Kaart className="flex flex-col gap-3 p-3.5">
      <div className="grid grid-cols-2 gap-2.5">
        <Veld label="Nu">
          <Keuze waarde={aId} opties={opties} onWijzig={setAId} />
        </Veld>
        <Veld label="Vergelijk met">
          <Keuze waarde={bId} opties={opties} onWijzig={setBId} />
        </Veld>
      </div>

      <div className="flex flex-col">
        {MAAT_VELDEN.map(({ sleutel, label }) => {
          const nu = a?.[sleutel]
          const toen = b?.[sleutel]
          if (typeof nu !== 'number' && typeof toen !== 'number') return null
          const verschil =
            typeof nu === 'number' && typeof toen === 'number' ? nu - toen : null
          return (
            <div
              key={String(sleutel)}
              className="flex items-center justify-between gap-3 border-t border-line-2 py-2.5 first:border-t-0"
            >
              <span className="t-body-sm text-ink">{label}</span>
              <span className="flex shrink-0 items-baseline gap-3">
                <span className="cijfers t-body-sm text-ink-2">
                  {typeof nu === 'number' ? `${getal(nu, 1)} cm` : '—'}
                </span>
                {verschil !== null && (
                  <span
                    className={`cijfers t-caption w-12 text-right ${
                      Math.abs(verschil) < 0.05
                        ? 'text-ink-muted'
                        : verschil > 0
                          ? 'text-goed'
                          : 'text-let-op'
                    }`}
                  >
                    {verschil > 0 ? '+' : ''}
                    {getal(verschil, 1)}
                  </span>
                )}
              </span>
            </div>
          )
        })}
      </div>

      {a?.notitie !== undefined && a.notitie.trim() !== '' && (
        <p className="t-caption border-t border-line-2 pt-2.5 text-ink-muted">{a.notitie}</p>
      )}

      {a !== undefined && (
        <button
          type="button"
          onClick={() => setVerwijderDatum(a.datum)}
          className="t-caption min-h-[40px] self-start text-ink-faint hover:text-fout"
        >
          Meting van {korteDatum(a.datum)} verwijderen
        </button>
      )}

      <Bevestig
        open={verwijderDatum !== null}
        titel="Meting verwijderen?"
        gevaarlijk
        bevestigLabel="Verwijderen"
        tekst="Deze meting verdwijnt uit je vergelijkingen."
        onAnnuleer={() => setVerwijderDatum(null)}
        onBevestig={() => {
          if (verwijderDatum !== null) void verwijderMeting(verwijderDatum)
          setVerwijderDatum(null)
        }}
      />
    </Kaart>
  )
}

function WegingSheet({
  open,
  onSluit,
  startGewicht,
  alBestaand,
}: {
  open: boolean
  onSluit: () => void
  startGewicht: number
  alBestaand: Array<{ datum: string; gewichtKg: number }>
}) {
  const [datum, setDatum] = useState(vandaagIso())
  const bestaand = alBestaand.find((w) => w.datum === datum)
  const [gewicht, setGewicht] = useState(bestaand?.gewichtKg ?? startGewicht)

  return (
    <Sheet
      open={open}
      titel="Weging"
      onSluit={onSluit}
      voet={
        <div className="flex gap-2">
          {bestaand !== undefined && (
            <Knop
              soort="gevaar"
              onClick={() => {
                void verwijderWeging(datum)
                onSluit()
              }}
            >
              Wissen
            </Knop>
          )}
          <Knop
            soort="primair"
            vol
            onClick={() => {
              void bewaarWeging({ datum, gewichtKg: gewicht })
              onSluit()
            }}
          >
            Bewaren
          </Knop>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <Veld label="Datum" hulp="Eén weging per dag. Een tweede overschrijft de eerste.">
          <input
            type="date"
            value={datum}
            max={vandaagIso()}
            onChange={(e) => {
              setDatum(e.target.value)
              const gevonden = alBestaand.find((w) => w.datum === e.target.value)
              if (gevonden !== undefined) setGewicht(gevonden.gewichtKg)
            }}
            className="t-body-sm min-h-[48px] w-full rounded-[4px] border border-line-4 bg-surface-2 px-3 text-ink focus:border-accent focus:outline-none"
          />
        </Veld>
        <Veld label="Gewicht in kg">
          <GetalStapper
            waarde={gewicht}
            stap={0.1}
            min={20}
            max={300}
            decimalen={1}
            onWijzig={setGewicht}
            ariaLabel="Lichaamsgewicht"
          />
        </Veld>
      </div>
    </Sheet>
  )
}

function MetingSheet({
  open,
  onSluit,
  laatste,
}: {
  open: boolean
  onSluit: () => void
  laatste: Measurement | undefined
}) {
  const [datum, setDatum] = useState(vandaagIso())
  const [waarden, setWaarden] = useState<Record<string, string>>({})
  const [notitie, setNotitie] = useState('')

  const bewaar = (): void => {
    const meting: Measurement = { datum, notitie }
    for (const { sleutel } of MAAT_VELDEN) {
      const ruw = waarden[String(sleutel)]
      const waarde = ruw === undefined ? null : leesGetal(ruw)
      if (waarde !== null) {
        ;(meting as unknown as Record<string, number>)[String(sleutel)] = waarde
      }
    }
    void bewaarMeting(meting)
    onSluit()
  }

  return (
    <Sheet
      open={open}
      titel="Omtrekmaten"
      onSluit={onSluit}
      voet={
        <Knop soort="primair" vol onClick={bewaar}>
          Bewaren
        </Knop>
      }
    >
      <div className="flex flex-col gap-4">
        <Veld label="Datum">
          <input
            type="date"
            value={datum}
            max={vandaagIso()}
            onChange={(e) => setDatum(e.target.value)}
            className="t-body-sm min-h-[48px] w-full rounded-[4px] border border-line-4 bg-surface-2 px-3 text-ink focus:border-accent focus:outline-none"
          />
        </Veld>

        {MAAT_VELDEN.map(({ sleutel, label }) => {
          const vorige = laatste?.[sleutel]
          return (
            <Veld
              key={String(sleutel)}
              label={`${label} (cm)`}
              hulp={typeof vorige === 'number' ? `vorige keer ${getal(vorige, 1)} cm` : undefined}
            >
              <TekstVeld
                waarde={waarden[String(sleutel)] ?? ''}
                inputMode="decimal"
                placeholder="leeg laten mag"
                onWijzig={(v) => setWaarden({ ...waarden, [String(sleutel)]: v })}
              />
            </Veld>
          )
        })}

        <Veld label="Notitie">
          <TekstGebied waarde={notitie} onWijzig={setNotitie} regels={3} />
        </Veld>
      </div>
    </Sheet>
  )
}

