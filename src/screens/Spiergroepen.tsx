import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'

import { db } from '../db/db'
import { bewaarSpiergroep, nieuweSpiergroep } from '../db/repo'
import { Laden, Schil, SubKop } from '../components/Schil'
import { Kaart, Wenkbrauw } from '../components/ui/basis'
import { Knop } from '../components/ui/Knop'
import { TekstVeld, Veld } from '../components/ui/Invoer'

/**
 * De lijst met spiergroepen. Deze is beheerbaar zodat je settelling per week
 * altijd optelt: geen twee varianten van hetzelfde door een typefout.
 */
export function Spiergroepen() {
  const [nieuweNaam, setNieuweNaam] = useState('')

  const groepen = useLiveQuery(
    async () => (await db.muscleGroups.toArray()).sort((a, b) => a.volgorde - b.volgorde),
    [],
  )
  const gebruik = useLiveQuery(async () => {
    const oefeningen = await db.exercises.toArray()
    const telling = new Map<string, number>()
    for (const o of oefeningen) {
      if (o.gearchiveerd) continue
      telling.set(o.spiergroepPrimair, (telling.get(o.spiergroepPrimair) ?? 0) + 1)
      for (const s of o.spiergroepenSecundair) {
        telling.set(s, (telling.get(s) ?? 0) + 1)
      }
    }
    return telling
  }, [])

  if (groepen === undefined || gebruik === undefined) {
    return (
      <Schil>
        <Laden />
      </Schil>
    )
  }

  const voegToe = async (): Promise<void> => {
    const naam = nieuweNaam.trim()
    if (naam === '') return
    await nieuweSpiergroep(naam)
    setNieuweNaam('')
  }

  return (
    <Schil>
      <SubKop titel="Spiergroepen" />

      <div className="flex flex-col gap-4 pt-4">
        <p className="t-caption text-ink-muted">
          Bij elke oefening kies je hieruit. Archiveer je een spiergroep, dan verdwijnt hij uit de
          keuzelijsten maar blijft je oude telling kloppen.
        </p>

        <Kaart vlak className="divide-y divide-line-2 overflow-hidden">
          {groepen.map((groep) => {
            const aantal = gebruik.get(groep.id) ?? 0
            return (
              <div key={groep.id} className="flex items-center gap-2 px-3 py-2">
                <input
                  value={groep.naam}
                  onChange={(e) => void bewaarSpiergroep({ ...groep, naam: e.target.value })}
                  aria-label={`Naam van ${groep.naam}`}
                  className={`t-body-sm min-h-[48px] min-w-0 flex-1 rounded-[4px] border border-transparent bg-transparent px-2 text-ink focus:border-line-4 focus:bg-surface-2 focus:outline-none ${
                    groep.gearchiveerd ? 'opacity-50' : ''
                  }`}
                />
                <span className="t-caption w-16 shrink-0 text-right text-ink-muted">
                  {aantal === 0 ? 'ongebruikt' : `${aantal}×`}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    void bewaarSpiergroep({ ...groep, gearchiveerd: !groep.gearchiveerd })
                  }
                  className="t-caption min-h-[44px] shrink-0 px-2 text-ink-faint hover:text-ink-2"
                >
                  {groep.gearchiveerd ? 'terug' : 'archief'}
                </button>
              </div>
            )
          })}
        </Kaart>

        <Kaart className="flex flex-col gap-3 p-3.5">
          <Wenkbrauw>Nieuwe spiergroep</Wenkbrauw>
          <Veld label="Naam">
            <TekstVeld
              waarde={nieuweNaam}
              onWijzig={setNieuweNaam}
              placeholder="Bijvoorbeeld: onderarmen"
            />
          </Veld>
          <Knop soort="primair" vol disabled={nieuweNaam.trim() === ''} onClick={() => void voegToe()}>
            Toevoegen
          </Knop>
        </Kaart>
      </div>
    </Schil>
  )
}
