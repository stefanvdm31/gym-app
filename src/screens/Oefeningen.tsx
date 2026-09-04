import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'

import { db } from '../db/db'
import { getal } from '../lib/format'
import { Laden, Schil, SubKop } from '../components/Schil'
import { Badge, Kaart, LegeStaat, Rij, Wenkbrauw } from '../components/ui/basis'
import { Knop } from '../components/ui/Knop'

export function Oefeningen() {
  const navigeer = useNavigate()
  const [zoek, setZoek] = useState('')
  const [toonGearchiveerd, setToonGearchiveerd] = useState(false)

  const oefeningen = useLiveQuery(
    async () => (await db.exercises.toArray()).sort((a, b) => a.naam.localeCompare(b.naam, 'nl')),
    [],
  )
  const spiergroepen = useLiveQuery(
    async () => new Map((await db.muscleGroups.toArray()).map((g) => [g.id, g.naam])),
    [],
  )

  if (oefeningen === undefined || spiergroepen === undefined) {
    return (
      <Schil>
        <Laden />
      </Schil>
    )
  }

  const term = zoek.trim().toLowerCase()
  const zichtbaar = oefeningen.filter((o) => {
    if (o.gearchiveerd !== toonGearchiveerd) return false
    if (term === '') return true
    return (
      o.naam.toLowerCase().includes(term) ||
      (spiergroepen.get(o.spiergroepPrimair) ?? '').toLowerCase().includes(term)
    )
  })

  const aantalGearchiveerd = oefeningen.filter((o) => o.gearchiveerd).length

  return (
    <Schil>
      <SubKop
        titel="Oefeningen"
        rechts={
          <Knop maat="klein" soort="primair" onClick={() => navigeer('/meer/oefeningen/nieuw')}>
            Nieuw
          </Knop>
        }
      />

      <div className="flex flex-col gap-4 pt-4">
        <input
          type="search"
          value={zoek}
          onChange={(e) => setZoek(e.target.value)}
          placeholder="Zoeken op naam of spiergroep"
          className="t-body-sm min-h-[48px] w-full rounded-[4px] border border-line-4 bg-surface-2 px-3 text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none"
        />

        {zichtbaar.length === 0 ? (
          <LegeStaat
            titel={term === '' ? 'Geen oefeningen' : 'Niets gevonden'}
            uitleg={
              term === ''
                ? 'Maak je eerste oefening aan met de knop Nieuw rechtsboven.'
                : 'Probeer een ander woord, of maak een nieuwe oefening aan.'
            }
          />
        ) : (
          <Kaart vlak className="divide-y divide-line-2 overflow-hidden">
            {zichtbaar.map((o) => (
              <Rij
                key={o.id}
                titel={o.naam}
                onder={`${spiergroepen.get(o.spiergroepPrimair) ?? 'geen spiergroep'} · ${o.standaardSets} × ${o.repMin}${o.repMax !== o.repMin ? `-${o.repMax}` : ''} · stap ${getal(o.gewichtsstapKg)} kg`}
                rechts={
                  <span className="flex gap-1.5">
                    {o.isTijdgebonden && <Badge>tijd</Badge>}
                    {o.isLichaamsgewicht && <Badge>lich.gew.</Badge>}
                    {o.youtubeUrl.trim() !== '' && <Badge toon="accent">video</Badge>}
                  </span>
                }
                pijl
                onClick={() => navigeer(`/meer/oefeningen/${o.id}`)}
              />
            ))}
          </Kaart>
        )}

        {aantalGearchiveerd > 0 && (
          <button
            type="button"
            onClick={() => setToonGearchiveerd(!toonGearchiveerd)}
            className="t-caption min-h-[44px] text-accent"
          >
            {toonGearchiveerd
              ? 'Terug naar actieve oefeningen'
              : `Gearchiveerde oefeningen bekijken (${aantalGearchiveerd})`}
          </button>
        )}

        <Wenkbrauw>
          {zichtbaar.length} {toonGearchiveerd ? 'gearchiveerd' : 'actief'}
        </Wenkbrauw>
      </div>
    </Schil>
  )
}
