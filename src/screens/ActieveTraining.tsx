import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'

import { db } from '../db/db'
import {
  haalInstellingen,
  haalSessie,
  haalVorigeSets,
  rondSessieAf,
  verwijderSet,
  vervangOefening,
  voegOefeningToeAanSessie,
  voegSetToe,
  wijzigEntry,
  wijzigSessieNotitie,
  wijzigSet,
} from '../db/repo'
import type { Exercise, Session, SessionEntry, SetLog } from '../db/types'
import { berekenAdvies, vorigeUitvoeringUitSets } from '../lib/progression'
import { prSoortLabel } from '../lib/pr'
import { klok } from '../lib/date'
import { getal, kg, meervoud } from '../lib/format'
import { useWakeLock } from '../lib/wakeLock'
import { useRustTimer } from '../state/RustTimer'
import { useToast } from '../state/ToastContext'
import { Schil, Laden } from '../components/Schil'
import { Badge, Kaart, Melding, Staafjes, Vink, Wenkbrauw } from '../components/ui/basis'
import { Knop, IcoonKnop } from '../components/ui/Knop'
import { Bevestig, Sheet } from '../components/ui/Sheet'
import { GetalStapper, TekstGebied } from '../components/ui/Invoer'
import { YoutubeKnop } from '../components/YoutubeKnop'
import { CircuitTraining } from './CircuitTraining'

export function ActieveTraining() {
  const { sessieId } = useParams<{ sessieId: string }>()
  const navigeer = useNavigate()

  const sessie = useLiveQuery(
    async () => (sessieId === undefined ? undefined : haalSessie(sessieId)),
    [sessieId],
  )
  const template = useLiveQuery(
    async () => (sessie === undefined ? undefined : db.templates.get(sessie.templateId)),
    [sessie?.templateId],
  )
  const instellingen = useLiveQuery(() => haalInstellingen(), [])

  useWakeLock(instellingen?.wakeLockAan === true && sessie?.status === 'bezig')

  if (sessieId === undefined) return <Schil><Laden /></Schil>
  if (sessie === undefined || instellingen === undefined) {
    return (
      <Schil>
        <Laden tekst="Training ophalen…" />
      </Schil>
    )
  }

  if (sessie.status === 'afgerond') {
    navigeer(`/historie/${sessie.id}`, { replace: true })
    return null
  }

  if (template?.uitvoering === 'rondes') {
    return <CircuitTraining sessie={sessie} rondes={template.rondes} />
  }

  return <SetsTraining sessie={sessie} />
}

// ── Training in sets ─────────────────────────────────────────────────────

