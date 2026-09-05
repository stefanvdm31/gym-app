import { db, HUIDIGE_SCHEMA_VERSIE, nieuwId } from './db'
import type {
  Exercise,
  Materiaal,
  MuscleGroup,
  Settings,
  TemplateItem,
  WorkoutTemplate,
} from './types'
import { vandaagIso } from '../lib/date'

/**
 * Startgegevens. Deze worden één keer weggeschreven, bij de allereerste keer
 * openen van de app. Daarna zijn het gewone records: alles is aan te passen,
 * te hernoemen, te herordenen of te archiveren zonder dat hier iets verandert.
 */

const SPIERGROEPEN: Array<[id: string, naam: string]> = [
  ['borst', 'Borst'],
  ['latissimus', 'Latissimus'],
  ['middenrug', 'Middenrug'],
  ['bovenrug', 'Bovenrug'],
  ['onderrug', 'Onderrug'],
  ['schouder-voor', 'Voorste schouder'],
  ['schouder-midden', 'Middelste schouder'],
  ['schouder-achter', 'Achterste schouder'],
  ['biceps', 'Biceps'],
  ['triceps', 'Triceps'],
  ['quadriceps', 'Quadriceps'],
  ['hamstrings', 'Hamstrings'],
  ['bilspieren', 'Bilspieren'],
  ['kuiten', 'Kuiten'],
  ['rompspieren', 'Rompspieren'],
]

interface OefeningSeed {
  key: string
  naam: string
  primair: string
  secundair: string[]
  materiaal: Materiaal
  sets: number
  repMin: number
  repMax: number
  rust: number
  stap: number
  aandachtspunt: string
  lichaamsgewicht?: boolean
  tijdgebonden?: boolean
  unilateraal?: boolean
}

