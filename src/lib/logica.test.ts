import { describe, expect, it } from 'vitest'

import type { Exercise, SetLog } from '../db/types'
import { berekenAdvies, vorigeUitvoeringUitSets } from './progression'
import { bepaalPrs, epley, type SetMetContext } from './pr'
import { berekenSchijven } from './plates'
import { analyseerTempo, metWeekGemiddelde } from './bodyweight'
import { isDeloadWeek, maandagVan, programmaWeek } from './date'
import { normaliseerYoutube } from './youtube'
import { bepaalThema, themaLabel } from './thema'
import { tellSetsPerSpiergroep } from './volume'
import type { Session } from '../db/types'

/**
 * Deze tests bewaken de getallen waar de app je op laat sturen: het
 * progressieadvies, je records, je schijven en je weekgemiddelde.
 * Draaien met:  npm test
 */

function oefening(patch: Partial<Exercise> = {}): Exercise {
  return {
    id: 'ex1',
    naam: 'Testoefening',
    spiergroepPrimair: 'borst',
    spiergroepenSecundair: [],
    materiaal: 'halter',
    standaardSets: 3,
    repMin: 8,
    repMax: 10,
    rustSeconden: 120,
    gewichtsstapKg: 2.5,
    isLichaamsgewicht: false,
    isTijdgebonden: false,
    isUnilateraal: false,
    youtubeUrl: '',
    aandachtspunt: '',
    notitie: '',
    gearchiveerd: false,
    aangemaaktOp: '2026-01-01T00:00:00.000Z',
    gewijzigdOp: '2026-01-01T00:00:00.000Z',
    ...patch,
  }
}

function set(patch: Partial<SetLog> = {}): SetLog {
  return {
    gewichtKg: 60,
    reps: 8,
    voltooid: true,
    isOpwarm: false,
    isPR: false,
    prSoorten: [],
    ...patch,
  }
}

describe('dubbele progressie', () => {
  it('adviseert meer gewicht als alle sets de bovenkant haalden', () => {
    const oef = oefening()
    const vorige = vorigeUitvoeringUitSets(oef, [
      set({ reps: 10 }),
      set({ reps: 10 }),
      set({ reps: 10 }),
    ])
    const advies = berekenAdvies(oef, vorige, 3)
    expect(advies.soort).toBe('gewicht-omhoog')
    expect(advies.gewichtKg).toBe(62.5)
    expect(advies.perSet).toEqual([8, 8, 8])
  })

  it('adviseert één herhaling meer als de bovenkant nog niet gehaald is', () => {
    const oef = oefening()
    const vorige = vorigeUitvoeringUitSets(oef, [
      set({ reps: 9 }),
      set({ reps: 8 }),
      set({ reps: 8 }),
    ])
    const advies = berekenAdvies(oef, vorige, 3)
    expect(advies.soort).toBe('reps-omhoog')
    expect(advies.gewichtKg).toBe(60)
    expect(advies.perSet).toEqual([10, 9, 9])
  })

  it('gaat met het advies nooit boven het maximum van het bereik uit', () => {
    const oef = oefening({ repMin: 5, repMax: 8 })
    const vorige = vorigeUitvoeringUitSets(oef, [
      set({ reps: 8 }),
      set({ reps: 8 }),
      set({ reps: 7 }),
    ])
    const advies = berekenAdvies(oef, vorige, 3)
    expect(advies.perSet).toEqual([8, 8, 8])
  })

  it('geeft bij een eerste keer geen gewicht maar een uitleg', () => {
    const advies = berekenAdvies(oefening(), null, 3)
    expect(advies.soort).toBe('eerste-keer')
    expect(advies.gewichtKg).toBeNull()
    expect(advies.tekst).toContain('2-3 herhalingen over')
  })

  it('adviseert bij een tijdgebonden lichaamsgewichtsoefening om hem zwaarder te maken', () => {
    const oef = oefening({
      isTijdgebonden: true,
      isLichaamsgewicht: true,
      repMin: 20,
      repMax: 40,
      standaardSets: 3,
    })
    const vorige = vorigeUitvoeringUitSets(oef, [
      set({ gewichtKg: 0, seconden: 40 }),
      set({ gewichtKg: 0, seconden: 40 }),
      set({ gewichtKg: 0, seconden: 40 }),
    ])
    const advies = berekenAdvies(oef, vorige, 3)
    expect(advies.soort).toBe('zwaarder-maken')
    expect(advies.gewichtKg).toBeNull()
  })

  it('telt alleen de sets mee die vandaag op het programma staan', () => {
    const oef = oefening()
    // Vorige keer vier sets gedaan terwijl er vandaag drie staan.
    const vorige = vorigeUitvoeringUitSets(oef, [
      set({ reps: 10 }),
      set({ reps: 10 }),
      set({ reps: 10 }),
      set({ reps: 6 }),
    ])
    expect(berekenAdvies(oef, vorige, 3).soort).toBe('gewicht-omhoog')
  })
})

