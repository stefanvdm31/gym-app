import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'

import { haalInstellingen, wijzigInstellingen } from '../db/repo'
import type { GewichtsDoel, ThemaKeuze } from '../db/types'
import { isDeloadWeek, programmaWeek, vandaagIso } from '../lib/date'
import { getal, leesGetal } from '../lib/format'
import { Laden, Schil, SubKop } from '../components/Schil'
import { Badge, Kaart, Melding, Wenkbrauw } from '../components/ui/basis'
import { Knop } from '../components/ui/Knop'
import { GetalStapper, Keuze, Schakelaar, Segment, TekstVeld, Veld } from '../components/ui/Invoer'

export function Instellingen() {
  const instellingen = useLiveQuery(() => haalInstellingen(), [])
  const [nieuweSchijf, setNieuweSchijf] = useState('')
  const [deloadInvoer, setDeloadInvoer] = useState<string | null>(null)

  if (instellingen === undefined) {
    return (
      <Schil>
        <Laden />
      </Schil>
    )
  }

  const wijzig = (patch: Parameters<typeof wijzigInstellingen>[0]): void => {
    void wijzigInstellingen(patch)
  }

  const week = programmaWeek(instellingen.programmaStartdatum, vandaagIso())
  const deloadTekst = deloadInvoer ?? instellingen.deloadWeken.join(', ')

  return (
    <Schil>
      <SubKop titel="Instellingen" />

      <div className="flex flex-col gap-4 pt-4">
        {/* Weergave */}
        <Kaart className="flex flex-col gap-4 p-3.5">
          <Wenkbrauw>Weergave</Wenkbrauw>

          <Veld
            label="Thema"
            hulp={
              instellingen.thema === 'systeem'
                ? 'De app volgt de instelling van je telefoon en gaat dus mee als die ’s avonds naar donker schakelt.'
                : `Vastgezet op ${instellingen.thema}. Zet op Systeem om je telefoon te laten bepalen.`
            }
          >
            <Segment<ThemaKeuze>
              waarde={instellingen.thema}
              label="Thema"
              opties={[
                { waarde: 'systeem', label: 'Systeem' },
                { waarde: 'licht', label: 'Licht' },
                { waarde: 'donker', label: 'Donker' },
              ]}
              onWijzig={(v) => wijzig({ thema: v })}
            />
          </Veld>
        </Kaart>

        {/* Programma */}
        <Kaart className="flex flex-col gap-4 p-3.5">
          <Wenkbrauw>Programma</Wenkbrauw>

          <Veld
            label="Startdatum van je programma"
            hulp={`Je zit nu in week ${week}${isDeloadWeek(week, instellingen.deloadWeken) ? ' — dat is een deloadweek' : ''}.`}
          >
            <input
              type="date"
              value={instellingen.programmaStartdatum}
              onChange={(e) => wijzig({ programmaStartdatum: e.target.value })}
              className="t-body-sm min-h-[48px] w-full rounded-[4px] border border-line-4 bg-surface-2 px-3 text-ink focus:border-accent focus:outline-none"
            />
          </Veld>

          <Veld
            label="Deloadweken"
            hulp="Weeknummers met een komma ertussen. In die weken train je met halve sets en 60% van je gewichten."
          >
            <TekstVeld
              waarde={deloadTekst}
              inputMode="numeric"
              onWijzig={(v) => {
                setDeloadInvoer(v)
                const weken = v
                  .split(',')
                  .map((deel) => leesGetal(deel))
                  .filter((n): n is number => n !== null && n > 0)
                  .map((n) => Math.round(n))
                wijzig({ deloadWeken: [...new Set(weken)].sort((a, b) => a - b) })
              }}
              placeholder="13, 26, 39"
            />
          </Veld>

          <div className="flex flex-wrap gap-1.5">
            {instellingen.deloadWeken.map((w) => (
              <Badge key={w} toon="let-op">
                week {w}
              </Badge>
            ))}
          </div>
        </Kaart>

        {/* Training */}
        <Kaart className="flex flex-col gap-4 p-3.5">
          <Wenkbrauw>Training</Wenkbrauw>

          <Veld
            label="Standaard rusttijd in seconden"
            hulp="Wordt gebruikt als een oefening zelf geen rusttijd heeft."
          >
            <GetalStapper
              waarde={instellingen.standaardRusttijdSeconden}
              stap={15}
              min={15}
              max={600}
              decimalen={0}
              onWijzig={(v) => wijzig({ standaardRusttijdSeconden: v })}
              ariaLabel="Standaard rusttijd"
              compact
            />
          </Veld>

          <div className="grid grid-cols-2 gap-3">
            <Veld label="Sets per week minimaal">
              <GetalStapper
                waarde={instellingen.setsPerWeekMin}
                stap={1}
                min={1}
                max={40}
                decimalen={0}
                onWijzig={(v) => wijzig({ setsPerWeekMin: v })}
                ariaLabel="Sets per week minimaal"
                compact
              />
            </Veld>
            <Veld label="Sets per week maximaal">
              <GetalStapper
                waarde={instellingen.setsPerWeekMax}
                stap={1}
                min={1}
                max={40}
                decimalen={0}
                onWijzig={(v) => wijzig({ setsPerWeekMax: v })}
                ariaLabel="Sets per week maximaal"
                compact
              />
            </Veld>
          </div>

          <div className="divide-y divide-line-2 rounded-[8px] border border-line-3">
            <Schakelaar
              aan={instellingen.wakeLockAan}
              onWijzig={(v) => wijzig({ wakeLockAan: v })}
              label="Scherm aan tijdens training"
              uitleg="Je telefoon valt niet in slaap zolang een training loopt."
            />
            <Schakelaar
              aan={instellingen.geluidAan}
              onWijzig={(v) => wijzig({ geluidAan: v })}
              label="Geluid bij einde rust"
              uitleg="Kort piepje wanneer de rusttimer op nul staat."
            />
            <Schakelaar
              aan={instellingen.trillenAan}
              onWijzig={(v) => wijzig({ trillenAan: v })}
              label="Trillen bij einde rust"
            />
          </div>
        </Kaart>

        {/* Stang en schijven */}
        <Kaart className="flex flex-col gap-4 p-3.5">
          <Wenkbrauw>Stang en schijven</Wenkbrauw>

          <Veld label="Stanggewicht in kg">
            <GetalStapper
              waarde={instellingen.stangGewichtKg}
              stap={0.5}
              min={0}
              max={50}
              onWijzig={(v) => wijzig({ stangGewichtKg: v })}
              ariaLabel="Stanggewicht"
              compact
            />
          </Veld>

          <div className="flex flex-col gap-2">
            <span className="t-eyebrow uppercase text-ink-muted">Beschikbare schijven</span>
            <div className="flex flex-wrap gap-2">
              {instellingen.beschikbareSchijven
                .slice()
                .sort((a, b) => b - a)
                .map((schijf) => (
                  <button
                    key={schijf}
                    type="button"
                    onClick={() =>
                      wijzig({
                        beschikbareSchijven: instellingen.beschikbareSchijven.filter(
                          (s) => s !== schijf,
                        ),
                      })
                    }
                    className="t-caption min-h-[40px] rounded-full border border-line-4 bg-surface-2 px-3 text-ink-2 hover:border-fout hover:text-fout"
                  >
                    {getal(schijf)} kg ×
                  </button>
                ))}
            </div>
            <div className="flex gap-2">
              <input
                value={nieuweSchijf}
                inputMode="decimal"
                onChange={(e) => setNieuweSchijf(e.target.value)}
                placeholder="bijv. 1,25"
                className="t-body-sm min-h-[48px] flex-1 rounded-[4px] border border-line-4 bg-surface-2 px-3 text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none"
              />
              <Knop
                soort="secundair"
                onClick={() => {
                  const waarde = leesGetal(nieuweSchijf)
                  if (waarde === null || waarde <= 0) return
                  wijzig({
                    beschikbareSchijven: [
                      ...new Set([...instellingen.beschikbareSchijven, waarde]),
                    ],
                  })
                  setNieuweSchijf('')
                }}
              >
                Toevoegen
              </Knop>
            </div>
          </div>
        </Kaart>

        {/* Lichaamsgewicht */}
        <Kaart className="flex flex-col gap-4 p-3.5">
          <Wenkbrauw>Lichaamsgewicht</Wenkbrauw>

          <Veld label="Doel">
            <Keuze<GewichtsDoel>
              waarde={instellingen.gewichtsDoel}
              opties={[
                { waarde: 'afvallen', label: 'Afvallen' },
                { waarde: 'aankomen', label: 'Aankomen' },
                { waarde: 'behouden', label: 'Op gewicht blijven' },
              ]}
              onWijzig={(v) => wijzig({ gewichtsDoel: v })}
            />
          </Veld>

          <div className="grid grid-cols-2 gap-3">
            <Veld label="Tempo minimaal (kg/week)">
              <GetalStapper
                waarde={instellingen.tempoMinKgPerWeek}
                stap={0.05}
                min={0}
                max={2}
                onWijzig={(v) => wijzig({ tempoMinKgPerWeek: v })}
                ariaLabel="Tempo minimaal"
                compact
              />
            </Veld>
            <Veld label="Tempo maximaal (kg/week)">
              <GetalStapper
                waarde={instellingen.tempoMaxKgPerWeek}
                stap={0.05}
                min={0}
                max={2}
                onWijzig={(v) => wijzig({ tempoMaxKgPerWeek: v })}
                ariaLabel="Tempo maximaal"
                compact
              />
            </Veld>
          </div>
        </Kaart>

        <Melding toon="accent" titel="Eenheid">
          De app rekent in kilogram en centimeter. Dat staat vast, zodat er nooit afrondingsfouten
          in je historie sluipen.
        </Melding>
      </div>
    </Schil>
  )
}