function SetsTraining({ sessie }: { sessie: Session }) {
  const navigeer = useNavigate()
  const rust = useRustTimer()
  const toast = useToast()

  const [actiefIndex, setActiefIndex] = useState(0)
  const [notitieOpen, setNotitieOpen] = useState(false)
  const [notitieTekst, setNotitieTekst] = useState(sessie.sessieNotitie)
  const [afrondenOpen, setAfrondenOpen] = useState(false)
  const [wisselVoor, setWisselVoor] = useState<string | null>(null)
  const [toevoegenOpen, setToevoegenOpen] = useState(false)
  const [verstrekenSec, setVerstrekenSec] = useState(0)

  const entries = useMemo(
    () => [...sessie.entries].sort((a, b) => a.volgorde - b.volgorde),
    [sessie.entries],
  )

  const oefeningen = useLiveQuery(async () => {
    const alle = await db.exercises.toArray()
    return new Map(alle.map((o) => [o.id, o]))
  }, [])

  useEffect(() => {
    const bijwerken = (): void => {
      setVerstrekenSec((Date.now() - new Date(sessie.startTijd).getTime()) / 1000)
    }
    bijwerken()
    const interval = window.setInterval(bijwerken, 1000)
    return () => window.clearInterval(interval)
  }, [sessie.startTijd])

  // Spring automatisch naar de eerste oefening die nog niet af is.
  useEffect(() => {
    const eerste = entries.findIndex(
      (e) => !e.overgeslagen && e.sets.some((s) => !s.voltooid),
    )
    if (eerste !== -1) setActiefIndex(eerste)
  }, [entries.length])

  if (oefeningen === undefined) {
    return (
      <Schil>
        <Laden />
      </Schil>
    )
  }

  const actieveEntry = entries[actiefIndex]
  const actieveOefening =
    actieveEntry === undefined ? undefined : oefeningen.get(actieveEntry.exerciseId)

  const totaalSets = entries.reduce((som, e) => (e.overgeslagen ? som : som + e.sets.length), 0)
  const gedaanSets = entries.reduce((som, e) => som + e.sets.filter((s) => s.voltooid).length, 0)
  const volume = entries.reduce(
    (som, e) =>
      som + e.sets.filter((s) => s.voltooid).reduce((v, s) => v + s.gewichtKg * s.reps, 0),
    0,
  )

  const volgendeOpenSet =
    actieveEntry === undefined ? -1 : actieveEntry.sets.findIndex((s) => !s.voltooid)

  const bevestigSet = async (setIndex: number): Promise<void> => {
    if (actieveEntry === undefined || actieveOefening === undefined) return
    const set = actieveEntry.sets[setIndex]
    if (set === undefined) return

    const wordtVoltooid = !set.voltooid
    await wijzigSet(sessie.id, actieveEntry.exerciseId, setIndex, {
      voltooid: wordtVoltooid,
      voltooidOp: wordtVoltooid ? new Date().toISOString() : undefined,
    })

    if (!wordtVoltooid) return

    // Rusttimer start automatisch met de rusttijd van deze oefening.
    const volgende = actieveEntry.sets.findIndex((s, i) => i > setIndex && !s.voltooid)
    rust.start(
      actieveOefening.rustSeconden,
      actieveOefening.naam,
      volgende === -1
        ? 'Laatste set van deze oefening'
        : `Straks set ${volgende + 1} van ${actieveEntry.sets.length}`,
    )

    // Kijk of dit een record was. De PR-vlag wordt in de database gezet.
    const bijgewerkt = await haalSessie(sessie.id)
    const nieuweSet = bijgewerkt?.entries
      .find((e) => e.exerciseId === actieveEntry.exerciseId)
      ?.sets[setIndex]
    if (nieuweSet?.isPR === true) {
      const soorten = nieuweSet.prSoorten.map(prSoortLabel).join(' en ')
      toast.toon(`Record op ${actieveOefening.naam}: ${soorten}`, 'pr')
    }
  }

  const rondAf = async (): Promise<void> => {
    await rondSessieAf(sessie.id)
    rust.stop()
    toast.toon('Training opgeslagen', 'goed')
    navigeer(`/historie/${sessie.id}`, { replace: true })
  }

  const onderbalk = (
    <div className="flex items-center gap-2.5 pb-2">
      <Knop
        soort="primair"
        maat="groot"
        vol
        disabled={volgendeOpenSet === -1}
        icoon={<Vink />}
        onClick={() => void bevestigSet(volgendeOpenSet)}
      >
        {volgendeOpenSet === -1
          ? 'Oefening klaar'
          : `Set ${volgendeOpenSet + 1} klaar`}
      </Knop>
      <IcoonKnop
        label="Sessienotitie"
        onClick={() => setNotitieOpen(true)}
        className="h-14 w-14 shrink-0 border border-line-4 bg-surface"
      >
        <span className="relative">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <path d="M3.5 3.5h11v11h-11z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
            <path d="M6 7h6M6 10h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          {sessie.sessieNotitie.trim() !== '' && (
            <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-accent" />
          )}
        </span>
      </IcoonKnop>
    </div>
  )

  return (
    <Schil toonNavigatie={false} onderbalk={onderbalk}>
      <div className="flex flex-col gap-3.5 pt-1">
        {/* Kop */}
        <div className="flex items-center justify-between gap-3">
          <IcoonKnop label="Training verlaten" onClick={() => navigeer('/')} className="-ml-3">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
            </svg>
          </IcoonKnop>
          <div className="t-body-sm flex-1 truncate text-center font-semibold text-ink">
            {sessie.templateLabel}
            {sessie.isDeload ? ' · deload' : ''}
          </div>
          <div className="cijfers t-body-sm min-w-[56px] text-right text-ink-muted">
            {klok(verstrekenSec)}
          </div>
        </div>

        {/* Voortgang */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between">
            <span className="t-caption text-ink-muted">
              {gedaanSets} van {totaalSets} sets
            </span>
            <span className="cijfers t-caption text-ink-muted">
              {getal(volume, 0)} kg volume
            </span>
          </div>
          <div className="h-1 overflow-hidden rounded-full bg-surface-2">
            <div
              className="h-full rounded-full bg-accent transition-[width]"
              style={{ width: `${totaalSets === 0 ? 0 : (gedaanSets / totaalSets) * 100}%` }}
            />
          </div>
        </div>

        {sessie.isDeload && (
          <Melding toon="let-op" titel="Deloadweek">
            Halve sets, 60% van je gewichten. Het advies hieronder gaat uit van een normale week.
          </Melding>
        )}

        {/* Afgeronde oefeningen */}
        {entries.slice(0, actiefIndex).map((entry, i) => (
          <button
            key={entry.exerciseId}
            type="button"
            onClick={() => setActiefIndex(i)}
            className="flex min-h-[52px] items-center justify-between gap-3 rounded-[12px] border border-line bg-surface-dim px-3.5 py-2.5 opacity-60"
          >
            <span className="flex min-w-0 items-center gap-2.5">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-goed/16 text-goed">
                {entry.overgeslagen ? '–' : <Vink className="h-3 w-3" />}
              </span>
              <span className="t-body-sm truncate text-ink-2">{entry.exerciseNaam}</span>
            </span>
            <span className="t-caption shrink-0 text-ink-muted">
              {entry.overgeslagen
                ? 'overgeslagen'
                : `${entry.sets.filter((s) => s.voltooid).length} sets`}
            </span>
          </button>
        ))}

        {/* Actieve oefening */}
        {actieveEntry !== undefined && actieveOefening !== undefined && (
          <OefeningKaart
            key={actieveEntry.exerciseId}
            sessie={sessie}
            entry={actieveEntry}
            oefening={actieveOefening}
            onBevestigSet={(i) => void bevestigSet(i)}
            onWissel={() => setWisselVoor(actieveEntry.exerciseId)}
          />
        )}

        {/* Nog te doen */}
        {entries.slice(actiefIndex + 1).map((entry, i) => {
          const oefening = oefeningen.get(entry.exerciseId)
          return (
            <button
              key={entry.exerciseId}
              type="button"
              onClick={() => setActiefIndex(actiefIndex + 1 + i)}
              className="flex min-h-[52px] items-center justify-between gap-3 rounded-[12px] border border-line px-3.5 py-2.5 text-left"
            >
              <span className="t-body-sm truncate text-ink-2">{entry.exerciseNaam}</span>
              <span className="t-caption shrink-0 text-ink-muted">
                {entry.sets.length} × {oefening?.repMin ?? '?'}
                {oefening !== undefined && oefening.repMax !== oefening.repMin
                  ? `-${oefening.repMax}`
                  : ''}
              </span>
            </button>
          )
        })}

        <div className="flex flex-col gap-2 pt-1">
          <Knop soort="stil" vol onClick={() => setToevoegenOpen(true)}>
            Oefening toevoegen
          </Knop>
          <Knop soort="secundair" vol onClick={() => setAfrondenOpen(true)}>
            Training afronden
          </Knop>
        </div>
      </div>

      {/* Sessienotitie */}
      <Sheet
        open={notitieOpen}
        titel="Notitie bij deze training"
        onSluit={() => setNotitieOpen(false)}
        voet={
          <Knop
            soort="primair"
            vol
            onClick={() => {
              void wijzigSessieNotitie(sessie.id, notitieTekst)
              setNotitieOpen(false)
            }}
          >
            Bewaren
          </Knop>
        }
      >
        <div className="flex flex-col gap-3">
          <p className="t-caption text-ink-muted">
            Hoe voelde het? Noteer hier ook klachten, bijvoorbeeld aan je schouder. Je kunt later op
            woorden zoeken in je notities.
          </p>
          <TekstGebied
            waarde={notitieTekst}
            onWijzig={setNotitieTekst}
            regels={6}
            placeholder="Bijvoorbeeld: rechterschouder klikte bij set 3 van bankdrukken"
          />
        </div>
      </Sheet>

      {/* Oefening vervangen */}
      <OefeningKiezer
        open={wisselVoor !== null}
        titel="Vervangen door"
        uitleg="Alleen voor deze training. Je vaste schema blijft ongewijzigd."
        uitsluiten={entries.map((e) => e.exerciseId)}
        onSluit={() => setWisselVoor(null)}
        onKies={(id) => {
          if (wisselVoor !== null) void vervangOefening(sessie.id, wisselVoor, id)
          setWisselVoor(null)
        }}
      />

      {/* Oefening toevoegen */}
      <OefeningKiezer
        open={toevoegenOpen}
        titel="Oefening toevoegen"
        uitleg="Voegt de oefening onderaan deze training toe."
        uitsluiten={entries.map((e) => e.exerciseId)}
        onSluit={() => setToevoegenOpen(false)}
        onKies={(id) => {
          void voegOefeningToeAanSessie(sessie.id, id)
          setToevoegenOpen(false)
        }}
      />

      <Bevestig
        open={afrondenOpen}
        titel="Training afronden?"
        bevestigLabel="Afronden"
        tekst={
          <>
            Je logt {meervoud(gedaanSets, 'voltooide set', 'voltooide sets')}. Sets die je niet hebt
            afgevinkt worden niet bewaard.
          </>
        }
        onAnnuleer={() => setAfrondenOpen(false)}
        onBevestig={() => {
          setAfrondenOpen(false)
          void rondAf()
        }}
      />
    </Schil>
  )
}

