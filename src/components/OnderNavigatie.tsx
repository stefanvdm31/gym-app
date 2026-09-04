import { NavLink } from 'react-router-dom'
import type { ReactNode } from 'react'

/** Vaste navigatie onderin, binnen duimbereik. */

interface Tab {
  pad: string
  label: string
  icoon: ReactNode
}

const TABS: Tab[] = [
  {
    pad: '/',
    label: 'Vandaag',
    icoon: (
      <svg width="22" height="22" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <rect x="3" y="4.5" width="14" height="12" rx="2.5" stroke="currentColor" strokeWidth="1.6" />
        <path d="M3 8.5h14M7 3v3M13 3v3" stroke="currentColor" strokeWidth="1.6" />
      </svg>
    ),
  },
  {
    pad: '/progressie',
    label: 'Progressie',
    icoon: (
      <svg width="22" height="22" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path d="M3 14l4-4 3.5 3L17 5" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        <path d="M17 5h-4M17 5v4" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    pad: '/lichaam',
    label: 'Lichaam',
    icoon: (
      <svg width="22" height="22" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.6" />
        <path d="M10 10V5.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    pad: '/historie',
    label: 'Historie',
    icoon: (
      <svg width="22" height="22" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path d="M3.5 6.5h13M3.5 10h13M3.5 13.5h9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    pad: '/meer',
    label: 'Meer',
    icoon: (
      <svg width="22" height="22" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path d="M5 10h.01M10 10h.01M15 10h.01" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      </svg>
    ),
  },
]

export function OnderNavigatie() {
  return (
    <nav className="veilig-onder shrink-0 border-t border-line bg-shell px-1.5 pt-2">
      <div className="mx-auto flex max-w-[560px]">
        {TABS.map((tab) => (
          <NavLink
            key={tab.pad}
            to={tab.pad}
            end={tab.pad === '/'}
            className={({ isActive }) =>
              `flex min-h-[52px] flex-1 flex-col items-center justify-center gap-1 rounded-[8px] ${
                isActive ? 'text-accent' : 'text-ink-faint'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {tab.icoon}
                <span className={`text-[11px] ${isActive ? 'font-semibold' : 'font-medium'}`}>
                  {tab.label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
