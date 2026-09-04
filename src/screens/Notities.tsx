import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'

import { haalAfgerondeSessies } from '../db/repo'
import { korteDatum } from '../lib/date'
import { meervoud } from '../lib/format'
import { Laden, Schil, SubKop } from '../components/Schil'
import { Kaart, LegeStaat, Wenkbrauw } from '../components/ui/basis'

/**
 * Alle notities op één plek en doorzoekbaar. Zo herken je een patroon: typ
 * bijvoorbeeld "schouder" en je ziet elke training waarin je daar iets over
 * schreef.
 */
export function Notities() {
  const navigeer = useNavigate()
  const [zoek, setZoek] = useState('')
  const sessies = useLiveQuery(() => haalAfgerondeSessies(), [])

  if (sessies === undefined) {
    return (
      <Schil>
        <Laden />
      </Schil>
    )
  }

  const term = zoek.trim().toLowerCase()

  const treffers = sessies
    .map((sessie) => {
      const regels: Array<{ bron: string; tekst: string }> = []
      if (sessie.sessieNotitie.trim() !== '') {
        regels.push({ bron: 'Training', tekst: sessie.sessieNotitie })
      }
      for (const entry of sessie.entries) {
        if (entry.notitie.trim() !== '') {
          regels.push({ bron: entry.exerciseNaam, tekst: entry.notitie })
        }
      }
      const passend =
        term === ''
          ? regels
          : regels.filter(
              (r) =>
                r.tekst.toLowerCase().includes(term) || r.bron.toLowerCase().includes(term),
            )
      return { sessie, regels: passend }
    })
    .filter((t) => t.regels.length > 0)

  const totaal = treffers.reduce((som, t) => som + t.regels.length, 0)

  return (
    <Schil>
      <SubKop titel="Notities" />

      <div className="flex flex-col gap-4 pt-4">
        <input
          type="search"
          value={zoek}
          onChange={(e) => setZoek(e.target.value)}
          placeholder="Zoeken, bijvoorbeeld: schouder"
          className="t-body-sm min-h-[48px] w-full rounded-[4px] border border-line-4 bg-surface-2 px-3 text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none"
        />

        {treffers.length === 0 ? (
          <LegeStaat
            titel={term === '' ? 'Nog geen notities' : 'Niets gevonden'}
            uitleg={
              term === ''
                ? 'Tijdens een training staat de notitieknop rechtsonder. Handig om klachten of gevoel vast te leggen.'
                : `Geen notitie met "${zoek.trim()}". Probeer een korter woord.`
            }
          />
        ) : (
          <>
            <Wenkbrauw>
              {meervoud(totaal, 'notitie', 'notities')} in{' '}
              {meervoud(treffers.length, 'training', 'trainingen')}
            </Wenkbrauw>
            {treffers.map(({ sessie, regels }) => (
              <button
                key={sessie.id}
                type="button"
                onClick={() => navigeer(`/historie/${sessie.id}`)}
                className="text-left"
              >
                <Kaart className="flex flex-col gap-2 p-3.5">
                  <div className="t-caption text-ink-muted">
                    {korteDatum(sessie.datum)} · {sessie.templateLabel}
                  </div>
                  {regels.map((regel, i) => (
                    <div key={i} className="flex flex-col gap-0.5">
                      <span className="t-eyebrow uppercase text-ink-faint">{regel.bron}</span>
                      <p className="t-body-sm whitespace-pre-wrap text-ink-2">{regel.tekst}</p>
                    </div>
                  ))}
                </Kaart>
              </button>
            ))}
          </>
        )}
      </div>
    </Schil>
  )
}