describe('persoonlijke records', () => {
  const maakHistorie = (sets: SetLog[]): SetMetContext[] =>
    sets.map((s, i) => ({
      sleutel: `ses:0:${i}`,
      datum: `2026-01-0${i + 1}`,
      sessieId: 'ses',
      set: s,
    }))

  it('rekent de geschatte 1RM volgens Epley', () => {
    expect(epley(100, 5)).toBeCloseTo(116.667, 2)
    expect(epley(0, 5)).toBe(0)
  })

  it('markeert zowel het zwaarste gewicht als de beste geschatte 1RM', () => {
    const treffers = bepaalPrs(
      oefening(),
      maakHistorie([
        set({ gewichtKg: 60, reps: 8 }),
        set({ gewichtKg: 60, reps: 10 }),
        set({ gewichtKg: 65, reps: 6 }),
      ]),
    )
    expect(treffers[0]?.soorten).toEqual(['gewicht', 'e1rm'])
    expect(treffers[1]?.soorten).toEqual(['e1rm'])
    expect(treffers[2]?.soorten).toEqual(['gewicht'])
  })

  it('telt opwarmsets en niet-voltooide sets niet mee', () => {
    const treffers = bepaalPrs(
      oefening(),
      maakHistorie([
        set({ gewichtKg: 200, isOpwarm: true }),
        set({ gewichtKg: 300, voltooid: false }),
        set({ gewichtKg: 60 }),
      ]),
    )
    expect(treffers).toHaveLength(1)
  })

  it('gebruikt bij tijdgebonden oefeningen de langste tijd', () => {
    const treffers = bepaalPrs(
      oefening({ isTijdgebonden: true, isLichaamsgewicht: true }),
      maakHistorie([
        set({ gewichtKg: 0, seconden: 30 }),
        set({ gewichtKg: 0, seconden: 25 }),
        set({ gewichtKg: 0, seconden: 45 }),
      ]),
    )
    expect(treffers.map((t) => t.soorten)).toEqual([['tijd'], ['tijd']])
  })

  it('rekent bij lichaamsgewicht met extra gewicht en herhalingen', () => {
    const treffers = bepaalPrs(
      oefening({ isLichaamsgewicht: true, repMin: 5, repMax: 8 }),
      maakHistorie([
        set({ gewichtKg: 0, reps: 6 }),
        set({ gewichtKg: 0, reps: 8 }),
        set({ gewichtKg: 5, reps: 5 }),
      ]),
    )
    // Eerste keer op lichaamsgewicht: alleen een gewichtsrecord, geen dubbele melding.
    expect(treffers[0]?.soorten).toEqual(['gewicht'])
    // Zelfde gewicht, meer herhalingen: nu wel een repsrecord.
    expect(treffers[1]?.soorten).toEqual(['reps'])
    // Voor het eerst met extra gewicht: weer een gewichtsrecord.
    expect(treffers[2]?.soorten).toEqual(['gewicht'])
  })
})

describe('schijvencalculator', () => {
  const schijven = [25, 20, 15, 10, 5, 2.5, 1.25]

  it('verdeelt een haalbaar gewicht over beide kanten', () => {
    const r = berekenSchijven(100, 20, schijven)
    expect(r.haalbaarGewicht).toBe(100)
    expect(r.isBenadering).toBe(false)
    expect(r.perKant).toEqual([{ schijf: 25, aantal: 1 }, { schijf: 15, aantal: 1 }])
  })

  it('geeft het dichtstbijzijnde haalbare gewicht als het exact niet kan', () => {
    const r = berekenSchijven(61, 20, schijven)
    expect(r.isBenadering).toBe(true)
    expect(r.haalbaarGewicht).toBe(60)
  })

  it('waarschuwt als het doel onder het stanggewicht ligt', () => {
    const r = berekenSchijven(15, 20, schijven)
    expect(r.waarschuwing).not.toBeNull()
    expect(r.haalbaarGewicht).toBe(20)
  })

  it('geeft een lege stang terug bij precies het stanggewicht', () => {
    const r = berekenSchijven(20, 20, schijven)
    expect(r.perKant).toEqual([])
    expect(r.isBenadering).toBe(false)
  })
})

