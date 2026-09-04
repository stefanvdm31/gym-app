import { afrondenOpStap } from './format'

/**
 * Schijvencalculator: welke schijven leg je per kant op de stang?
 *
 * Schijven gaan altijd per paar op de stang, dus we rekenen met
 * (doelgewicht − stang) / 2 per kant.
 */

export interface SchijvenResultaat {
  /** Het gewicht dat je hiermee daadwerkelijk op de stang hebt. */
  haalbaarGewicht: number
  /** Schijven per kant, zwaarste eerst. */
  perKant: Array<{ schijf: number; aantal: number }>
  /** True als het exacte doelgewicht niet te maken is met deze schijven. */
  isBenadering: boolean
  /** Ingevuld als het doel onder het stanggewicht ligt. */
  waarschuwing: string | null
}

export function berekenSchijven(
  doelGewicht: number,
  stangGewicht: number,
  beschikbareSchijven: number[],
): SchijvenResultaat {
  const schijven = [...new Set(beschikbareSchijven.filter((s) => s > 0))].sort((a, b) => b - a)

  if (doelGewicht < stangGewicht) {
    return {
      haalbaarGewicht: stangGewicht,
      perKant: [],
      isBenadering: true,
      waarschuwing: `De lege stang weegt al ${stangGewicht} kg`,
    }
  }

  if (schijven.length === 0) {
    return {
      haalbaarGewicht: stangGewicht,
      perKant: [],
      isBenadering: doelGewicht !== stangGewicht,
      waarschuwing: 'Er staan geen schijven in je instellingen',
    }
  }

  // Gulzig van zwaar naar licht. Met een normale schijvenset (25/20/15/10/5/
  // 2,5/1,25) geeft dat altijd het beste resultaat, en het is navolgbaar.
  let restPerKant = (doelGewicht - stangGewicht) / 2
  const perKant: Array<{ schijf: number; aantal: number }> = []

  for (const schijf of schijven) {
    const aantal = Math.floor((restPerKant + 1e-9) / schijf)
    if (aantal > 0) {
      perKant.push({ schijf, aantal })
      restPerKant = Math.round((restPerKant - aantal * schijf) * 1000) / 1000
    }
  }

  const totaalPerKant = perKant.reduce((som, p) => som + p.schijf * p.aantal, 0)
  const haalbaarGewicht = afrondenOpStap(stangGewicht + totaalPerKant * 2, 0.005)

  return {
    haalbaarGewicht,
    perKant,
    isBenadering: Math.abs(haalbaarGewicht - doelGewicht) > 0.001,
    waarschuwing: null,
  }
}
