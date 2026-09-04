import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'

import { db } from '../db/db'
import { archiveerOefening, bewaarOefening, legeOefening } from '../db/repo'
import type { Exercise, Materiaal } from '../db/types'
import { normaliseerYoutube, youtubeFout } from '../lib/youtube'
import { useToast } from '../state/ToastContext'
import { Laden, Schil, SubKop } from '../components/Schil'
import { Kaart, Melding, Wenkbrauw } from '../components/ui/basis'
import { Knop } from '../components/ui/Knop'
import { Bevestig } from '../components/ui/Sheet'
import {
  GetalStapper,
  Keuze,
  Schakelaar,
  TekstGebied,
  TekstVeld,
  Veld,
} from '../components/ui/Invoer'

const MATERIALEN: Array<{ waarde: Materiaal; label: string }> = [
  { waarde: 'halter', label: 'Halter' },
  { waarde: 'dumbbell', label: 'Dumbbell' },
  { waarde: 'kabel', label: 'Kabel' },
  { waarde: 'machine', label: 'Machine' },
  { waarde: 'lichaamsgewicht', label: 'Lichaamsgewicht' },
  { waarde: 'trap bar', label: 'Trap bar' },
  { waarde: 'overig', label: 'Overig' },
]

export function OefeningBewerken() {
  const { exerciseId } = useParams<{ exerciseId: string }>()
  const navigeer = useNavigate()
  const toast = useToast()
  const isNieuw = exerciseId === 'nieuw'

  const [concept, setConcept] = useState<Exercise | null>(null)
  const [archiveerOpen, setArchiveerOpen] = useState(false)

  const bestaand = useLiveQuery(
    async () => (isNieuw || exerciseId === undefined ? null : (await db.exercises.get(exerciseId)) ?? null),
    [exerciseId, isNieuw],
  )
  const spiergroepen = useLiveQuery(
    async () =>
      (await db.muscleGroups.toArray())
        .filter((g) => !g.gearchiveerd)
        .sort((a, b) => a.volgorde - b.volgorde),
    [],
  )

  useEffect(() => {
    if (concept !== null) return
    if (isNieuw) setConcept(legeOefening())
    else if (bestaand !== null && bestaand !== undefined) setConcept(bestaand)
  }, [isNieuw, bestaand, concept])

  if (concept === null || spiergroepen === undefined) {
    return (
      <Schil>
        <Laden />
      </Schil>
    )
  }

  const wijzig = (patch: Partial<Exercise>): void => {
    setConcept({ ...concept, ...patch })
  }

  const naamFout = concept.naam.trim() === '' ? 'Geef de oefening een naam' : null
  const groepFout = concept.spiergroepPrimair === '' ? 'Kies een primaire spiergroep' : null
  const repFout =
    concept.repMax < concept.repMin ? 'Het maximum mag niet lager zijn dan het minimum' : null
  const videoFout = youtubeFout(concept.youtubeUrl)
  const kanBewaren = naamFout === null && groepFout === null && repFout === null && videoFout === null

  const bewaar = async (): Promise<void> => {
    const genormaliseerd = normaliseerYoutube(concept.youtubeUrl)
    await bewaarOefening({
      ...concept,
      naam: concept.naam.trim(),
      youtubeUrl: genormaliseerd ?? '',
    })
    toast.toon(isNieuw ? 'Oefening aangemaakt' : 'Oefening bijgewerkt', 'goed')
    navigeer(-1)
  }

  return (
    <Schil>
      <SubKop titel={isNieuw ? 'Nieuwe oefening' : concept.naam || 'Oefening'} />

      <div className="flex flex-col gap-4 pt-4">
        <Kaart className="flex flex-col gap-4 p-3.5">
          <Veld label="Naam" fout={naamFout}>
            <TekstVeld
              waarde={concept.naam}
              onWijzig={(v) => wijzig({ naam: v })}
              placeholder="Bijvoorbeeld: Barbell bench press"
            />
          </Veld>

          <Veld
            label="Primaire spiergroep"
            fout={groepFout}
            hulp="Telt heel mee in je wekelijkse settelling."
          >
            <Keuze
              waarde={concept.spiergroepPrimair}
              opties={[
                { waarde: '', label: 'Kies een spiergroep' },
                ...spiergroepen.map((g) => ({ waarde: g.id, label: g.naam })),
              ]}
              onWijzig={(v) => wijzig({ spiergroepPrimair: v })}
            />
          </Veld>

          <div className="flex flex-col gap-2">
            <Wenkbrauw>Secundaire spiergroepen</Wenkbrauw>
            <p className="t-caption text-ink-muted">Tellen elk voor een halve set mee.</p>
            <div className="flex flex-wrap gap-2 pt-1">
              {spiergroepen
                .filter((g) => g.id !== concept.spiergroepPrimair)
                .map((g) => {
                  const aan = concept.spiergroepenSecundair.includes(g.id)
                  return (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() =>
                        wijzig({
                          spiergroepenSecundair: aan
                            ? concept.spiergroepenSecundair.filter((id) => id !== g.id)
                            : [...concept.spiergroepenSecundair, g.id],
                        })
                      }
                      className={`t-caption min-h-[40px] rounded-full border px-3 ${
                        aan
                          ? 'border-accent bg-accent/12 text-accent'
                          : 'border-line-4 bg-surface-2 text-ink-2'
                      }`}
                    >
                      {aan ? '✓ ' : ''}
                      {g.naam}
                    </button>
                  )
                })}
            </div>
          </div>

          <Veld label="Materiaal">
            <Keuze
              waarde={concept.materiaal}
              opties={MATERIALEN}
              onWijzig={(v) => wijzig({ materiaal: v })}
            />
          </Veld>
        </Kaart>

        <Kaart className="flex flex-col gap-4 p-3.5">
          <Wenkbrauw>Uitvoering</Wenkbrauw>

          <div className="grid grid-cols-2 gap-3">
            <Veld label="Sets">
              <GetalStapper
                waarde={concept.standaardSets}
                stap={1}
                min={1}
                max={12}
                decimalen={0}
                onWijzig={(v) => wijzig({ standaardSets: v })}
                ariaLabel="Aantal sets"
                compact
              />
            </Veld>
            <Veld label="Rust in seconden">
              <GetalStapper
                waarde={concept.rustSeconden}
                stap={15}
                min={0}
                max={600}
                decimalen={0}
                onWijzig={(v) => wijzig({ rustSeconden: v })}
                ariaLabel="Rusttijd"
                compact
              />
            </Veld>
            <Veld label={concept.isTijdgebonden ? 'Seconden minimaal' : 'Herhalingen minimaal'}>
              <GetalStapper
                waarde={concept.repMin}
                stap={1}
                min={1}
                decimalen={0}
                onWijzig={(v) => wijzig({ repMin: v })}
                ariaLabel="Minimum"
                compact
              />
            </Veld>
            <Veld
              label={concept.isTijdgebonden ? 'Seconden maximaal' : 'Herhalingen maximaal'}
              fout={repFout}
            >
              <GetalStapper
                waarde={concept.repMax}
                stap={1}
                min={1}
                decimalen={0}
                onWijzig={(v) => wijzig({ repMax: v })}
                ariaLabel="Maximum"
                compact
              />
            </Veld>
          </div>

          <Veld
            label="Gewichtsstap in kg"
            hulp="De sprong van de plus- en minknoppen, en de stap die het progressieadvies voorstelt."
          >
            <GetalStapper
              waarde={concept.gewichtsstapKg}
              stap={0.25}
              min={0.25}
              max={25}
              onWijzig={(v) => wijzig({ gewichtsstapKg: v })}
              ariaLabel="Gewichtsstap"
              compact
            />
          </Veld>

          <div className="divide-y divide-line-2 rounded-[8px] border border-line-3">
            <Schakelaar
              aan={concept.isLichaamsgewicht}
              onWijzig={(v) => wijzig({ isLichaamsgewicht: v })}
              label="Lichaamsgewicht"
              uitleg="Het gewichtveld is dan extra gewicht. Negatief mag: −20 betekent hulp."
            />
            <Schakelaar
              aan={concept.isTijdgebonden}
              onWijzig={(v) => wijzig({ isTijdgebonden: v })}
              label="Tijdgebonden"
              uitleg="Je logt seconden in plaats van herhalingen, met een aftelklok."
            />
            <Schakelaar
              aan={concept.isUnilateraal}
              onWijzig={(v) => wijzig({ isUnilateraal: v })}
              label="Per kant"
              uitleg="Eén set telt beide kanten. De app zet er 'per kant' bij."
            />
          </div>
        </Kaart>

        <Kaart className="flex flex-col gap-4 p-3.5">
          <Veld
            label="YouTube-link"
            fout={videoFout}
            hulp="Plak een gewone link, een youtu.be-link of een /shorts/-link. De app maakt er één werkende link van en opent hem buiten de app."
          >
            <TekstVeld
              waarde={concept.youtubeUrl}
              inputMode="url"
              onWijzig={(v) => wijzig({ youtubeUrl: v })}
              placeholder="https://youtu.be/..."
            />
          </Veld>

          <Veld label="Aandachtspunt" hulp="Staat tijdens de training bij de oefening.">
            <TekstVeld
              waarde={concept.aandachtspunt}
              onWijzig={(v) => wijzig({ aandachtspunt: v })}
              placeholder="Bijvoorbeeld: ellebogen ~45 graden"
            />
          </Veld>

          <Veld label="Notitie">
            <TekstGebied
              waarde={concept.notitie}
              onWijzig={(v) => wijzig({ notitie: v })}
              regels={3}
            />
          </Veld>
        </Kaart>

        {!isNieuw && (
          <Melding toon="accent" titel="Let op">
            Hernoem je deze oefening, dan blijven oude trainingen de oude naam tonen. Dat is bewust:
            je historie blijft zo leesbaar.
          </Melding>
        )}

        <div className="flex flex-col gap-2">
          <Knop soort="primair" maat="groot" vol disabled={!kanBewaren} onClick={() => void bewaar()}>
            Bewaren
          </Knop>
          {!isNieuw && (
            <Knop soort="gevaar" vol onClick={() => setArchiveerOpen(true)}>
              {concept.gearchiveerd ? 'Uit archief halen' : 'Archiveren'}
            </Knop>
          )}
        </div>
      </div>

      <Bevestig
        open={archiveerOpen}
        titel={concept.gearchiveerd ? 'Uit archief halen?' : 'Oefening archiveren?'}
        bevestigLabel={concept.gearchiveerd ? 'Terugzetten' : 'Archiveren'}
        tekst={
          concept.gearchiveerd
            ? 'De oefening staat weer in je keuzelijsten.'
            : 'De oefening verdwijnt uit je keuzelijsten, maar blijft in je historie staan. Je kunt hem later terugzetten.'
        }
        onAnnuleer={() => setArchiveerOpen(false)}
        onBevestig={() => {
          void archiveerOefening(concept.id, !concept.gearchiveerd)
          setArchiveerOpen(false)
          navigeer(-1)
        }}
      />
    </Schil>
  )
}
