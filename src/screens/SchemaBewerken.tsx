import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'

import { db } from '../db/db'
import { bewaarSchema, verwijderSchema } from '../db/repo'
import type { TemplateType, Uitvoering, WorkoutTemplate } from '../db/types'
import { useToast } from '../state/ToastContext'
import { Laden, Schil, SubKop } from '../components/Schil'
import { Kaart, Wenkbrauw } from '../components/ui/basis'
import { Knop } from '../components/ui/Knop'
import { Bevestig } from '../components/ui/Sheet'
import { GetalStapper, Keuze, Schakelaar, TekstVeld, Veld } from '../components/ui/Invoer'
import { OefeningKiezer } from './ActieveTraining'

export function SchemaBewerken() {
  const { templateId } = useParams<{ templateId: string }>()
  const navigeer = useNavigate()
  const toast = useToast()

  const [concept, setConcept] = useState<WorkoutTemplate | null>(null)
  const [kiezerOpen, setKiezerOpen] = useState(false)
  const [verwijderOpen, setVerwijderOpen] = useState(false)

  const bestaand = useLiveQuery(
    async () => (templateId === undefined ? null : ((await db.templates.get(templateId)) ?? null)),
    [templateId],
  )
  const oefeningen = useLiveQuery(
    async () => new Map((await db.exercises.toArray()).map((o) => [o.id, o])),
    [],
  )

  useEffect(() => {
    if (concept === null && bestaand !== null && bestaand !== undefined) setConcept(bestaand)
  }, [bestaand, concept])

  if (concept === null || oefeningen === undefined) {
    return (
      <Schil>
        <Laden />
      </Schil>
    )
  }

  const wijzig = (patch: Partial<WorkoutTemplate>): void => setConcept({ ...concept, ...patch })

  const items = [...concept.items].sort((a, b) => a.volgorde - b.volgorde)

  const verplaats = (index: number, richting: -1 | 1): void => {
    const doel = index + richting
    if (doel < 0 || doel >= items.length) return
    const nieuw = [...items]
    const a = nieuw[index]
    const b = nieuw[doel]
    if (a === undefined || b === undefined) return
    nieuw[index] = b
    nieuw[doel] = a
    wijzig({ items: nieuw.map((item, i) => ({ ...item, volgorde: i })) })
  }

  const bewaar = async (): Promise<void> => {
    await bewaarSchema({ ...concept, label: concept.label.trim() || 'Naamloos' })
    toast.toon('Schema opgeslagen', 'goed')
    navigeer(-1)
  }

  return (
    <Schil>
      <SubKop titel={concept.label || 'Schema'} />

      <div className="flex flex-col gap-4 pt-4">
        <Kaart className="flex flex-col gap-4 p-3.5">
          <Veld label="Naam van de trainingsdag">
            <TekstVeld
              waarde={concept.label}
              onWijzig={(v) => wijzig({ label: v })}
              placeholder="Bijvoorbeeld: Dag A"
            />
          </Veld>

          <div className="grid grid-cols-2 gap-3">
            <Veld label="Waar">
              <Keuze<TemplateType>
                waarde={concept.type}
                opties={[
                  { waarde: 'gym', label: 'Sportschool' },
                  { waarde: 'thuis', label: 'Thuis' },
                ]}
                onWijzig={(v) => wijzig({ type: v })}
              />
            </Veld>
            <Veld label="Uitvoering">
              <Keuze<Uitvoering>
                waarde={concept.uitvoering}
                opties={[
                  { waarde: 'sets', label: 'Per oefening' },
                  { waarde: 'rondes', label: 'Circuit' },
                ]}
                onWijzig={(v) => wijzig({ uitvoering: v })}
              />
            </Veld>
          </div>

          {concept.uitvoering === 'rondes' && (
            <Veld
              label="Aantal rondes"
              hulp="Je loopt alle oefeningen achter elkaar af en begint dan opnieuw."
            >
              <GetalStapper
                waarde={concept.rondes}
                stap={1}
                min={1}
                max={10}
                decimalen={0}
                onWijzig={(v) => wijzig({ rondes: v })}
                ariaLabel="Aantal rondes"
                compact
              />
            </Veld>
          )}

          <div className="rounded-[8px] border border-line-3">
            <Schakelaar
              aan={concept.actief}
              onWijzig={(v) => wijzig({ actief: v })}
              label="Meedraaien in de rotatie"
              uitleg="Aan: de app stelt deze dag voor als hij aan de beurt is. Uit: je kiest hem zelf."
            />
          </div>
        </Kaart>

        <div className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between">
            <Wenkbrauw>Oefeningen</Wenkbrauw>
            <span className="t-caption text-ink-muted">{items.length}</span>
          </div>

          {items.length === 0 ? (
            <Kaart vlak className="px-4 py-6">
              <p className="t-caption text-center text-ink-muted">
                Nog geen oefeningen in dit schema.
              </p>
            </Kaart>
          ) : (
            <Kaart vlak className="divide-y divide-line-2 overflow-hidden">
              {items.map((item, i) => {
                const oefening = oefeningen.get(item.exerciseId)
                return (
                  <div key={item.exerciseId} className="flex items-center gap-1 px-3 py-2">
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="t-body-sm truncate text-ink">
                        {oefening?.naam ?? 'Onbekende oefening'}
                      </span>
                      <span className="t-caption text-ink-muted">
                        {item.setsOverride ?? oefening?.standaardSets ?? '?'} ×{' '}
                        {item.repMinOverride ?? oefening?.repMin ?? '?'}
                        {(item.repMaxOverride ?? oefening?.repMax) !==
                        (item.repMinOverride ?? oefening?.repMin)
                          ? `-${item.repMaxOverride ?? oefening?.repMax}`
                          : ''}
                        {oefening?.gearchiveerd === true ? ' · gearchiveerd' : ''}
                      </span>
                    </div>
                    <div className="flex shrink-0 items-center">
                      <button
                        type="button"
                        aria-label="Omhoog"
                        disabled={i === 0}
                        onClick={() => verplaats(i, -1)}
                        className="flex h-11 w-9 items-center justify-center text-ink-faint disabled:opacity-25"
                      >
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                          <path d="M4 10l4-4 4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        aria-label="Omlaag"
                        disabled={i === items.length - 1}
                        onClick={() => verplaats(i, 1)}
                        className="flex h-11 w-9 items-center justify-center text-ink-faint disabled:opacity-25"
                      >
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                          <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        aria-label="Verwijderen uit dit schema"
                        onClick={() =>
                          wijzig({
                            items: items
                              .filter((_, j) => j !== i)
                              .map((it, j) => ({ ...it, volgorde: j })),
                          })
                        }
                        className="flex h-11 w-10 items-center justify-center text-ink-faint hover:text-fout"
                      >
                        <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                          <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )
              })}
            </Kaart>
          )}

          <Knop soort="stil" vol onClick={() => setKiezerOpen(true)}>
            Oefening toevoegen
          </Knop>
        </div>

        <div className="flex flex-col gap-2 pt-1">
          <Knop soort="primair" maat="groot" vol onClick={() => void bewaar()}>
            Bewaren
          </Knop>
          <Knop soort="gevaar" vol onClick={() => setVerwijderOpen(true)}>
            Schema verwijderen
          </Knop>
        </div>
      </div>

      <OefeningKiezer
        open={kiezerOpen}
        titel="Oefening toevoegen"
        uitsluiten={items.map((i) => i.exerciseId)}
        onSluit={() => setKiezerOpen(false)}
        onKies={(exerciseId) => {
          wijzig({ items: [...items, { exerciseId, volgorde: items.length }] })
          setKiezerOpen(false)
        }}
      />

      <Bevestig
        open={verwijderOpen}
        titel="Schema verwijderen?"
        gevaarlijk
        bevestigLabel="Verwijderen"
        tekst="Het schema verdwijnt. Je trainingen die je met dit schema deed blijven gewoon in je historie staan."
        onAnnuleer={() => setVerwijderOpen(false)}
        onBevestig={() => {
          void verwijderSchema(concept.id)
          navigeer('/meer/schemas', { replace: true })
        }}
      />
    </Schil>
  )
}