// ── Kaart van de actieve oefening ────────────────────────────────────────

function OefeningKaart({
  sessie,
  entry,
  oefening,
  onBevestigSet,
  onWissel,
}: {
  sessie: Session
  entry: SessionEntry
  oefening: Exercise
  onBevestigSet: (setIndex: number) => void
  onWissel: () => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [notitie, setNotitie] = useState(entry.notitie)

  const vorigeSets = useLiveQuery(() => haalVorigeSets(oefening.id), [oefening.id])
  const advies = useMemo(() => {
    const vorige = vorigeUitvoeringUitSets(oefening, vorigeSets ?? [])
    return berekenAdvies(oefening, vorige, entry.sets.length)
  }, [oefening, vorigeSets, entry.sets.length])

  const gedaan = entry.sets.filter((s) => s.voltooid).length

  return (
    <Kaart className="flex flex-col gap-3.5 border-line-4 p-3.5">
      <div className="flex flex-col gap-1">
        <div className="flex items-start justify-between gap-2.5">
          <h2 className="t-title min-w-0 text-ink">{oefening.naam}</h2>
          <div className="flex shrink-0 items-center gap-1">
            <span className="t-eyebrow text-accent">
              {gedaan} / {entry.sets.length}
            </span>
            <IcoonKnop label="Meer opties" onClick={() => setMenuOpen(true)} className="h-10 w-10">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                <path d="M9 4.2h.01M9 9h.01M9 13.8h.01" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
              </svg>
            </IcoonKnop>
          </div>
        </div>
        <p className="t-caption text-ink-muted">
          Doel {entry.sets.length} × {oefening.repMin}
          {oefening.repMax !== oefening.repMin ? `-${oefening.repMax}` : ''}
          {oefening.isUnilateraal ? ' per kant' : ''}
          {oefening.isTijdgebonden ? ' seconden' : ''}
          {' · rust '}
          {klok(oefening.rustSeconden)}
        </p>
      </div>

      {oefening.aandachtspunt.trim() !== '' && (
        <p className="t-caption text-ink-2">{oefening.aandachtspunt}</p>
      )}

      <Melding toon={advies.soort === 'eerste-keer' ? 'accent' : 'let-op'} titel="Suggestie">
        {advies.tekst}
      </Melding>

      <div className="flex items-center gap-2">
        <YoutubeKnop url={oefening.youtubeUrl} exerciseId={oefening.id} naam={oefening.naam} />
      </div>

      {/* Sets */}
      <div className="flex flex-col gap-2.5">
        <div className="grid grid-cols-[28px_1fr_1fr_52px] items-center gap-2 px-0.5">
          <span className="t-eyebrow uppercase text-ink-muted">Set</span>
          <span className="t-eyebrow uppercase text-ink-muted">
            {oefening.isLichaamsgewicht ? '± kg' : 'kg'}
          </span>
          <span className="t-eyebrow uppercase text-ink-muted">
            {oefening.isTijdgebonden ? 'sec' : 'reps'}
          </span>
          <span />
        </div>

        {entry.sets.map((set, i) => (
          <SetRij
            key={i}
            index={i}
            set={set}
            oefening={oefening}
            adviesWaarde={advies.perSet[i]}
            onWijzig={(patch) => void wijzigSet(sessie.id, entry.exerciseId, i, patch)}
            onBevestig={() => onBevestigSet(i)}
          />
        ))}
      </div>

      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => void voegSetToe(sessie.id, entry.exerciseId)}
          className="t-caption min-h-[44px] font-medium text-accent hover:text-accent-soft"
        >
          + Set toevoegen
        </button>
        {entry.sets.length > 1 && (
          <button
            type="button"
            onClick={() =>
              void verwijderSet(sessie.id, entry.exerciseId, entry.sets.length - 1)
            }
            className="t-caption min-h-[44px] font-medium text-ink-faint hover:text-fout"
          >
            &minus; Laatste set weg
          </button>
        )}
      </div>

      {/* Vrij tekstveld: bij het buikspierkwartier "zwaarder gemaakt door". */}
      <div className="flex flex-col gap-1.5 border-t border-line-2 pt-3">
        <Wenkbrauw>Notitie bij deze oefening</Wenkbrauw>
        <TekstGebied
          waarde={notitie}
          regels={2}
          placeholder={
            oefening.isTijdgebonden
              ? 'Zwaarder gemaakt door… (hefboom, tempo, pauze)'
              : 'Hoe voelde het?'
          }
          onWijzig={(v) => {
            setNotitie(v)
            void wijzigEntry(sessie.id, entry.exerciseId, { notitie: v })
          }}
        />
      </div>

      <Sheet open={menuOpen} titel={oefening.naam} onSluit={() => setMenuOpen(false)}>
        <div className="flex flex-col gap-2">
          <Knop
            soort="stil"
            vol
            onClick={() => {
              setMenuOpen(false)
              onWissel()
            }}
          >
            Vervangen door andere oefening
          </Knop>
          <Knop
            soort="stil"
            vol
            onClick={() => {
              void wijzigEntry(sessie.id, entry.exerciseId, {
                overgeslagen: !entry.overgeslagen,
              })
              setMenuOpen(false)
            }}
          >
            {entry.overgeslagen ? 'Toch doen' : 'Deze oefening overslaan'}
          </Knop>
        </div>
      </Sheet>
    </Kaart>
  )
}

