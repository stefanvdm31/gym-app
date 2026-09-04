import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate } from 'react-router-dom'

import { haalInstellingen } from '../db/repo'
import { berekenSchijven } from '../lib/plates'
import { getal } from '../lib/format'
import { Laden, Schil, SubKop } from '../components/Schil'
import { Kaart, Melding, Wenkbrauw } from '../components/ui/basis'
import { Knop } from '../components/ui/Knop'
import { GetalStapper, Veld } from '../components/ui/Invoer'

export function Schijvencalculator() {
  const navigeer = useNavigate()
  const instellingen = useLiveQuery(() => haalInstellingen(), [])
  const [doel, setDoel] = useState(60)

  if (instellingen === undefined) {
    return (
      <Schil>
        <Laden />
      </Schil>
    )
  }

  const resultaat = berekenSchijven(
    doel,
    instellingen.stangGewichtKg,
    instellingen.beschikbareSchijven,
  )

  return (
    <Schil>
      <SubKop titel="Schijvencalculator" />

      <div className="flex flex-col gap-4 pt-4">
        <Kaart className="flex flex-col gap-4 p-3.5">
          <Veld
            label="Doelgewicht in kg"
            hulp={`Inclusief de stang van ${getal(instellingen.stangGewichtKg)} kg.`}
          >
            <GetalStapper
              waarde={doel}
              stap={2.5}
              min={0}
              max={500}
              onWijzig={setDoel}
              ariaLabel="Doelgewicht"
            />
          </Veld>

          <div className="flex items-baseline justify-between gap-3 border-t border-line-2 pt-4">
            <Wenkbrauw>Op de stang</Wenkbrauw>
            <div className="flex items-baseline gap-2">
              <span className="cijfers t-h1 text-ink">{getal(resultaat.haalbaarGewicht)}</span>
              <span className="t-body-sm text-ink-muted">kg</span>
            </div>
          </div>

          {resultaat.waarschuwing !== null && (
            <Melding toon="let-op" titel="Let op">
              {resultaat.waarschuwing}
            </Melding>
          )}

          {resultaat.isBenadering && resultaat.waarschuwing === null && (
            <Melding toon="let-op" titel="Niet precies te maken">
              {getal(doel)} kg lukt niet met jouw schijven. Dit is het dichtstbijzijnde haalbare
              gewicht.
            </Melding>
          )}
        </Kaart>

        <Kaart className="flex flex-col gap-3 p-3.5">
          <Wenkbrauw>Per kant</Wenkbrauw>
          {resultaat.perKant.length === 0 ? (
            <p className="t-body-sm text-ink-2">Geen schijven: alleen de lege stang.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {resultaat.perKant.map(({ schijf, aantal }) => (
                <div
                  key={schijf}
                  className="flex items-center justify-between gap-3 rounded-[8px] border border-line-3 bg-surface-2 px-3.5 py-3"
                >
                  <span className="cijfers t-title text-ink">{getal(schijf)} kg</span>
                  <span className="t-body-sm text-ink-2">
                    {aantal}× per kant
                    <span className="text-ink-muted"> · {aantal * 2} totaal</span>
                  </span>
                </div>
              ))}
            </div>
          )}
          <p className="t-caption text-ink-muted">
            Schijven van zwaar naar licht. Elke schijf gaat aan beide kanten van de stang.
          </p>
        </Kaart>

        <Knop soort="stil" vol onClick={() => navigeer('/meer/instellingen')}>
          Stang en schijven aanpassen
        </Knop>
      </div>
    </Schil>
  )
}
