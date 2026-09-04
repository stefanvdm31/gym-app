import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Staafjes, Vink } from '../components/ui/basis'

/** Korte, niet-blokkerende bevestigingen onderin het scherm. */

export type ToastToon = 'neutraal' | 'goed' | 'pr' | 'fout'

interface Toast {
  id: number
  tekst: string
  toon: ToastToon
}

interface ToastApi {
  toon: (tekst: string, toon?: ToastToon) => void
}

const Context = createContext<ToastApi | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const teller = useRef(0)

  const toon = useCallback((tekst: string, soort: ToastToon = 'neutraal') => {
    teller.current += 1
    const id = teller.current
    setToasts((huidig) => [...huidig.slice(-2), { id, tekst, toon: soort }])
    window.setTimeout(() => {
      setToasts((huidig) => huidig.filter((t) => t.id !== id))
    }, 3600)
  }, [])

  const api = useMemo<ToastApi>(() => ({ toon }), [toon])

  return (
    <Context.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 px-4 pb-[calc(env(safe-area-inset-bottom)+96px)]"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`flex max-w-[420px] items-center gap-2.5 rounded-[12px] border px-3.5 py-2.5 shadow-[0_4px_18px_rgba(0,0,0,0.45)] ${
              t.toon === 'pr'
                ? 'border-goed/40 bg-goed/15 text-goed'
                : t.toon === 'goed'
                  ? 'border-line-4 bg-surface-2 text-ink'
                  : t.toon === 'fout'
                    ? 'border-fout/40 bg-fout/12 text-fout'
                    : 'border-line-4 bg-surface-2 text-ink'
            }`}
          >
            {t.toon === 'pr' && <Staafjes />}
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
