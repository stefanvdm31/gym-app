/**
 * Datamodel van de app.
 *
 * Alles wat je in de app ziet komt uit deze records. Er staat nergens in de
 * code een oefeningnaam of trainingsdag hard ingebakken: voeg je een oefening
 * toe, dan werkt hij overal mee.
 */

/** Datum als 'JJJJ-MM-DD'. Sorteert alfabetisch ook chronologisch. */
export type IsoDatum = string
/** Volledig tijdstip in ISO-formaat. */
export type IsoTijd = string

export type Materiaal =
  | 'halter'
  | 'dumbbell'
  | 'kabel'
  | 'machine'
  | 'lichaamsgewicht'
  | 'trap bar'
  | 'overig'

/** Een spiergroep is een gewoon record, zodat je de lijst zelf kunt beheren. */
export interface MuscleGroup {
  id: string
  naam: string
  volgorde: number
  /** Op false gezet in plaats van verwijderd, zodat oude historie leesbaar blijft. */
  gearchiveerd: boolean
}

export interface Exercise {
  id: string
  naam: string
  /** id uit MuscleGroup. Telt heel mee in de wekelijkse settelling. */
  spiergroepPrimair: string
  /** ids uit MuscleGroup. Tellen elk voor een halve set mee. */
  spiergroepenSecundair: string[]
  materiaal: Materiaal
  standaardSets: number
  repMin: number
  repMax: number
  rustSeconden: number
  /** Stapgrootte van de plus/min-knoppen, in kg. */
  gewichtsstapKg: number
  /** Lichaamsgewichtsoefening: het gewichtveld is dan extra gewicht (mag negatief zijn voor hulp). */
  isLichaamsgewicht: boolean
  /** Tijdgebonden: je logt seconden in plaats van herhalingen. */
  isTijdgebonden: boolean
  /** Unilateraal: één set telt beide kanten, reps gelden per kant. */
  isUnilateraal: boolean
  youtubeUrl: string
  aandachtspunt: string
  notitie: string
  gearchiveerd: boolean
  aangemaaktOp: IsoTijd
  gewijzigdOp: IsoTijd
}

export interface TemplateItem {
  exerciseId: string
  volgorde: number
  setsOverride?: number
  repMinOverride?: number
  repMaxOverride?: number
  notitie?: string
}

export type TemplateType = 'gym' | 'thuis'
/** 'sets' = oefening voor oefening afmaken. 'rondes' = circuit, alle oefeningen per ronde. */
export type Uitvoering = 'sets' | 'rondes'

export interface WorkoutTemplate {
  id: string
  label: string
  volgorde: number
  type: TemplateType
  uitvoering: Uitvoering
  /** Aantal rondes bij uitvoering 'rondes'. */
  rondes: number
  /** Telt mee in de rotatie 'welke dag is aan de beurt'. */
  actief: boolean
  items: TemplateItem[]
}

export type PrSoort = 'gewicht' | 'e1rm' | 'reps' | 'tijd'

export interface SetLog {
  gewichtKg: number
  reps: number
  /** Alleen gevuld bij tijdgebonden oefeningen. */
  seconden?: number
  voltooid: boolean
  /** Opwarmsets tellen niet mee in de wekelijkse settelling. */
  isOpwarm: boolean
  isPR: boolean
  /** Welke soorten record deze set brak. Leeg als het geen PR was. */
  prSoorten: PrSoort[]
  /** Bij circuits: in welke ronde deze set hoort. */
  ronde?: number
  voltooidOp?: IsoTijd
}

export interface SessionEntry {
  exerciseId: string
  /** Kopie van de naam op het moment van trainen, zodat historie leesbaar blijft na hernoemen. */
  exerciseNaam: string
  volgorde: number
  sets: SetLog[]
  /** Vrij tekstveld, o.a. voor 'zwaarder gemaakt door' bij het buikspierkwartier. */
  notitie: string
  /** Overgeslagen tijdens de training. */
  overgeslagen: boolean
  /** Gevuld als deze oefening tijdens de sessie een andere verving. */
  vervangtExerciseId?: string
}

export type SessionStatus = 'bezig' | 'afgerond'

export interface Session {
  id: string
  templateId: string
  /** Kopie van het label, zodat historie leesbaar blijft na hernoemen. */
  templateLabel: string
  datum: IsoDatum
  startTijd: IsoTijd
  eindTijd?: IsoTijd
  status: SessionStatus
  sessieNotitie: string
  /** Programmaweek waarin deze training viel, berekend bij het starten. */
  programmaWeek: number
  isDeload: boolean
  entries: SessionEntry[]
}

export interface BodyWeight {
  /** De datum is de sleutel: één weging per dag. */
  datum: IsoDatum
  gewichtKg: number
}

export interface Measurement {
  datum: IsoDatum
  borst?: number
  taille?: number
  heup?: number
  bovenarmL?: number
  bovenarmR?: number
  dijbeen?: number
  notitie: string
}

export type GewichtsDoel = 'afvallen' | 'aankomen' | 'behouden'

export interface Settings {
  /** Vaste sleutel; er is altijd precies één instellingenrecord. */
  id: 'settings'
  programmaStartdatum: IsoDatum
  deloadWeken: number[]
  eenheid: 'kg'
  stangGewichtKg: number
  beschikbareSchijven: number[]
  standaardRusttijdSeconden: number
  /** Streefbereik voor wekelijkse settelling per spiergroep. */
  setsPerWeekMin: number
  setsPerWeekMax: number
  gewichtsDoel: GewichtsDoel
  /** Streeftempo van het weekgemiddelde, in kg per week (altijd positief). */
  tempoMinKgPerWeek: number
  tempoMaxKgPerWeek: number
  wakeLockAan: boolean
  geluidAan: boolean
  trillenAan: boolean
  thema: 'donker'
  laatsteBackupOp?: IsoTijd
}

/** Metagegevens van de database zelf. */
export interface Meta {
  id: 'meta'
  schemaVersie: number
  seedUitgevoerdOp?: IsoTijd
}
