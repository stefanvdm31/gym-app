/**
 * Kleuren voor de grafieken.
 *
 * Recharts krijgt hier verwijzingen naar de designtokens in plaats van vaste
 * kleuren. Zo kleuren de grafieken vanzelf mee met licht en donker, zonder
 * dat er iets opnieuw getekend hoeft te worden.
 */
export const GRAFIEK = {
  raster: 'var(--color-line-2)',
  aslabel: 'var(--color-ink-muted)',
  lijn: 'var(--color-accent)',
  /** Dunne hulplijn, bijvoorbeeld je dagelijkse wegingen achter het gemiddelde. */
  hulplijn: 'var(--color-ink-faint)',
} as const

/** Stijl van het tekstballonnetje dat verschijnt als je een punt aanwijst. */
export const GRAFIEK_TOOLTIP = {
  contentStyle: {
    background: 'var(--color-surface-2)',
    border: '1px solid var(--color-line-4)',
    borderRadius: 8,
    fontSize: 13,
    color: 'var(--color-ink)',
  },
  labelStyle: { color: 'var(--color-ink-2)' },
} as const

/** Stijl van de getallen langs de assen. */
export const GRAFIEK_AS = { fill: GRAFIEK.aslabel, fontSize: 11 } as const
