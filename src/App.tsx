import { lazy, Suspense, useEffect, useState } from 'react'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'

import { seedIndienLeeg } from './db/seed'
import { haalInstellingen } from './db/repo'
import { Foutgrens } from './components/Foutgrens'
import { Laden } from './components/Schil'
import { ToastProvider } from './state/ToastContext'
import { RustTimerProvider } from './state/RustTimer'
import { VernieuwMelding } from './components/VernieuwMelding'
import { useThema } from './state/useThema'

// De schermen met grafieken laden we pas als je ze opent: dat scheelt
// laadtijd op het trainingsscherm, waar het er echt toe doet.
const Lichaam = lazy(() => import('./screens/Lichaam').then((m) => ({ default: m.Lichaam })))
const OefeningProgressie = lazy(() =>
  import('./screens/OefeningProgressie').then((m) => ({ default: m.OefeningProgressie })),
)

import { Vandaag } from './screens/Vandaag'
import { ActieveTraining } from './screens/ActieveTraining'
import { Progressie } from './screens/Progressie'
import { Records } from './screens/Records'
import { Historie } from './screens/Historie'
import { SessieDetail } from './screens/SessieDetail'
import { Notities } from './screens/Notities'
import { Meer } from './screens/Meer'
import { Oefeningen } from './screens/Oefeningen'
import { OefeningBewerken } from './screens/OefeningBewerken'
import { Schemas } from './screens/Schemas'
import { SchemaBewerken } from './screens/SchemaBewerken'
import { Spiergroepen } from './screens/Spiergroepen'
import { Instellingen } from './screens/Instellingen'
import { Backup } from './screens/Backup'
import { Schijvencalculator } from './screens/Schijvencalculator'

export default function App() {
  const [klaar, setKlaar] = useState(false)
  const [startFout, setStartFout] = useState<string | null>(null)

  useEffect(() => {
    seedIndienLeeg()
      .then(() => setKlaar(true))
      .catch((fout: unknown) => {
        setStartFout(fout instanceof Error ? fout.message : 'Onbekende fout')
      })
  }, [])

  const instellingen = useLiveQuery(() => haalInstellingen(), [])
  useThema(instellingen?.thema)

  if (startFout !== null) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="t-h2 text-ink">De database gaat niet open</div>
        <p className="t-body-sm max-w-[40ch] text-ink-muted">
          Je browser laat opslag misschien niet toe. Sta je in een privévenster, probeer het dan in
          een gewoon venster.
        </p>
        <pre className="t-caption max-w-full overflow-x-auto rounded-[8px] border border-line-3 bg-surface px-3 py-2 text-ink-muted">
          {startFout}
        </pre>
      </div>
    )
  }

  if (!klaar || instellingen === undefined) return <Laden tekst="Even je gegevens ophalen…" />

  return (
    <Foutgrens>
      <ToastProvider>
        <RustTimerProvider
          geluidAan={instellingen.geluidAan}
          trillenAan={instellingen.trillenAan}
        >
          <HashRouter>
            <VernieuwMelding />
            <Suspense fallback={<Laden />}>
            <Routes>
              <Route path="/" element={<Vandaag />} />
              <Route path="/training/:sessieId" element={<ActieveTraining />} />
              <Route path="/progressie" element={<Progressie />} />
              <Route path="/progressie/:exerciseId" element={<OefeningProgressie />} />
              <Route path="/records" element={<Records />} />
              <Route path="/lichaam" element={<Lichaam />} />
              <Route path="/historie" element={<Historie />} />
              <Route path="/historie/:sessieId" element={<SessieDetail />} />
              <Route path="/notities" element={<Notities />} />
              <Route path="/meer" element={<Meer />} />
              <Route path="/meer/oefeningen" element={<Oefeningen />} />
              <Route path="/meer/oefeningen/:exerciseId" element={<OefeningBewerken />} />
              <Route path="/meer/schemas" element={<Schemas />} />
              <Route path="/meer/schemas/:templateId" element={<SchemaBewerken />} />
              <Route path="/meer/spiergroepen" element={<Spiergroepen />} />
              <Route path="/meer/instellingen" element={<Instellingen />} />
              <Route path="/meer/backup" element={<Backup />} />
              <Route path="/meer/schijven" element={<Schijvencalculator />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            </Suspense>
          </HashRouter>
        </RustTimerProvider>
      </ToastProvider>
    </Foutgrens>
  )
}