const OEFENINGEN: OefeningSeed[] = [
  // Dag A
  {
    key: 'back-squat',
    naam: 'Back squat',
    primair: 'quadriceps',
    secundair: ['bilspieren', 'rompspieren'],
    materiaal: 'halter',
    sets: 3,
    repMin: 5,
    repMax: 8,
    rust: 180,
    stap: 5,
    aandachtspunt: 'Diepte tot minstens parallel',
  },
  {
    key: 'db-bench',
    naam: 'Dumbbell bench press',
    primair: 'borst',
    secundair: ['schouder-voor', 'triceps'],
    materiaal: 'dumbbell',
    sets: 3,
    repMin: 8,
    repMax: 10,
    rust: 150,
    stap: 2,
    aandachtspunt: 'Ellebogen ~45 graden, niet uitgespreid',
  },
  {
    key: 'lat-pulldown',
    naam: 'Lat pulldown',
    primair: 'latissimus',
    secundair: ['biceps'],
    materiaal: 'kabel',
    sets: 3,
    repMin: 8,
    repMax: 12,
    rust: 120,
    stap: 2.5,
    aandachtspunt: 'Borst omhoog, trekken met de ellebogen',
  },
  {
    key: 'rdl',
    naam: 'Romanian deadlift',
    primair: 'hamstrings',
    secundair: ['bilspieren', 'onderrug'],
    materiaal: 'halter',
    sets: 3,
    repMin: 8,
    repMax: 10,
    rust: 150,
    stap: 5,
    aandachtspunt: 'Rug recht, halter langs de benen',
  },
  {
    key: 'cable-row',
    naam: 'Seated cable row',
    primair: 'middenrug',
    secundair: ['biceps'],
    materiaal: 'kabel',
    sets: 3,
    repMin: 10,
    repMax: 12,
    rust: 120,
    stap: 2.5,
    aandachtspunt: 'Schouderbladen samenknijpen',
  },
  {
    key: 'face-pull',
    naam: 'Face pull',
    primair: 'schouder-achter',
    secundair: ['bovenrug'],
    materiaal: 'kabel',
    sets: 3,
    repMin: 15,
    repMax: 20,
    rust: 60,
    stap: 1,
    aandachtspunt: 'Schoudergezondheid, niet overslaan',
  },

  // Dag B
  {
    key: 'trap-bar-dl',
    naam: 'Trap bar deadlift',
    primair: 'hamstrings',
    secundair: ['quadriceps', 'bilspieren', 'onderrug'],
    materiaal: 'trap bar',
    sets: 3,
    repMin: 4,
    repMax: 6,
    rust: 180,
    stap: 5,
    aandachtspunt: 'Neutrale grip, gewicht dicht bij je zwaartepunt',
  },
  {
    key: 'incline-db-press',
    naam: 'Incline dumbbell press',
    primair: 'borst',
    secundair: ['schouder-voor', 'triceps'],
    materiaal: 'dumbbell',
    sets: 3,
    repMin: 8,
    repMax: 10,
    rust: 150,
    stap: 2,
    aandachtspunt: 'Bank op 30-45 graden, richt op de bovenborst',
  },
  {
    key: 'cs-row',
    naam: 'Chest-supported row',
    primair: 'middenrug',
    secundair: ['biceps'],
    materiaal: 'machine',
    sets: 3,
    repMin: 8,
    repMax: 12,
    rust: 120,
    stap: 2.5,
    aandachtspunt: 'Borst op de bank, geen momentum',
  },
  {
    key: 'leg-press',
    naam: 'Leg press',
    primair: 'quadriceps',
    secundair: ['bilspieren'],
    materiaal: 'machine',
    sets: 3,
    repMin: 10,
    repMax: 12,
    rust: 150,
    stap: 10,
    aandachtspunt: 'Voeten hoog voor meer bilspier',
  },
  {
    key: 'lateral-raise',
    naam: 'Dumbbell lateral raise',
    primair: 'schouder-midden',
    secundair: [],
    materiaal: 'dumbbell',
    sets: 4,
    repMin: 12,
    repMax: 15,
    rust: 60,
    stap: 1,
    aandachtspunt: 'Belangrijkste oefening voor schouderbreedte',
  },
  {
    key: 'barbell-curl',
    naam: 'Barbell curl',
    primair: 'biceps',
    secundair: [],
    materiaal: 'halter',
    sets: 3,
    repMin: 10,
    repMax: 12,
    rust: 90,
    stap: 2.5,
    aandachtspunt: 'Mag ook met dumbbells',
  },

  // Dag C
  {
    key: 'bb-bench',
    naam: 'Barbell bench press',
    primair: 'borst',
    secundair: ['schouder-voor', 'triceps'],
    materiaal: 'halter',
    sets: 4,
    repMin: 6,
    repMax: 8,
    rust: 180,
    stap: 2.5,
    aandachtspunt: 'Schouderbladen achter en omlaag vastzetten',
  },
  {
    key: 'bulgarian',
    naam: 'Bulgarian split squat',
    primair: 'bilspieren',
    secundair: ['quadriceps'],
    materiaal: 'dumbbell',
    sets: 3,
    repMin: 8,
    repMax: 10,
    rust: 120,
    stap: 2,
    aandachtspunt: 'Gewicht per hand noteren',
    unilateraal: true,
  },
  {
    key: 'pull-up',
    naam: 'Pull-up',
    primair: 'latissimus',
    secundair: ['biceps'],
    materiaal: 'lichaamsgewicht',
    sets: 3,
    repMin: 5,
    repMax: 8,
    rust: 150,
    stap: 2.5,
    aandachtspunt: 'Lichaamsgewicht. Hulp of extra gewicht noteren als min of plus kg',
    lichaamsgewicht: true,
  },
  {
    key: 'db-shoulder-press',
    naam: 'Seated dumbbell shoulder press',
    primair: 'schouder-voor',
    secundair: ['schouder-midden', 'triceps'],
    materiaal: 'dumbbell',
    sets: 3,
    repMin: 8,
    repMax: 12,
    rust: 120,
    stap: 2,
    aandachtspunt: 'NEUTRALE grip, handpalmen naar elkaar',
  },
  {
    key: 'leg-curl',
    naam: 'Leg curl',
    primair: 'hamstrings',
    secundair: [],
    materiaal: 'machine',
    sets: 3,
    repMin: 10,
    repMax: 12,
    rust: 90,
    stap: 5,
    aandachtspunt: 'Knieflexie',
  },
  {
    key: 'triceps-pushdown',
    naam: 'Triceps pushdown',
    primair: 'triceps',
    secundair: [],
    materiaal: 'kabel',
    sets: 3,
    repMin: 12,
    repMax: 15,
    rust: 60,
    stap: 2.5,
    aandachtspunt: 'Ellebogen vast naast je lichaam',
  },
  {
    key: 'rear-delt-fly',
    naam: 'Rear delt fly',
    primair: 'schouder-achter',
    secundair: ['bovenrug'],
    materiaal: 'dumbbell',
    sets: 2,
    repMin: 15,
    repMax: 20,
    rust: 60,
    stap: 1,
    aandachtspunt: 'Optioneel als er tijd over is',
  },

  // Buikspierkwartier
  {
    key: 'dead-bug',
    naam: 'Dead bug',
    primair: 'rompspieren',
    secundair: [],
    materiaal: 'lichaamsgewicht',
    sets: 2,
    repMin: 8,
    repMax: 8,
    rust: 30,
    stap: 1,
    aandachtspunt: 'Warming-up. Onderrug tegen de mat houden',
    lichaamsgewicht: true,
    unilateraal: true,
  },
  {
    key: 'reverse-crunch',
    naam: 'Reverse crunch',
    primair: 'rompspieren',
    secundair: [],
    materiaal: 'lichaamsgewicht',
    sets: 3,
    repMin: 12,
    repMax: 15,
    rust: 45,
    stap: 1,
    aandachtspunt: 'Rol je bekken op, geen zwaai',
    lichaamsgewicht: true,
  },
  {
    key: 'hollow-hold',
    naam: 'Hollow hold',
    primair: 'rompspieren',
    secundair: [],
    materiaal: 'lichaamsgewicht',
    sets: 3,
    repMin: 20,
    repMax: 40,
    rust: 45,
    stap: 1,
    aandachtspunt: 'Onderrug tegen de mat, kin naar de borst',
    lichaamsgewicht: true,
    tijdgebonden: true,
  },
  {
    key: 'crunch-db',
    naam: 'Crunch met dumbbells boven hoofd',
    primair: 'rompspieren',
    secundair: [],
    materiaal: 'dumbbell',
    sets: 3,
    repMin: 10,
    repMax: 12,
    rust: 45,
    stap: 1,
    aandachtspunt: 'Armen gestrekt boven je hoofd houden',
  },
  {
    key: 'side-plank-dip',
    naam: 'Side plank met hip dip',
    primair: 'rompspieren',
    secundair: [],
    materiaal: 'lichaamsgewicht',
    sets: 3,
    repMin: 10,
    repMax: 12,
    rust: 45,
    stap: 1,
    aandachtspunt: 'Heup zakt gecontroleerd, lichaam op een lijn',
    lichaamsgewicht: true,
    unilateraal: true,
  },
  {
    key: 'rkc-plank',
    naam: 'RKC plank',
    primair: 'rompspieren',
    secundair: ['bilspieren'],
    materiaal: 'lichaamsgewicht',
    sets: 2,
    repMin: 20,
    repMax: 30,
    rust: 45,
    stap: 1,
    aandachtspunt: 'Alles maximaal aanspannen, korter mag',
    lichaamsgewicht: true,
    tijdgebonden: true,
  },
  {
    key: 'external-rotation',
    naam: 'External rotation zijligging',
    primair: 'schouder-achter',
    secundair: [],
    materiaal: 'dumbbell',
    sets: 2,
    repMin: 15,
    repMax: 20,
    rust: 45,
    stap: 1,
    aandachtspunt: 'Voor je schouder. Elleboog tegen je zij houden',
    unilateraal: true,
  },
  {
    key: 'prone-rear-delt',
    naam: 'Prone rear delt raise',
    primair: 'schouder-achter',
    secundair: ['bovenrug'],
    materiaal: 'dumbbell',
    sets: 2,
    repMin: 15,
    repMax: 15,
    rust: 45,
    stap: 1,
    aandachtspunt: 'Buikligging, duimen omhoog',
  },
]

