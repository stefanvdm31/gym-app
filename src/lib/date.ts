import type { IsoDatum } from '../db/types'

/** Vandaag als 'JJJJ-MM-DD', in lokale tijd (niet UTC). */
export function vandaagIso(): IsoDatum {
  return naarIso(new Date())
}

export function naarIso(d: Date): IsoDatum {
  const jaar = d.getFullYear()
  const maand = String(d.getMonth() + 1).padStart(2, '0')
  const dag = String(d.getDate()).padStart(2, '0')
  return `${jaar}-${maand}-${dag}`
}

/** Zet 'JJJJ-MM-DD' om naar een Date op middernacht lokale tijd. */
export function vanIso(iso: IsoDatum): Date {
  const [jaar, maand, dag] = iso.split('-').map(Number)
  return new Date(jaar ?? 1970, (maand ?? 1) - 1, dag ?? 1)
}

export function dagenErbij(iso: IsoDatum, dagen: number): IsoDatum {
  const d = vanIso(iso)
  d.setDate(d.getDate() + dagen)
  return naarIso(d)
}

/** Aantal hele dagen tussen twee datums (b min a). */
export function dagenVerschil(a: IsoDatum, b: IsoDatum): number {
  const ms = vanIso(b).getTime() - vanIso(a).getTime()
  return Math.round(ms / 86_400_000)
}

/** De maandag van de week waarin deze datum valt. */
export function maandagVan(iso: IsoDatum): IsoDatum {
  const d = vanIso(iso)
  // getDay(): 0 = zondag. Wij rekenen de week van maandag t/m zondag.
  const verschuiving = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - verschuiving)
  return naarIso(d)
}

/**
 * In welke programmaweek valt deze datum? Week 1 is de week waarin de
 * programmastartdatum valt. Voor de startdatum tellen we door in negatieve
 * richting, zodat er nooit een gat of een 0 ontstaat.
 */
export function programmaWeek(startdatum: IsoDatum, datum: IsoDatum): number {
  const startMaandag = maandagVan(startdatum)
  const dezeMaandag = maandagVan(datum)
  const weken = Math.round(dagenVerschil(startMaandag, dezeMaandag) / 7)
  return weken + 1
}

export function isDeloadWeek(week: number, deloadWeken: number[]): boolean {
  return deloadWeken.includes(week)
}

const DAGEN = ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag']
const DAGEN_KORT = ['zo', 'ma', 'di', 'wo', 'do', 'vr', 'za']
const MAANDEN = [
  'januari',
  'februari',
  'maart',
  'april',
  'mei',
  'juni',
  'juli',
  'augustus',
  'september',
  'oktober',
  'november',
  'december',
]
const MAANDEN_KORT = [
  'jan',
  'feb',
  'mrt',
  'apr',
  'mei',
  'jun',
  'jul',
  'aug',
  'sep',
  'okt',
  'nov',
  'dec',
]

/** 'woensdag 4 september' */
export function langeDatum(iso: IsoDatum): string {
  const d = vanIso(iso)
  return `${DAGEN[d.getDay()]} ${d.getDate()} ${MAANDEN[d.getMonth()]}`
}

/** 'wo 4 sep' */
export function korteDatum(iso: IsoDatum): string {
  const d = vanIso(iso)
  return `${DAGEN_KORT[d.getDay()]} ${d.getDate()} ${MAANDEN_KORT[d.getMonth()]}`
}

/** 'vandaag', 'gisteren', '3 dagen geleden', anders de korte datum. */
export function relatieveDatum(iso: IsoDatum): string {
  const verschil = dagenVerschil(iso, vandaagIso())
  if (verschil === 0) return 'vandaag'
  if (verschil === 1) return 'gisteren'
  if (verschil > 1 && verschil < 7) return `${verschil} dagen geleden`
  return korteDatum(iso)
}

/** Seconden als 'm:ss' of 'u:mm:ss'. */
export function klok(seconden: number): string {
  const veilig = Math.max(0, Math.round(seconden))
  const u = Math.floor(veilig / 3600)
  const m = Math.floor((veilig % 3600) / 60)
  const s = veilig % 60
  if (u > 0) return `${u}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

/** '52 min' of '1 u 12 min' */
export function duurTekst(seconden: number): string {
  const minuten = Math.max(0, Math.round(seconden / 60))
  if (minuten < 60) return `${minuten} min`
  const u = Math.floor(minuten / 60)
  const m = minuten % 60
  return m === 0 ? `${u} u` : `${u} u ${m} min`
}

/** ISO-weeknummer (week 1 is de week met de eerste donderdag van het jaar). */
export function isoWeekNummer(iso: IsoDatum): number {
  const d = vanIso(iso)
  // Naar de donderdag van deze week: die bepaalt in welk jaar de week valt.
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7))
  const eersteDonderdag = new Date(d.getFullYear(), 0, 4)
  eersteDonderdag.setDate(
    eersteDonderdag.getDate() + 3 - ((eersteDonderdag.getDay() + 6) % 7),
  )
  return 1 + Math.round((d.getTime() - eersteDonderdag.getTime()) / (7 * 86_400_000))
}
