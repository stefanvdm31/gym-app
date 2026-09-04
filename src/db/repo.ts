import { db, nieuwId } from './db'
import type {
  BodyWeight,
  Exercise,
  IsoDatum,
  Measurement,
  MuscleGroup,
  Session,
  SessionEntry,
  SetLog,
  Settings,
  WorkoutTemplate,
} from './types'
import { standaardInstellingen } from './seed'
import { isDeloadWeek, maandagVan, programmaWeek, vandaagIso } from '../lib/date'
import { bepaalPrs, type SetMetContext } from '../lib/pr'

/**
 * Alle lees- en schrijfacties op de database op één plek.
 *
 * Belangrijk uitgangspunt: elke wijziging aan een set gaat meteen naar
 * IndexedDB. Er is geen "opslaan"-knop en er zit niets in het geheugen te
 * wachten, dus een crash of een lege accu kost je hooguit de set waar je
 * middenin zat.
 */

// ── Instellingen ─────────────────────────────────────────────────────────

/**
 * Leest de instellingen. Bewust alleen-lezen: dit draait ook in live queries,
 * en die mogen niet schrijven. Ontbreekt het record nog, dan krijg je de
 * standaardwaarden terug zonder dat er iets wordt weggeschreven.
 */
export async function haalInstellingen(): Promise<Settings> {
  return (await db.settings.get('settings')) ?? standaardInstellingen()
}

export async function wijzigInstellingen(patch: Partial<Settings>): Promise<void> {
  const huidig = await haalInstellingen()
  await db.settings.put({ ...huidig, ...patch, id: 'settings' })
}

// ── Spiergroepen ─────────────────────────────────────────────────────────

export async function bewaarSpiergroep(groep: MuscleGroup): Promise<void> {
  await db.muscleGroups.put(groep)
}

export async function nieuweSpiergroep(naam: string): Promise<string> {
  const aantal = await db.muscleGroups.count()
  const id = nieuwId('mg')
  await db.muscleGroups.put({ id, naam, volgorde: aantal, gearchiveerd: false })
  return id
}

// ── Oefeningen ───────────────────────────────────────────────────────────

export function legeOefening(): Exercise {
  const nu = new Date().toISOString()
  return {
    id: nieuwId('ex'),
    naam: '',
    spiergroepPrimair: '',
    spiergroepenSecundair: [],
    materiaal: 'halter',
    standaardSets: 3,
    repMin: 8,
    repMax: 12,
    rustSeconden: 120,
    gewichtsstapKg: 2.5,
    isLichaamsgewicht: false,
    isTijdgebonden: false,
    isUnilateraal: false,
    youtubeUrl: '',
    aandachtspunt: '',
    notitie: '',
    gearchiveerd: false,
    aangemaaktOp: nu,
    gewijzigdOp: nu,
  }
}

export async function bewaarOefening(oefening: Exercise): Promise<void> {
  await db.exercises.put({ ...oefening, gewijzigdOp: new Date().toISOString() })
}

/**
 * Archiveert in plaats van te verwijderen: je historie blijft dan compleet.
 * De oefening verdwijnt uit de keuzelijsten en uit actieve schema's.
 */
export async function archiveerOefening(exerciseId: string, gearchiveerd: boolean): Promise<void> {
  await db.exercises.update(exerciseId, {
    gearchiveerd,
    gewijzigdOp: new Date().toISOString(),
  })
}

// ── Schema's ─────────────────────────────────────────────────────────────

export function leegSchema(volgorde: number): WorkoutTemplate {
  return {
    id: nieuwId('tpl'),
    label: '',
    volgorde,
    type: 'gym',
    uitvoering: 'sets',
    rondes: 1,
    actief: true,
    items: [],
  }
}

export async function bewaarSchema(schema: WorkoutTemplate): Promise<void> {
  const opgeschoond: WorkoutTemplate = {
    ...schema,
    items: schema.items
      .slice()
      .sort((a, b) => a.volgorde - b.volgorde)
      .map((item, i) => ({ ...item, volgorde: i })),
  }
  await db.templates.put(opgeschoond)
}

export async function verwijderSchema(templateId: string): Promise<void> {
  await db.templates.delete(templateId)
}

// ── Sessies ──────────────────────────────────────────────────────────────

/** De training die nog openstaat, als die er is. */
export async function haalLopendeSessie(): Promise<Session | undefined> {
  const bezig = await db.sessions.where('status').equals('bezig').toArray()
  return bezig.sort((a, b) => b.startTijd.localeCompare(a.startTijd))[0]
}

export async function haalSessie(id: string): Promise<Session | undefined> {
  return db.sessions.get(id)
}