interface SchemaSeed {
  label: string
  type: 'gym' | 'thuis'
  uitvoering: 'sets' | 'rondes'
  rondes: number
  actief: boolean
  oefeningen: string[]
}

const SCHEMAS: SchemaSeed[] = [
  {
    label: 'Dag A',
    type: 'gym',
    uitvoering: 'sets',
    rondes: 1,
    actief: true,
    oefeningen: ['back-squat', 'db-bench', 'lat-pulldown', 'rdl', 'cable-row', 'face-pull'],
  },
  {
    label: 'Dag B',
    type: 'gym',
    uitvoering: 'sets',
    rondes: 1,
    actief: true,
    oefeningen: [
      'trap-bar-dl',
      'incline-db-press',
      'cs-row',
      'leg-press',
      'lateral-raise',
      'barbell-curl',
    ],
  },
  {
    label: 'Dag C',
    type: 'gym',
    uitvoering: 'sets',
    rondes: 1,
    actief: true,
    oefeningen: [
      'bb-bench',
      'bulgarian',
      'pull-up',
      'db-shoulder-press',
      'leg-curl',
      'triceps-pushdown',
      'rear-delt-fly',
    ],
  },
  {
    label: 'Buikspierkwartier',
    type: 'thuis',
    uitvoering: 'rondes',
    rondes: 3,
    // Staat buiten de rotatie: je kiest hem zelf, 2x per week naast je gymdagen.
    actief: false,
    oefeningen: [
      'dead-bug',
      'reverse-crunch',
      'hollow-hold',
      'crunch-db',
      'side-plank-dip',
      'rkc-plank',
      'external-rotation',
      'prone-rear-delt',
    ],
  },
]