function SetRij({
  index,
  set,
  oefening,
  adviesWaarde,
  onWijzig,
  onBevestig,
}: {
  index: number
  set: SetLog
  oefening: Exercise
  adviesWaarde: number | undefined
  onWijzig: (patch: Partial<SetLog>) => void
  onBevestig: () => void
}) {
  const tijdModus = oefening.isTijdgebonden
  const tweedeWaarde = tijdModus ? (set.seconden ?? 0) : set.reps

  return (
    <div className="flex flex-col gap-1">
      <div className="grid grid-cols-[28px_1fr_1fr_52px] items-center gap-2">
        <span className="cijfers t-body-sm flex h-[52px] items-center text-ink-muted">
          {index + 1}
        </span>

        <GetalStapper
          waarde={set.gewichtKg}
          stap={oefening.gewichtsstapKg}
          min={oefening.isLichaamsgewicht ? -200 : 0}
          onWijzig={(v) => onWijzig({ gewichtKg: v })}
          ariaLabel={`Gewicht set ${index + 1}`}
        />

        <GetalStapper
          waarde={tweedeWaarde}
          stap={tijdModus ? 5 : 1}
          min={0}
          decimalen={0}
          onWijzig={(v) => onWijzig(tijdModus ? { seconden: v } : { reps: v })}
          ariaLabel={`${tijdModus ? 'Seconden' : 'Herhalingen'} set ${index + 1}`}
        />

        <button
          type="button"
          aria-label={set.voltooid ? `Set ${index + 1} ongedaan maken` : `Set ${index + 1} afvinken`}
          aria-pressed={set.voltooid}
          onClick={onBevestig}
          className={`flex h-[52px] w-[52px] items-center justify-center rounded-[8px] border-2 ${
            set.voltooid
              ? 'border-accent bg-accent text-white'
              : 'border-line-5 bg-surface-2 text-ink-faint'
          }`}
        >
          <Vink className="h-5 w-5" />
        </button>
      </div>

      <div className="col-span-3 flex flex-wrap items-center gap-2 pl-[36px]">
        {adviesWaarde !== undefined && !set.voltooid && (
          <span className="t-caption text-ink-muted">
            suggestie {getal(adviesWaarde, 0)}
            {tijdModus ? ' s' : ''}
          </span>
        )}
        {set.voltooid && (
          <span className="t-caption text-ink-muted">
            {kg(set.gewichtKg, { toonPlus: oefening.isLichaamsgewicht })} ×{' '}
            {tijdModus ? `${tweedeWaarde} s` : tweedeWaarde}
          </span>
        )}
        <button
          type="button"
          onClick={() => onWijzig({ isOpwarm: !set.isOpwarm })}
          className={`t-caption min-h-[32px] rounded-full border px-2 ${
            set.isOpwarm
              ? 'border-line-5 bg-surface-2 text-ink-2'
              : 'border-transparent text-ink-faint hover:text-ink-muted'
          }`}
        >
          {set.isOpwarm ? 'opwarmset' : 'werkset'}
        </button>
        {set.isPR && (
          <Badge toon="goed" icoon={<Staafjes />}>
            PR
          </Badge>
        )}
      </div>
    </div>
  )
}

