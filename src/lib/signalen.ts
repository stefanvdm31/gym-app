/**
 * Geluid en trilling bij het aflopen van de rusttimer.
 *
 * Het piepje wordt in de app zelf opgewekt (Web Audio), dus er hoeft geen
 * geluidsbestand geladen te worden en het werkt offline.
 */

let audioContext: AudioContext | null = null

function haalContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  try {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (Ctor === undefined) return null
    audioContext ??= new Ctor()
    return audioContext
  } catch {
    return null
  }
}

/**
 * Browsers laten geluid pas toe na een tik van de gebruiker. Roep dit aan bij
 * het starten van een training, dan mag de timer later vanzelf piepen.
 */
export function ontgrendelGeluid(): void {
  const ctx = haalContext()
  if (ctx === null) return
  void ctx.resume().catch(() => undefined)
}

export function piep(): void {
  const ctx = haalContext()
  if (ctx === null) return
  try {
    void ctx.resume().catch(() => undefined)
    const nu = ctx.currentTime
    for (const [start, frequentie] of [
      [0, 880],
      [0.18, 1174.7],
    ] as const) {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = frequentie
      gain.gain.setValueAtTime(0.0001, nu + start)
      gain.gain.exponentialRampToValueAtTime(0.25, nu + start + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, nu + start + 0.16)
      osc.connect(gain).connect(ctx.destination)
      osc.start(nu + start)
      osc.stop(nu + start + 0.18)
    }
  } catch {
    // Geluid is een extraatje: als het niet lukt, gaat de app gewoon door.
  }
}

export function tril(patroon: number | number[] = [180, 90, 180]): void {
  try {
    if ('vibrate' in navigator) navigator.vibrate(patroon)
  } catch {
    // Sommige toestellen weigeren dit; niet erg.
  }
}