export function standaardInstellingen(): Settings {
  return {
    id: 'settings',
    programmaStartdatum: vandaagIso(),
    deloadWeken: [13, 26, 39],
    eenheid: 'kg',
    stangGewichtKg: 20,
    beschikbareSchijven: [25, 20, 15, 10, 5, 2.5, 1.25],
    standaardRusttijdSeconden: 120,
    setsPerWeekMin: 10,
    setsPerWeekMax: 14,
    gewichtsDoel: 'behouden',
    tempoMinKgPerWeek: 0.2,
    tempoMaxKgPerWeek: 0.4,
    wakeLockAan: true,
    geluidAan: true,
    trillenAan: true,
    thema: 'systeem',
  }
}

/** Zorgt dat twee snel op elkaar volgende aanroepen niet allebei gaan vullen. */
let lopendeSeed: Promise<void> | null = null

/**
 * Vult de database bij de allereerste start. Draait maar één keer: is er al
 * een meta-record, dan gebeurt er niets en blijven jouw gegevens ongemoeid.
 */
export function seedIndienLeeg(): Promise<void> {
  lopendeSeed ??= voerSeedUit().finally(() => {
    lopendeSeed = null
  })
  return lopendeSeed
}

async function voerSeedUit(): Promise<void> {
  const bestaandeMeta = await db.meta.get('meta')
  if (bestaandeMeta !== undefined) return

  const nu = new Date().toISOString()

  const spiergroepen: MuscleGroup[] = SPIERGROEPEN.map(([id, naam], i) => ({
    id,
    naam,
    volgorde: i,
    gearchiveerd: false,
  }))

  const idPerKey = new Map<string, string>()
  const oefeningen: Exercise[] = OEFENINGEN.map((o) => {
    const id = nieuwId('ex')
    idPerKey.set(o.key, id)
    return {
      id,
      naam: o.naam,
      spiergroepPrimair: o.primair,
      spiergroepenSecundair: o.secundair,
      materiaal: o.materiaal,
      standaardSets: o.sets,
      repMin: o.repMin,
      repMax: o.repMax,
      rustSeconden: o.rust,
      gewichtsstapKg: o.stap,
      isLichaamsgewicht: o.lichaamsgewicht ?? false,
      isTijdgebonden: o.tijdgebonden ?? false,
      isUnilateraal: o.unilateraal ?? false,
      youtubeUrl: '',
      aandachtspunt: o.aandachtspunt,
      notitie: '',
      gearchiveerd: false,
      aangemaaktOp: nu,
      gewijzigdOp: nu,
    }
  })

  const templates: WorkoutTemplate[] = SCHEMAS.map((s, i) => {
    const items: TemplateItem[] = s.oefeningen.flatMap((key, j) => {
      const exerciseId = idPerKey.get(key)
      return exerciseId === undefined ? [] : [{ exerciseId, volgorde: j }]
    })
    return {
      id: nieuwId('tpl'),
      label: s.label,
      volgorde: i,
      type: s.type,
      uitvoering: s.uitvoering,
      rondes: s.rondes,
      actief: s.actief,
      items,
    }
  })

  await db.transaction(
    'rw',
    [db.muscleGroups, db.exercises, db.templates, db.settings, db.meta],
    async () => {
      // Binnen de transactie nog eens kijken: als een tweede aanroep ons voor
      // was, doen we niets. bulkPut in plaats van bulkAdd, zodat een halve
      // eerdere poging nooit een foutmelding oplevert.
      if ((await db.meta.get('meta')) !== undefined) return

      await db.muscleGroups.bulkPut(spiergroepen)
      await db.exercises.bulkPut(oefeningen)
      await db.templates.bulkPut(templates)
      await db.settings.put(standaardInstellingen())
      await db.meta.put({
        id: 'meta',
        schemaVersie: HUIDIGE_SCHEMA_VERSIE,
        seedUitgevoerdOp: nu,
      })
    },
  )
}