// ── Oefening kiezen ──────────────────────────────────────────────────────

export function OefeningKiezer({
  open,
  titel,
  uitleg,
  uitsluiten,
  onSluit,
  onKies,
}: {
  open: boolean
  titel: string
  uitleg?: string
  uitsluiten?: string[]
  onSluit: () => void
  onKies: (exerciseId: string) => void
}) {
  const [zoek, setZoek] = useState('')
  const oefeningen = useLiveQuery(
    async () =>
      (await db.exercises.toArray())
        .filter((o) => !o.gearchiveerd)
        .sort((a, b) => a.naam.localeCompare(b.naam, 'nl')),
    [],
  )

  const zichtbaar = (oefeningen ?? []).filter(
    (o) =>
      !(uitsluiten ?? []).includes(o.id) &&
      o.naam.toLowerCase().includes(zoek.trim().toLowerCase()),
  )

  return (
    <Sheet open={open} titel={titel} onSluit={onSluit}>
      <div className="flex flex-col gap-3">
        {uitleg !== undefined && <p className="t-caption text-ink-muted">{uitleg}</p>}
        <input
          type="search"
          value={zoek}
          onChange={(e) => setZoek(e.target.value)}
          placeholder="Zoeken op naam"
          className="t-body-sm min-h-[48px] w-full rounded-[4px] border border-line-4 bg-surface-2 px-3 text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none"
        />
        <div className="flex flex-col gap-1.5">
          {zichtbaar.length === 0 && (
            <p className="t-caption py-4 text-center text-ink-muted">Geen oefening gevonden.</p>
          )}
          {zichtbaar.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => onKies(o.id)}
              className="flex min-h-[52px] items-center justify-between gap-3 rounded-[8px] border border-line-3 bg-surface px-3.5 text-left"
            >
              <span className="t-body-sm truncate text-ink">{o.naam}</span>
              <span className="t-caption shrink-0 text-ink-muted">
                {o.standaardSets} × {o.repMin}
                {o.repMax !== o.repMin ? `-${o.repMax}` : ''}
              </span>
            </button>
          ))}
        </div>
      </div>
    </Sheet>
  )
}
