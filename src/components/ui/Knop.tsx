import type { ButtonHTMLAttributes, ReactNode } from 'react'

export type KnopSoort = 'primair' | 'secundair' | 'stil' | 'gevaar' | 'link'
export type KnopMaat = 'groot' | 'normaal' | 'klein'

const SOORT: Record<KnopSoort, string> = {
  primair: 'bg-accent text-white border border-accent hover:bg-accent-hover active:bg-accent-press',
  secundair: 'bg-surface text-ink border border-line-4 hover:border-line-5',
  stil: 'bg-transparent text-ink-2 border border-line-3 hover:border-line-5',
  gevaar: 'bg-transparent text-fout border border-fout/40 hover:border-fout',
  link: 'bg-transparent text-accent border border-transparent hover:text-accent-soft',
}

const MAAT: Record<KnopMaat, string> = {
  // Minimaal 48px tikdoel; primaire acties tijdens een set zijn 56px.
  groot: 'min-h-[56px] px-6 text-[16px] font-semibold rounded-full',
  normaal: 'min-h-[48px] px-5 text-[16px] font-medium rounded-full',
  klein: 'min-h-[40px] px-3.5 text-[14px] font-medium rounded-[8px]',
}

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  soort?: KnopSoort
  maat?: KnopMaat
  vol?: boolean
  icoon?: ReactNode
}

export function Knop({
  soort = 'secundair',
  maat = 'normaal',
  vol = false,
  icoon,
  children,
  className = '',
  disabled,
  ...rest
}: Props) {
  return (
    <button
      type="button"
      disabled={disabled}
      className={[
        'inline-flex items-center justify-center gap-2 transition-colors select-none',
        SOORT[soort],
        MAAT[maat],
        vol ? 'w-full' : '',
        disabled === true ? 'cursor-not-allowed opacity-40' : '',
        className,
      ].join(' ')}
      {...rest}
    >
      {icoon}
      {children}
    </button>
  )
}

/** Vierkante icoonknop, bijvoorbeeld voor sluiten of terug. */
export function IcoonKnop({
  label,
  children,
  className = '',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-ink-2 hover:bg-ink/[0.06] ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}