describe('programmaweek en deload', () => {
  it('telt week 1 vanaf de week van de startdatum', () => {
    expect(programmaWeek('2026-01-05', '2026-01-05')).toBe(1)
    expect(programmaWeek('2026-01-05', '2026-01-11')).toBe(1)
    expect(programmaWeek('2026-01-05', '2026-01-12')).toBe(2)
  })

  it('herkent een deloadweek', () => {
    expect(isDeloadWeek(13, [13, 26, 39])).toBe(true)
    expect(isDeloadWeek(14, [13, 26, 39])).toBe(false)
  })

  it('laat de week op maandag beginnen', () => {
    // 4 september 2026 is een vrijdag.
    expect(maandagVan('2026-09-04')).toBe('2026-08-31')
    expect(maandagVan('2026-08-31')).toBe('2026-08-31')
    // Zondag hoort nog bij de week ervoor.
    expect(maandagVan('2026-09-06')).toBe('2026-08-31')
  })
})

describe('lichaamsgewicht', () => {
  it('berekent een lopend gemiddelde over zeven dagen', () => {
    const punten = metWeekGemiddelde([
      { datum: '2026-01-01', gewichtKg: 80 },
      { datum: '2026-01-02', gewichtKg: 82 },
    ])
    expect(punten[1]?.weekGemiddelde).toBe(81)
  })

  it('beoordeelt het tempo tegen het doel', () => {
    const wegingen = Array.from({ length: 15 }, (_, i) => ({
      datum: `2026-01-${String(i + 1).padStart(2, '0')}`,
      // Ongeveer 0,3 kg per week omlaag.
      gewichtKg: 90 - i * (0.3 / 7),
    }))
    const analyse = analyseerTempo(metWeekGemiddelde(wegingen), 'afvallen', 0.2, 0.4)
    expect(analyse.oordeel).toBe('op-schema')
    expect(analyse.veranderingKgPerWeek).toBeLessThan(0)
  })

  it('signaleert dat je de verkeerde kant op gaat', () => {
    const wegingen = Array.from({ length: 15 }, (_, i) => ({
      datum: `2026-01-${String(i + 1).padStart(2, '0')}`,
      gewichtKg: 90 + i * 0.1,
    }))
    const analyse = analyseerTempo(metWeekGemiddelde(wegingen), 'afvallen', 0.2, 0.4)
    expect(analyse.oordeel).toBe('verkeerde-kant')
  })
})

describe('sets per spiergroep', () => {
  it('telt de primaire spiergroep heel en de secundaire half', () => {
    const oefeningen = new Map([
      ['ex1', oefening({ id: 'ex1', spiergroepPrimair: 'borst', spiergroepenSecundair: ['triceps'] })],
    ])
    const sessie: Session = {
      id: 'ses',
      templateId: 'tpl',
      templateLabel: 'Dag A',
      datum: '2026-01-01',
      startTijd: '2026-01-01T10:00:00.000Z',
      status: 'afgerond',
      sessieNotitie: '',
      programmaWeek: 1,
      isDeload: false,
      entries: [
        {
          exerciseId: 'ex1',
          exerciseNaam: 'Testoefening',
          volgorde: 0,
          notitie: '',
          overgeslagen: false,
          sets: [set(), set(), set({ isOpwarm: true })],
        },
      ],
    }
    const telling = tellSetsPerSpiergroep([sessie], oefeningen)
    expect(telling.get('borst')).toBe(2)
    expect(telling.get('triceps')).toBe(1)
  })
})

describe('youtube-links', () => {
  it('maakt van alle gangbare vormen één werkende link', () => {
    const verwacht = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
    expect(normaliseerYoutube('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(verwacht)
    expect(normaliseerYoutube('https://youtu.be/dQw4w9WgXcQ')).toBe(verwacht)
    expect(normaliseerYoutube('https://www.youtube.com/shorts/dQw4w9WgXcQ')).toBe(verwacht)
    expect(normaliseerYoutube('youtube.com/watch?v=dQw4w9WgXcQ&t=30s')).toBe(verwacht)
    expect(normaliseerYoutube('m.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(verwacht)
  })

  it('herkent iets dat geen YouTube-link is', () => {
    expect(normaliseerYoutube('https://vimeo.com/12345')).toBeNull()
    expect(normaliseerYoutube('zomaar wat tekst')).toBeNull()
    expect(normaliseerYoutube('')).toBeNull()
  })
})

describe('thema', () => {
  it('respecteert een vastgezette keuze', () => {
    expect(bepaalThema('licht')).toBe('licht')
    expect(bepaalThema('donker')).toBe('donker')
  })

  it('valt terug op donker als het toestel geen voorkeur kan doorgeven', () => {
    // In deze testomgeving bestaat matchMedia niet. Donker is dan de veilige
    // uitkomst: liever te donker in de sportschool dan een lichtflits.
    expect(bepaalThema('systeem')).toBe('donker')
  })

  it('geeft elke keuze een leesbaar label', () => {
    expect(themaLabel('systeem')).toBe('Volg systeem')
    expect(themaLabel('licht')).toBe('Licht')
    expect(themaLabel('donker')).toBe('Donker')
  })
})
