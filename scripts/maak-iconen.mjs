/**
 * Maakt de app-iconen (PNG) voor het startscherm en het splash screen.
 *
 * Draai dit alleen als je het icoon wilt wijzigen:  node scripts/maak-iconen.mjs
 * De gemaakte bestanden staan in public/icons en gaan gewoon mee in git.
 */
import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'

const ACHTERGROND = [0x10, 0x10, 0x10, 0xff]
const ACCENT = [0x4c, 0x9f, 0xf0, 0xff]

function tekenIcoon(maat, { afgerond, schaal }) {
  const pixels = new Uint8Array(maat * maat * 4)

  const straal = afgerond ? maat * 0.22 : 0
  const binnenRand = (x, y) => {
    if (straal === 0) return true
    const cx = Math.min(Math.max(x, straal), maat - straal)
    const cy = Math.min(Math.max(y, straal), maat - straal)
    return (x - cx) ** 2 + (y - cy) ** 2 <= straal ** 2
  }

  // Halterfiguur, gedefinieerd op een raster van 512 en daarna geschaald.
  const e = (v) => (v / 512) * maat * schaal + (maat * (1 - schaal)) / 2
  const dik = (34 / 512) * maat * schaal
  const balken = [
    { x0: e(112), x1: e(400), y0: e(256) - dik / 2, y1: e(256) + dik / 2 },
    { x0: e(138) - dik / 2, x1: e(138) + dik / 2, y0: e(196), y1: e(316) },
    { x0: e(174) - dik / 2, x1: e(174) + dik / 2, y0: e(166), y1: e(346) },
    { x0: e(338) - dik / 2, x1: e(338) + dik / 2, y0: e(166), y1: e(346) },
    { x0: e(374) - dik / 2, x1: e(374) + dik / 2, y0: e(196), y1: e(316) },
  ]

  for (let y = 0; y < maat; y += 1) {
    for (let x = 0; x < maat; x += 1) {
      const i = (y * maat + x) * 4
      const binnen = binnenRand(x + 0.5, y + 0.5)
      const kleur = binnen ? ACHTERGROND : [0, 0, 0, 0]
      const opBalk =
        binnen &&
        balken.some((b) => x + 0.5 >= b.x0 && x + 0.5 <= b.x1 && y + 0.5 >= b.y0 && y + 0.5 <= b.y1)
      const gekozen = opBalk ? ACCENT : kleur
      pixels[i] = gekozen[0]
      pixels[i + 1] = gekozen[1]
      pixels[i + 2] = gekozen[2]
      pixels[i + 3] = gekozen[3]
    }
  }

  return pixels
}

function crc32(buf) {
  let c
  const tabel = []
  for (let n = 0; n < 256; n += 1) {
    c = n
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    tabel[n] = c >>> 0
  }
  let crc = 0xffffffff
  for (const byte of buf) crc = tabel[(crc ^ byte) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const lengte = Buffer.alloc(4)
  lengte.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([lengte, body, crc])
}

function naarPng(pixels, maat) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(maat, 0)
  ihdr.writeUInt32BE(maat, 4)
  ihdr[8] = 8 // bitdiepte
  ihdr[9] = 6 // RGBA
  const rijen = Buffer.alloc(maat * (maat * 4 + 1))
  for (let y = 0; y < maat; y += 1) {
    rijen[y * (maat * 4 + 1)] = 0
    Buffer.from(pixels.buffer, y * maat * 4, maat * 4).copy(
      rijen,
      y * (maat * 4 + 1) + 1,
    )
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(rijen, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

mkdirSync('public/icons', { recursive: true })

const bestanden = [
  { naam: 'icon-192.png', maat: 192, afgerond: true, schaal: 1 },
  { naam: 'icon-512.png', maat: 512, afgerond: true, schaal: 1 },
  { naam: 'icon-maskable-512.png', maat: 512, afgerond: false, schaal: 0.62 },
  { naam: 'apple-touch-icon.png', maat: 180, afgerond: false, schaal: 0.86 },
]

for (const { naam, maat, afgerond, schaal } of bestanden) {
  const pixels = tekenIcoon(maat, { afgerond, schaal })
  writeFileSync(`public/icons/${naam}`, naarPng(pixels, maat))
  console.log(`public/icons/${naam} (${maat}px)`)
}