/** Afgeronde sessies, nieuwste eerst. */
export async function haalAfgerondeSessies(limiet?: number): Promise<Session[]> {
  const alle = await db.sessions.where('status').equals('afgerond').toArray()
  alle.sort((a, b) => b.startTijd.localeCompare(a.startTijd))
  return limiet === undefined ? alle : alle.slice(0, limiet)
}

/** Sessies in de week (maandag t/m zondag) waarin deze datum valt. */
export async function haalSessiesVanWeek(datum: IsoDatum): Promise<Session[]> {
  const maandag = maandagVan(datum)
  const alle = await db.sessions.where('datum').aboveOrEqual(maandag).toArray()
  const zondag = new Date(maandag)
  zondag.setDate(zondag.getDate() + 6)
  return alle.filter((s) => s.status === 'afgerond')
}

/**
 * Bepaalt welke trainingsdag aan de beurt is: de dag die na de laatst
 * afgeronde gym-training komt in de rotatie. Nooit gedaan? Dan de eerste.
 */
export async function bepaalVolgendSchema(): Promise<WorkoutTemplate | null> {
  const schemas = (await db.templates.toArray())
    .filter((t) => t.actief)
    .sort((a, b) => a.volgorde - b.volgorde)
  if (schemas.length === 0) return null

  const afgerond = await haalAfgerondeSessies()
  const laatste = afgerond.find((s) => schemas.some((t) => t.id === s.templateId))
  if (laatste === undefined) return schemas[0] ?? null

  const index = schemas.findIndex((t) => t.id === laatste.templateId)
  if (index === -1) return schemas[0] ?? null
  return schemas[(index + 1) % schemas.length] ?? null
}

/**
 * Start een nieuwe training vanuit een schema. De sets worden meteen
 * aangemaakt en voorgevuld met wat je vorige keer deed op die oefening.
 */
export async function startSessie(template: WorkoutTemplate): Promise<Session> {
  const instellingen = await haalInstellingen()
  const datum = vandaagIso()
  const week = programmaWeek(instellingen.programmaStartdatum, datum)

  const entries: SessionEntry[] = []
  for (const item of [...template.items].sort((a, b) => a.volgorde - b.volgorde)) {
    const oefening = await db.exercises.get(item.exerciseId)
    if (oefening === undefined) continue

    const aantalSets = item.setsOverride ?? oefening.standaardSets
    const vorige = await haalVorigeSets(oefening.id)

    const sets: SetLog[] = []
    const totaal = template.uitvoering === 'rondes' ? template.rondes : aantalSets
    for (let i = 0; i < totaal; i += 1) {
      const vorigeSet = vorige[i] ?? vorige.at(-1)
      sets.push({
        gewichtKg: vorigeSet?.gewichtKg ?? 0,
        reps: vorigeSet?.reps ?? (item.repMinOverride ?? oefening.repMin),
        seconden: oefening.isTijdgebonden
          ? (vorigeSet?.seconden ?? item.repMinOverride ?? oefening.repMin)
          : undefined,
        voltooid: false,
        isOpwarm: false,
        isPR: false,
        prSoorten: [],
        ronde: template.uitvoering === 'rondes' ? i + 1 : undefined,
      })
    }

    entries.push({
      exerciseId: oefening.id,
      exerciseNaam: oefening.naam,
      volgorde: item.volgorde,
      sets,
      notitie: '',
      overgeslagen: false,
    })
  }

  const sessie: Session = {
    id: nieuwId('ses'),
    templateId: template.id,
    templateLabel: template.label,
    datum,
    startTijd: new Date().toISOString(),
    status: 'bezig',
    sessieNotitie: '',
    programmaWeek: week,
    isDeload: isDeloadWeek(week, instellingen.deloadWeken),
    entries,
  }

  await db.sessions.put(sessie)
  return sessie
}

/** De laatste voltooide werksets van een oefening, voor het voorvullen. */
export async function haalVorigeSets(exerciseId: string): Promise<SetLog[]> {
  const sessies = await haalAfgerondeSessies()
  for (const sessie of sessies) {
    const entry = sessie.entries.find((e) => e.exerciseId === exerciseId && !e.overgeslagen)
    if (entry === undefined) continue
    const werksets = entry.sets.filter((s) => s.voltooid && !s.isOpwarm)
    if (werksets.length > 0) return werksets
  }
  return []
}

