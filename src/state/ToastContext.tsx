import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Vink } from '../components/ui/basis'
import { RecordPil } from '../components/RecordPil'

/**
 * Alle korte, niet-blokkerende meldingen van de app.
 *
 * Er zijn twee soorten, en ze staan bewust op verschillende plekken:
 *
 *  - Gewone bevestigingen ("Training opgeslagen") onderin.
 *  - Een persoonlijk record bovenin, als pil. Die zat eerst onderin en viel
 *    dan over de knoppen van de rusttimer heen — precies de knoppen die je
 *    op dat moment nodig hebt.
 */

export type ToastToon = 'neutraal' | 'goed' | 'fout'

interface Toast {
  id: number
  tekst: string
  toon: ToastToon
}

interface ToastApi {
  toon: (tekst: string, toon?: ToastToon) => void
  /** Viert een persoonlijk record met de pil bovenin. `waarde` is bijvoorbeeld "60 kg × 8". */
  vierRecord: (waarde: string) => void
}

const Context = createContext<ToastApi | null>(null)

const PIL_ZICHTBAAR_MS = 3400
const PIL_UITLOOP_MS = 240

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const [record, setRecord] = useState<{ id: number; waarde: string; sluit: boolean } | null>(null)
  const teller = useRef(0)
  const pilTimers = useRef<number[]>([])

  useEffect(
    () => () => {
      for (const timer of pilTimers.current) window.clearTimeout(timer)
    },
    [],
  )

  const toon = useCallback((tekst: string, soort: ToastToon = 'neutraal') => {
    teller.current += 1
    const id = teller.current
    setToasts((huidig) => [...huidig.slice(-2), { id, tekst, toon: soort }])
    window.setTimeout(() => {
      setToasts((huidig) => huidig.filter((t) => t.id !== id))
    }, 3600)
  }, [])

  const vierRecord = useCallback((waarde: string) => {
    // Breek een lopende pil af: twee records vlak na elkaar mogen elkaar niet
    // in de weg zitten, de nieuwste telt.
    for (const timer of pilTimers.current) window.clearTimeout(timer)
    pilTimers.current = []

    teller.current += 1
    const id = teller.current
    setRecord({ id, waarde, sluit: false })

    pilTimers.current.push(
      window.setTimeout(() => {
        setRecord((huidig) => (huidig?.id === id ? { ...huidig, sluit: true } : huidig))
      }, PIL_ZICHTBAAR_MS),
      window.setTimeout(() => {
        setRecord((huidig) => (huidig?.id === id ? null : huidig))
      }, PIL_ZICHTBAAR_MS + PIL_UITLOOP_MS),
    )
  }, [])

  const api = useMemo<ToastApi>(() => ({ toon, vierRecord }), [toon, vierRecord])

  return (
    <Context.Provider value={api}>
      {children}

      {record !== null && (
        <RecordPil key={record.id} waarde={record.waarde} sluit={record.sluit} />
      )}

      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 px-4 pb-[calc(env(safe-area-inset-bottom)+96px)]"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`flex max-w-[420px] items-center gap-2.5 rounded-[12px] border px-3.5 py-2.5 shadow-[0_4px_18px_rgba(0,0,0,0.45)] ${
              t.toon === 'fout'
                ? 'border-fout/40 bg-fout/12 text-fout'
                : 'border-line-4 bg-surface-2 text-ink'
            }`}
          >
            {t.toon === 'goed' && <Vink className="text-goed" />}
            <span className="t-caption">{t.tekst}</span>
          </div>
        ))}
      </div>
    </Context.Provider>
  )
}

export function useToast(): ToastApi {
  const api = useContext(Context)
  if (api === null) throw new Error('useToast buiten ToastProvider gebruikt')
  return api
}
