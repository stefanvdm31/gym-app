import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'

import { db } from '../db/db'
import { bewaarSchema, leegSchema } from '../db/repo'
import { meervoud } from '../lib/format'
import { Laden, Schil, SubKop } from '../components/Schil'
import { Badge, Kaart, LegeStaat, Rij } from '../components/ui/basis'
import { Knop } from '../components/ui/Knop'

export function Schemas() {
  const navigeer = useNavigate()
  const schemas = useLiveQuery(
    async () => (await db.templates.toArray()).sort((a, b) => a.volgorde - b.volgorde),
    [],
  )

  if (schemas === undefined) {
    return (
      <Schil>
        <Laden />
      </Schil>
    )
  }

  const verplaats = async (index: number, richting: -1 | 1): Promise<void> => {
    const doel = index + richting
    const a = schemas[index]
    const b = schemas[doel]
    if (a === undefined || b === undefined) return
    await bewaarSchema({ ...a, volgorde: b.volgorde })
    await bewaarSchema({ ...b, volgorde: a.volgorde })
  }

  const nieuw = async (): Promise<void> => {
    const schema = leegSchema(schemas.length)
    await bewaarSchema({ ...schema, label: 'Nieuwe dag' })
    navigeer(`/meer/schemas/${schema.id}`)
  }

  return (
    <Schil>
      <SubKop
        titel="Schema's"
        rechts={
          <Knop maat="klein" soort="primair" onClick={() => void nieuw()}>
            Nieuw
          </Knop>
        }
      />

      <div className="flex flex-col gap-4 pt-4">
        <p className="t-caption text-ink-muted">
          De volgorde bepaalt welke dag na welke aan de beurt is. Alleen actieve dagen doen mee in
          die rotatie; de rest kies je zelf op het startscherm.
        </p>

        {schemas.length === 0 ? (
          <LegeStaat
            titel="Nog geen schema's"
            uitleg="Een schema is een trainingsdag: een lijstje oefeningen in een vaste volgorde."
            actie={
              <Knop soort="primair" onClick={() => void nieuw()}>
                Eerste schema maken
              </Knop>
            }
          />
        ) : (
          <Kaart vlak className="divide-y divide-line-2 overflow-hidden">
            {schemas.map((schema, i) => (
              <div key={schema.id} className="flex items-center">
                <div className="min-w-0 flex-1">
                  <Rij
                    titel={schema.label}
                    onder={`${schema.type === 'thuis' ? 'Thuis' : 'Sportschool'} · ${
                      schema.uitvoering === 'rondes'
                        ? `${schema.rondes} rondes`
                        : meervoud(schema.items.length, 'oefening', 'oefeningen')
                    }`}
                    rechts={schema.actief ? <Badge toon="accent">rotatie</Badge> : <Badge>los</Badge>}
                    pijl
                    onClick={() => navigeer(`/meer/schemas/${schema.id}`)}
                  />
                </div>
                <div className="flex shrink-0 flex-col pr-2">
                  <button
                    type="button"
                    aria-label={`${schema.label} omhoog`}
                    disabled={i === 0}
                    onClick={() => void verplaats(i, -1)}
                    className="flex h-8 w-10 items-center justify-center text-ink-faint disabled:opacity-25"
                  >
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                      <path d="M4 10l4-4 4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    aria-label={`${schema.label} omlaag`}
                    disabled={i === schemas.length - 1}
                    onClick={() => void verplaats(i, 1)}
                    className="flex h-8 w-10 items-center justify-center text-ink-faint disabled:opacity-25"
                  >
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                      <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </Kaart>
        )}
      </div>
    </Schil>
  )
}