/** Alle gelogde sets van één oefening, chronologisch, voor records en grafieken. */
export async function haalHistorieVanOefening(exerciseId: string): Promise<SetMetContext[]> {
  const sessies = await db.sessions.toArray()
  sessies.sort((a, b) => a.startTijd.localeCompare(b.startTijd))

  const uit: SetMetContext[] = []
  for (const sessie of sessies) {
    sessie.entries.forEach((entry, entryIndex) => {
      if (entry.exerciseId !== exerciseId) return
      entry.sets.forEach((set, setIndex) => {
        uit.push({
          sleutel: `${sessie.id}:${entryIndex}:${setIndex}`,
          datum: sessie.datum,
          sessieId: sessie.id,
          set,
        })
      })
    })
  }
  return uit
}

/**
 * Schrijft één wijziging aan één set direct weg. Alle setbewerkingen lopen
 * hierlangs, zodat er nooit iets in het geheugen blijft hangen.
 */
export async function wijzigSet(
  sessieId: string,
  exerciseId: string,
  setIndex: number,
  patch: Partial<SetLog>,
): Promise<void> {
  await db.transaction('rw', db.sessions, async () => {
    const sessie = await db.sessions.get(sessieId)
    if (sessie === undefined) return

    const entries = sessie.entries.map((entry) => {
      if (entry.exerciseId !== exerciseId) return entry
      const sets = entry.sets.map((set, i) => (i === setIndex ? { ...set, ...patch } : set))
      return { ...entry, sets }
    })

    await db.sessions.put({ ...sessie, entries })
  })

  if (patch.voltooid !== undefined || patch.gewichtKg !== undefined || patch.reps !== undefined) {
    await herberekenPrs(exerciseId)
  }
}

export async function voegSetToe(sessieId: string, exerciseId: string): Promise<void> {
  const sessie = await db.sessions.get(sessieId)
  if (sessie === undefined) return

  const entries = sessie.entries.map((entry) => {
    if (entry.exerciseId !== exerciseId) return entry
    const laatste = entry.sets.at(-1)
    const nieuw: SetLog = {
      gewichtKg: laatste?.gewichtKg ?? 0,
      reps: laatste?.reps ?? 0,
      seconden: laatste?.seconden,
      voltooid: false,
      isOpwarm: false,
      isPR: false,
      prSoorten: [],
      ronde: laatste?.ronde,
    }
    return { ...entry, sets: [...entry.sets, nieuw] }
  })

  await db.sessions.put({ ...sessie, entries })
}

export async function verwijderSet(
  sessieId: string,
  exerciseId: string,
  setIndex: number,
): Promise<void> {
  const sessie = await db.sessions.get(sessieId)
  if (sessie === undefined) return

  const entries = sessie.entries.map((entry) => {
    if (entry.exerciseId !== exerciseId) return entry
    return { ...entry, sets: entry.sets.filter((_, i) => i !== setIndex) }
  })

  await db.sessions.put({ ...sessie, entries })
  await herberekenPrs(exerciseId)
}

export async function wijzigEntry(
  sessieId: string,
  exerciseId: string,
  patch: Partial<SessionEntry>,
): Promise<void> {
  const sessie = await db.sessions.get(sessieId)
  if (sessie === undefined) return

  const entries = sessie.entries.map((entry) =>
    entry.exerciseId === exerciseId ? { ...entry, ...patch } : entry,
  )
  await db.sessions.put({ ...sessie, entries })
}

/** Vervangt een oefening binnen deze training. Je vaste schema blijft ongewijzigd. */
export async function vervangOefening(
  sessieId: string,
  oudeExerciseId: string,
  nieuweExerciseId: string,
): Promise<void> {
  const sessie = await db.sessions.get(sessieId)
  if (sessie === undefined) return
  const nieuwe = await db.exercises.get(nieuweExerciseId)
  if (nieuwe === undefined) return

  const vorige = await haalVorigeSets(nieuweExerciseId)

  const entries = sessie.entries.map((entry) => {
    if (entry.exerciseId !== oudeExerciseId) return entry
    const sets: SetLog[] = entry.sets.map((oud, i) => {
      const vorigeSet = vorige[i] ?? vorige.at(-1)
      return {
        gewichtKg: vorigeSet?.gewichtKg ?? 0,
        reps: vorigeSet?.reps ?? nieuwe.repMin,
        seconden: nieuwe.isTijdgebonden ? (vorigeSet?.seconden ?? nieuwe.repMin) : undefined,
        voltooid: false,
        isOpwarm: false,
        isPR: false,
        prSoorten: [],
        ronde: oud.ronde,
      }
    })
    return {
      ...entry,
      exerciseId: nieuwe.id,
      exerciseNaam: nieuwe.naam,
      sets,
      overgeslagen: false,
      vervangtExerciseId: oudeExerciseId,
    }
  })

  await db.sessions.put({ ...sessie, entries })
}

