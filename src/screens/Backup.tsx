import { useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'

import { haalInstellingen } from '../db/repo'
import {
  exporteerBackup,
  exporteerCsv,
  herstelBackup,
  leesBackup,
  vatSamen,
  type BackupBestand,
  type ImportModus,
  type ImportSamenvatting,
} from '../lib/backup'
import { korteDatum } from '../lib/date'
import { useToast } from '../state/ToastContext'
import { Laden, Schil, SubKop } from '../components/Schil'
import { Kaart, Melding, Wenkbrauw } from '../components/ui/basis'
import { Knop } from '../components/ui/Knop'
import { Sheet } from '../components/ui/Sheet'

export function Backup() {
  const toast = useToast()
  const bestandRef = useRef<HTMLInputElement>(null)

  const [bezig, setBezig] = useState(false)
  const [gelezen, setGelezen] = useState<{
    bestand: BackupBestand
    samenvatting: ImportSamenvatting
  } | null>(null)
  const [modus, setModus] = useState<ImportModus>('samenvoegen')
  const [fout, setFout] = useState<string | null>(null)

  const instellingen = useLiveQuery(() => haalInstellingen(), [])

  if (instellingen === undefined) {
    return (
      <Schil>
        <Laden />
      </Schil>
    )
  }

  const kiesBestand = async (bestand: File): Promise<void> => {
    setFout(null)
    try {
      const tekst = await bestand.text()
      const inhoud = leesBackup(tekst)
      setGelezen({ bestand: inhoud, samenvatting: vatSamen(inhoud) })
    } catch (e: unknown) {
      setFout(e instanceof Error ? e.message : 'Het bestand kon niet gelezen worden.')
    }
  }

  const herstel = async (): Promise<void> => {
    if (gelezen === null) return
    setBezig(true)
    try {
      await herstelBackup(gelezen.bestand, modus)
      toast.toon('Back-up teruggezet', 'goed')
      setGelezen(null)
      // Alles opnieuw inlezen, zodat elk scherm meteen de nieuwe gegevens toont.
      window.location.reload()
    } catch (e: unknown) {
      setFout(e instanceof Error ? e.message : 'Terugzetten is niet gelukt.')
    } finally {
      setBezig(false)
    }
  }

  return (
    <Schil>
      <SubKop titel="Back-up en export" />

      <div className="flex flex-col gap-4 pt-4">
        <Melding toon={instellingen.laatsteBackupOp === undefined ? 'let-op' : 'accent'} titel="Status">
          {instellingen.laatsteBackupOp === undefined
            ? 'Je hebt nog nooit een back-up gemaakt. Al je gegevens staan alleen op dit toestel.'
            : `Laatste back-up: ${korteDatum(instellingen.laatsteBackupOp.slice(0, 10))}.`}
        </Melding>

        <Kaart className="flex flex-col gap-3 p-3.5">
          <Wenkbrauw>Exporteren</Wenkbrauw>
          <p className="t-caption text-ink-muted">
            Eén bestand met alles: oefeningen, schema's, trainingen, wegingen, maten en
            instellingen. Bewaar het ergens buiten je telefoon, bijvoorbeeld in je e-mail of cloud.
          </p>
          <Knop
            soort="primair"
            maat="groot"
            vol
            disabled={bezig}
            onClick={() => {
              void exporteerBackup().then(() => toast.toon('Back-up gedownload', 'goed'))
            }}
          >
            Back-up downloaden (JSON)
          </Knop>
          <Knop
            soort="secundair"
            vol
            disabled={bezig}
            onClick={() => {
              void exporteerCsv().then(() => toast.toon('CSV gedownload', 'goed'))
            }}
          >
            Trainingshistorie downloaden (CSV)
          </Knop>
          <p className="t-caption text-ink-muted">
            De CSV heeft één regel per set en gebruikt puntkomma's, zodat Excel hem in het
            Nederlands meteen goed opent.
          </p>
        </Kaart>

        <Kaart className="flex flex-col gap-3 p-3.5">
          <Wenkbrauw>Importeren</Wenkbrauw>
          <p className="t-caption text-ink-muted">
            Kies een back-upbestand. Je krijgt eerst te zien wat erin zit en kiest daarna zelf of je
            het samenvoegt of alles vervangt.
          </p>
          <input
            ref={bestandRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const bestand = e.target.files?.[0]
              if (bestand !== undefined) void kiesBestand(bestand)
              e.target.value = ''
            }}
          />
          <Knop soort="secundair" vol onClick={() => bestandRef.current?.click()}>
            Bestand kiezen
          </Knop>
          {fout !== null && (
            <Melding toon="fout" titel="Fout">
              {fout}
            </Melding>
          )}
        </Kaart>

        <Melding toon="accent" titel="Waarom dit belangrijk is">
          Er is geen server en geen account. Wis je de app of raak je je telefoon kwijt, dan zijn je
          gegevens weg. Het startscherm herinnert je eraan als je laatste back-up ouder is dan 30
          dagen.
        </Melding>
      </div>

      <Sheet
        open={gelezen !== null}
        titel="Back-up terugzetten"
        onSluit={() => setGelezen(null)}
        voet={
          <div className="flex gap-2">
            <Knop soort="stil" vol onClick={() => setGelezen(null)}>
              Annuleren
            </Knop>
            <Knop
              soort={modus === 'vervangen' ? 'gevaar' : 'primair'}
              vol
              disabled={bezig}
              onClick={() => void herstel()}
            >
              {modus === 'vervangen' ? 'Alles vervangen' : 'Samenvoegen'}
            </Knop>
          </div>
        }
      >
        {gelezen !== null && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Wenkbrauw>Dit zit erin</Wenkbrauw>
              <div className="t-body-sm flex flex-col gap-1 text-ink-2">
                <span>
                  Gemaakt op:{' '}
                  {gelezen.samenvatting.gemaaktOp === null
                    ? 'onbekend'
                    : korteDatum(gelezen.samenvatting.gemaaktOp.slice(0, 10))}
                </span>
                <span>{gelezen.samenvatting.oefeningen} oefeningen</span>
                <span>{gelezen.samenvatting.schemas} schema's</span>
                <span>{gelezen.samenvatting.sessies} trainingen</span>
                <span>{gelezen.samenvatting.wegingen} wegingen</span>
                <span>{gelezen.samenvatting.metingen} omtrekmetingen</span>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Wenkbrauw>Hoe wil je het terugzetten?</Wenkbrauw>
              <KeuzeKaart
                gekozen={modus === 'samenvoegen'}
                titel="Samenvoegen"
                uitleg="Alles uit het bestand komt erbij. Records met hetzelfde kenmerk worden overschreven, de rest blijft staan."
                onKies={() => setModus('samenvoegen')}
              />
              <KeuzeKaart
                gekozen={modus === 'vervangen'}
                titel="Alles vervangen"
                uitleg="Wist eerst alles wat er nu in de app staat en zet daarna het bestand terug. Dit kun je niet ongedaan maken."
                gevaarlijk
                onKies={() => setModus('vervangen')}
              />
            </div>

            {modus === 'vervangen' && (
              <Melding toon="fout" titel="Let op">
                Je huidige trainingen, wegingen en maten worden gewist. Maak eerst een back-up van
                wat er nu in staat als je twijfelt.
              </Melding>
            )}
          </div>
        )}
      </Sheet>
    </Schil>
  )
}

function KeuzeKaart({
  gekozen,
  titel,
  uitleg,
  gevaarlijk = false,
  onKies,
}: {
  gekozen: boolean
  titel: string
  uitleg: string
  gevaarlijk?: boolean
  onKies: () => void
}) {
  return (
    <button
      type="button"
      onClick={onKies}
      className={`flex flex-col gap-1 rounded-[12px] border px-3.5 py-3 text-left ${
        gekozen
          ? gevaarlijk
            ? 'border-fout bg-fout/10'
            : 'border-accent bg-accent/10'
          : 'border-line-3 bg-surface'
      }`}
    >
      <span className="t-body-sm font-semibold text-ink">
        {gekozen ? '✓ ' : ''}
        {titel}
      </span>
      <span className="t-caption text-ink-muted">{uitleg}</span>
    </button>
  )
}
