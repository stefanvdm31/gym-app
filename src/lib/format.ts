/** Nederlandse getalopmaak: komma als decimaalteken, geen onnodige nullen. */
export function getal(waarde: number, maxDecimalen = 2): string {
  if (!Number.isFinite(waarde)) return '—'
  const afgerond = Math.round(waarde * 10 ** maxDecimalen) / 10 ** maxDecimalen
  return afgerond.toLocaleString('nl-NL', { maximumFractionDigits: maxDecimalen })
}

/** '82,5 kg'. Bij lichaamsgewichtsoefeningen krijgt een positief getal een plus. */
export function kg(waarde: number, opties?: { toonPlus?: boolean }): string {
  const prefix = opties?.toonPlus === true && waarde > 0 ? '+' : ''
  return `${prefix}${getal(waarde, 2)} kg`
}

/** Leest '82,5' én '82.5'. Geeft null bij onzin. */
export function leesGetal(tekst: string): number | null {
  const schoon = tekst.trim().replace(',', '.')
  if (schoon === '') return null
  const n = Number(schoon)
  return Number.isFinite(n) ? n : null
}

/** Rondt af op een veelvoud van de stapgrootte, om zwevende komma-ruis te vermijden. */
export function afrondenOpStap(waarde: number, stap: number): number {
  if (stap <= 0) return waarde
  return Math.round(Math.round(waarde / stap) * stap * 1000) / 1000
}

/** '3 sets' / '1 set' */
export function meervoud(aantal: number, enkel: string, meer: string): string {
  return `${aantal} ${aantal === 1 ? enkel : meer}`
}