/** Voegt een losse oefening toe aan de lopende training. */
export async function voegOefeningToeAanSessie(
  sessieId: string,
  exerciseId: string,
): Promise<void> {
  const sessie = await db.sessions.get(sessieId)
  if (sessie === undefined) return
  if (sessie.entries.some((e) => e.exerciseId === exerciseId)) return
  const oefening = await db.exercises.get(exerciseId)
  if (oefening === undefined) return

  const vorige = await haalVorigeSets(exerciseId)
  const sets: SetLog[] = Array.from({ length: oefening.standaardSets }, (_, i) => {
    const vorigeSet = vorige[i] ?? vorige.at(-1)
    return {
      gewichtKg: vorigeSet?.gewichtKg ?? 0,
      reps: vorigeSet?.reps ?? oefening.repMin,
      seconden: oefening.isTijdgebonden ? (vorigeSet?.seconden ?? oefening.repMin) : undefined,
      voltooid: false,
      isOpwarm: false,
      isPR: false,
      prSoorten: [],
    }
  })

  const entries: SessionEntry[] = [
    ...sessie.entries,
    {
      exerciseId,
      exerciseNaam: oefening.naam,
      volgorde: sessie.entries.length,
      sets,
      notitie: '',
      overgeslagen: false,
    },
  ]

  await db.sessions.put({ ...sessie, entries })
}

export async function wijzigSessieNotitie(sessieId: string, notitie: string): Promise<void> {
  await db.sessions.update(sessieId, { sessieNotitie: notitie })
}

export async function rondSessieAf(sessieId: string): Promise<void> {
  const sessie = await db.sessions.get(sessieId)
  if (sessie === undefined) return

  // Sets die je niet hebt afgevinkt horen niet in je historie thuis.
  const entries = sessie.entries.map((entry) => ({
    ...entry,
    sets: entry.sets.filter((s) => s.voltooid),
  }))

  await db.sessions.put({
    ...sessie,
    entries,
    status: 'afgerond',
    eindTijd: new Date().toISOString(),
  })

  for (const entry of entries) {
    await herberekenPrs(entry.exerciseId)
  }
}

export async function verwijderSessie(sessieId: string): Promise<void> {
  await db.sessions.delete(sessieId)
}

/**
 * Loopt de hele historie van één oefening opnieuw na en zet de PR-markeringen
 * goed. Dat doen we na elke wijziging, zodat het beeld altijd klopt — ook als
 * je achteraf een set corrigeert of verwijdert.
 */
export async function herberekenPrs(exerciseId: string): Promise<void> {
  const oefening = await db.exercises.get(exerciseId)
  if (oefening === undefined) return

  const historie = await haalHistorieVanOefening(exerciseId)
  const treffers = new Map(bepaalPrs(oefening, historie).map((t) => [t.sleutel, t.soorten]))

  const teWijzigen = new Map<string, Session>()
  for (const item of historie) {
    const [sessieId, entryIndexTekst, setIndexTekst] = item.sleutel.split(':')
    if (sessieId === undefined || entryIndexTekst === undefined || setIndexTekst === undefined) {
      continue
    }
    const soorten = treffers.get(item.sleutel) ?? []
    const isPR = soorten.length > 0
    if (item.set.isPR === isPR && item.set.prSoorten.length === soorten.length) continue

    const sessie = teWijzigen.get(sessieId) ?? (await db.sessions.get(sessieId))
    if (sessie === undefined) continue

    const entryIndex = Number(entryIndexTekst)
    const setIndex = Number(setIndexTekst)
    const entries = sessie.entries.map((entry, ei) => {
      if (ei !== entryIndex) return entry
      const sets = entry.sets.map((set, si) =>
        si === setIndex ? { ...set, isPR, prSoorten: soorten } : set,
      )
      return { ...entry, sets }
    })
    teWijzigen.set(sessieId, { ...sessie, entries })
  }

  if (teWijzigen.size > 0) {
    await db.sessions.bulkPut([...teWijzigen.values()])
  }
}

// ── Lichaamsgewicht en omtrekmaten ───────────────────────────────────────

export async function bewaarWeging(weging: BodyWeight): Promise<void> {
  await db.bodyWeights.put(weging)
}

export async function verwijderWeging(datum: IsoDatum): Promise<void> {
  await db.bodyWeights.delete(datum)
}

export async function bewaarMeting(meting: Measurement): Promise<void> {
  await db.measurements.put(meting)
}

export async function verwijderMeting(datum: IsoDatum): Promise<void> {
  await db.measurements.delete(datum)
}
