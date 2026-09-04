import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'

import { db } from '../db/db'
import { rondSessieAf, wijzigEntry, wijzigSessieNotitie, wijzigSet } from '../db/repo'
import type { Session } from '../db/types'
import { klok } from '../lib/date'
import { meervoud } from '../lib/format'
import { piep, tril } from '../lib/signalen'
import { useRustTimer } from '../state/RustTimer'
import { useToast } from '../state/ToastContext'
import { Laden, Schil } from '../components/Schil'
import { Kaart, Vink, Wenkbrauw } from '../components/ui/basis'
import { IcoonKnop, Knop } from '../components/ui/Knop'
import { Bevestig, Sheet } from '../components/ui/Sheet'
import { GetalStapper, TekstGebied } from '../components/ui/Invoer'
import { YoutubeKnop } from '../components/YoutubeKnop'

/**
 * Trainingsdag in rondes (circuit), zoals het buikspierkwartier.
 *
 * Je loopt de oefeningen één voor één af en begint daarna aan de volgende
 * ronde. Tijdgebonden oefeningen krijgen een aftelklok, oefeningen op
 * herhalingen gewoon een teller.
 */
export function CircuitTraining({ sessie, rondes }: { sessie: Session; rondes: number }) {
  const navigeer = useNavigate()
  const rust = useRustTimer()
  const toast = useToast()

  const [positie, setPositie] = useState(0)
  /*
   * De klok werkt met een eindtijdstip in plaats van met aftellen. Zet Android
   * de app even op een lager pitje, dan klopt de tijd bij terugkomen nog
   * steeds. `pauzeSec` bewaart wat er nog stond toen je pauzeerde.
   */
  const [eindMs, setEindMs] = useState<number | null>(null)
  const [pauzeSec, setPauzeSec] = useState<number | null>(null)
  const [nu, setNu] = useState(() => Date.now())
  const [notitieOpen, setNotitieOpen] = useState(false)
  const [notitieTekst, setNotitieTekst] = useState(sessie.sessieNotitie)
  const [afrondenOpen, setAfrondenOpen] = useState(false)
  const afgegaan = useRef(false)

  const entries = useMemo(
    () => [...sessie.entries].sort((a, b) => a.volgorde - b.volgorde),
    [sessie.entries],
  )

  const oefeningen = useLiveQuery(async () => {
    const alle = await db.exercises.toArray()
    return new Map(alle.map((o) => [o.id, o]))
  }, [])

  // Alle stappen: ronde 1 oefening 1..n, ronde 2 oefening 1..n, enzovoort.
  const stappen = useMemo(
    () =>
      Array.from({ length: rondes }, (_, r) =>
        entries.map((entry, e) => ({ ronde: r, entryIndex: e, entry })),
      ).flat(),
    [entries, rondes],
  )

  const stap = stappen[positie]
  const oefening = stap === undefined ? undefined : oefeningen?.get(stap.entry.exerciseId)
  const huidigeSet = stap?.entry.sets[stap.ronde]

  const doelSeconden = huidigeSet?.seconden ?? oefening?.repMin ?? 30
  const klokLoopt = eindMs !== null
  const resterend =
    eindMs !== null
      ? Math.max(0, Math.ceil((eindMs - nu) / 1000))
      : (pauzeSec ?? doelSeconden)
  const isGestart = eindMs !== null || pauzeSec !== null

  // Bij een volgende oefening begint de klok weer schoon.
  useEffect(() => {
    setEindMs(null)
    setPauzeSec(null)
    afgegaan.current = false
  }, [positie])

  useEffect(() => {
    if (eindMs === null) return
    const interval = window.setInterval(() => setNu(Date.now()), 250)
    return () => window.clearInterval(interval)
  }, [eindMs])

  useEffect(() => {
    if (eindMs === null || resterend > 0 || afgegaan.current) return
    afgegaan.current = true
    setEindMs(null)
    setPauzeSec(0)
    piep()
    tril()
  }, [eindMs, resterend])

  if (oefeningen === undefined) {
    return (
      <Schil>
        <Laden />
      </Schil>
    )
  }

  const gedaan = entries.reduce((som, e) => som + e.sets.filter((s) => s.voltooid).length, 0)
  const totaal = stappen.length

  const naarVolgende = (): void => {
    if (positie + 1 < stappen.length) setPositie(positie + 1)
  }

  const rondStapAf = async (): Promise<void> => {
    if (stap === undefined || oefening === undefined) return

    // Stop je eerder, dan loggen we wat je daadwerkelijk volhield.
    const behaald =
      oefening.isTijdgebonden && isGestart ? Math.max(0, doelSeconden - resterend) : doelSeconden

    await wijzigSet(sessie.id, stap.entry.exerciseId, stap.ronde, {
      voltooid: true,
      voltooidOp: new Date().toISOString(),
      ...(oefening.isTijdgebonden ? { seconden: behaald } : {}),
    })

    if (positie + 1 < stappen.length) {
      const volgende = stappen[positie + 1]
      const volgendeNaam = volgende?.entry.exerciseNaam ?? ''
      rust.start(
        oefening.rustSeconden,
        `Ronde ${(volgende?.ronde ?? 0) + 1}`,
        `Straks: ${volgendeNaam}`,
      )
      setPositie(positie + 1)
    } else {
      toast.toon('Laatste oefening gedaan. Rond je training af.', 'goed')
    }
  }

  const rondAf = async (): Promise<void> => {
    await rondSessieAf(sessie.id)
    rust.stop()
    toast.toon('Training opgeslagen', 'goed')
    navigeer(`/historie/${sessie.id}`, { replace: true })
  }

  const onderbalk =
    stap === undefined || oefening === undefined ? (
      <div className="pb-2">
        <Knop soort="primair" maat="groot" vol onClick={() => setAfrondenOpen(true)}>
          Training afronden
        </Knop>
      </div>
    ) : (
      <div className="flex items-center gap-2.5 pb-2">
        {oefening.isTijdgebonden && resterend > 0 ? (
          <Knop
            soort="primair"
            maat="groot"
            vol
            onClick={() => {
              if (klokLoopt) {
                setPauzeSec(resterend)
                setEindMs(null)
              } else {
                afgegaan.current = false
                setPauzeSec(null)
                setNu(Date.now())
                setEindMs(Date.now() + resterend * 1000)
              }
            }}
          >
            {klokLoopt ? 'Pauzeer' : isGestart ? 'Hervat' : 'Start klok'}
          </Knop>
        ) : (
          <Knop soort="primair" maat="groot" vol icoon={<Vink />} onClick={() => void rondStapAf()}>
            Klaar
          </Knop>
        )}
        {oefening.isTijdgebonden && (
          <Knop soort="secundair" maat="groot" onClick={() => void rondStapAf()}>
            Klaar
          </Knop>
        )}
        <IcoonKnop
          label="Sessienotitie"
          onClick={() => setNotitieOpen(true)}
          className="h-14 w-14 shrink-0 border border-line-4 bg-surface"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <path d="M3.5 3.5h11v11h-11z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
            <path d="M6 7h6M6 10h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </IcoonKnop>
      </div>
    )

  return (
    <Schil toonNavigatie={false} onderbalk={onderbalk}>
      <div className="flex flex-col gap-4 pt-1">
        <div className="flex items-center justify-between gap-3">
          <IcoonKnop label="Training verlaten" onClick={() => navigeer('/')} className="-ml-3">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
            </svg>
          </IcoonKnop>
          <div className="t-body-sm flex-1 truncate text-center font-semibold text-ink">
            {sessie.templateLabel}
          </div>
          <div className="t-caption min-w-[44px] text-right text-ink-muted">
            {gedaan} / {totaal}
          </div>
        </div>

        {stap === undefined || oefening === undefined ? (
          <Kaart className="p-5">
            <p className="t-body-sm text-ink-2">
              Dit circuit heeft nog geen oefeningen. Voeg ze toe onder Meer › Schema's.
            </p>
          </Kaart>
        ) : (
          <>
            <div className="flex flex-col items-center gap-1.5 pt-2">
              <Wenkbrauw>
                Ronde {stap.ronde + 1} van {rondes} · oefening {stap.entryIndex + 1} van{' '}
                {entries.length}
              </Wenkbrauw>
              {oefening.isTijdgebonden ? (
                <div
                  className={`cijfers t-display ${resterend === 0 ? 'text-goed' : 'text-ink'}`}
                  aria-live="off"
                >
                  {klok(resterend)}
                </div>
              ) : (
                <div className="cijfers t-display text-ink">{huidigeSet?.reps ?? oefening.repMin}</div>
              )}
              <div className="t-title text-center text-ink">{oefening.naam}</div>
              {oefening.aandachtspunt.trim() !== '' && (
                <p className="t-body-sm text-center text-ink-muted">{oefening.aandachtspunt}</p>
              )}
              <div className="t-caption text-ink-muted">
                Doel {oefening.repMin}
                {oefening.repMax !== oefening.repMin ? `-${oefening.repMax}` : ''}
                {oefening.isTijdgebonden ? ' seconden' : ' herhalingen'}
                {oefening.isUnilateraal ? ' per kant' : ''}
              </div>
            </div>

            {/* Voortgang binnen deze ronde */}
            <div className="flex gap-1.5">
              {entries.map((entry, i) => {
                const gereed = entry.sets[stap.ronde]?.voltooid === true
                const isHuidig = i === stap.entryIndex
                return (
                  <div
                    key={entry.exerciseId}
                    className={`h-1 flex-1 rounded-full ${
                      gereed ? 'bg-goed' : isHuidig ? 'bg-accent' : 'bg-surface-2'
                    }`}
                  />
                )
              })}
            </div>

            {/* Invoer */}
            <Kaart className="flex flex-col gap-3 border-line-4 p-3.5">
              <div className="grid grid-cols-2 gap-2.5">
                <label className="flex flex-col gap-1.5">
                  <span className="t-eyebrow uppercase text-ink-muted">
                    {oefening.isLichaamsgewicht ? 'Extra kg' : 'Gewicht'}
                  </span>
                  <GetalStapper
                    waarde={huidigeSet?.gewichtKg ?? 0}
                    stap={oefening.gewichtsstapKg}
                    min={oefening.isLichaamsgewicht ? -200 : 0}
                    onWijzig={(v) =>
                      void wijzigSet(sessie.id, stap.entry.exerciseId, stap.ronde, {
                        gewichtKg: v,
                      })
                    }
                    ariaLabel="Gewicht"
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="t-eyebrow uppercase text-ink-muted">
                    {oefening.isTijdgebonden ? 'Doel sec' : 'Herhalingen'}
                  </span>
                  <GetalStapper
                    waarde={
                      oefening.isTijdgebonden
                        ? (huidigeSet?.seconden ?? oefening.repMin)
                        : (huidigeSet?.reps ?? oefening.repMin)
                    }
                    stap={oefening.isTijdgebonden ? 5 : 1}
                    min={0}
                    decimalen={0}
                    onWijzig={(v) => {
                      void wijzigSet(
                        sessie.id,
                        stap.entry.exerciseId,
                        stap.ronde,
                        oefening.isTijdgebonden ? { seconden: v } : { reps: v },
                      )
                      if (oefening.isTijdgebonden) {
                        setEindMs(null)
                        setPauzeSec(null)
                        afgegaan.current = false
                      }
                    }}
                    ariaLabel={oefening.isTijdgebonden ? 'Seconden' : 'Herhalingen'}
                  />
                </label>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <YoutubeKnop
                  url={oefening.youtubeUrl}
                  exerciseId={oefening.id}
                  naam={oefening.naam}
                />
                <Knop
                  soort="stil"
                  maat="klein"
                  onClick={naarVolgende}
                  disabled={positie + 1 >= stappen.length}
                >
                  Overslaan
                </Knop>
              </div>

              <div className="flex flex-col gap-1.5 border-t border-line-2 pt-3">
                <Wenkbrauw>Zwaarder gemaakt door</Wenkbrauw>
                <TekstGebied
                  waarde={stap.entry.notitie}
                  regels={2}
                  placeholder="Hefboom, tempo, langere pauze onderin…"
                  onWijzig={(v) => void wijzigEntry(sessie.id, stap.entry.exerciseId, { notitie: v })}
                />
              </div>
            </Kaart>

            {/* Circuitoverzicht */}
            <div className="flex flex-col gap-2">
              <Wenkbrauw>Circuit · ronde {stap.ronde + 1}</Wenkbrauw>
              <Kaart className="divide-y divide-line-2 overflow-hidden">
                {entries.map((entry, i) => {
                  const set = entry.sets[stap.ronde]
                  const gereed = set?.voltooid === true
                  const isHuidig = i === stap.entryIndex
                  const o = oefeningen.get(entry.exerciseId)
                  return (
                    <button
                      key={entry.exerciseId}
                      type="button"
                      onClick={() => setPositie(stap.ronde * entries.length + i)}
                      className={`flex min-h-[52px] w-full items-center justify-between gap-3 px-3.5 py-2.5 text-left ${
                        isHuidig ? 'bg-accent/8' : gereed ? 'opacity-55' : ''
                      }`}
                    >
                      <span className="flex min-w-0 items-center gap-2.5">
                        {gereed ? (
                          <Vink className="h-3.5 w-3.5 shrink-0 text-goed" />
                        ) : (
                          <span
                            className={`h-3.5 w-3.5 shrink-0 rounded-full border ${
                              isHuidig ? 'border-2 border-accent' : 'border-line-5'
                            }`}
                          />
                        )}
                        <span className="t-body-sm truncate text-ink-2">{entry.exerciseNaam}</span>
                      </span>
                      <span className={`t-caption shrink-0 ${isHuidig ? 'text-accent' : 'text-ink-muted'}`}>
                        {o?.isTijdgebonden === true
                          ? `${set?.seconden ?? o.repMin} s`
                          : `${set?.reps ?? o?.repMin ?? 0} reps`}
                      </span>
                    </button>
                  )
                })}
              </Kaart>
            </div>

            <Knop soort="secundair" vol onClick={() => setAfrondenOpen(true)}>
              Training afronden
            </Knop>
          </>
        )}
      </div>

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
        <TekstGebied waarde={notitieTekst} onWijzig={setNotitieTekst} regels={6} />
      </Sheet>

      <Bevestig
        open={afrondenOpen}
        titel="Training afronden?"
        bevestigLabel="Afronden"
        tekst={`Je logt ${meervoud(gedaan, 'voltooide oefening', 'voltooide oefeningen')}.`}
        onAnnuleer={() => setAfrondenOpen(false)}
        onBevestig={() => {
          setAfrondenOpen(false)
          void rondAf()
        }}
      />
    </Schil>
  )
}
