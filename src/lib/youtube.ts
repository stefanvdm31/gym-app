/**
 * YouTube-links.
 *
 * We laden nooit een video in de app zelf: dat kost data en werkt niet
 * offline. We normaliseren de link alleen naar één vorm die je telefoon in de
 * YouTube-app of in een nieuw tabblad opent.
 */

/** Haalt de video-id uit alle gangbare YouTube-vormen. Null als het geen YouTube-link is. */
export function videoId(invoer: string): string | null {
  const tekst = invoer.trim()
  if (tekst === '') return null

  // Alleen de id geplakt.
  if (/^[\w-]{11}$/.test(tekst)) return tekst

  let url: URL
  try {
    url = new URL(tekst.startsWith('http') ? tekst : `https://${tekst}`)
  } catch {
    return null
  }

  const host = url.hostname.replace(/^www\./, '').replace(/^m\./, '')

  if (host === 'youtu.be') {
    const id = url.pathname.slice(1).split('/')[0] ?? ''
    return /^[\w-]{11}$/.test(id) ? id : null
  }

  if (host === 'youtube.com' || host === 'youtube-nocookie.com' || host === 'music.youtube.com') {
    const vParam = url.searchParams.get('v')
    if (vParam !== null && /^[\w-]{11}$/.test(vParam)) return vParam

    const delen = url.pathname.split('/').filter((d) => d !== '')
    // /shorts/<id>, /embed/<id>, /live/<id>, /v/<id>
    if (delen.length >= 2 && ['shorts', 'embed', 'live', 'v'].includes(delen[0] ?? '')) {
      const id = delen[1] ?? ''
      return /^[\w-]{11}$/.test(id) ? id : null
    }
  }

  return null
}

/** Eén werkende link, of null als de invoer geen YouTube-link is. */
export function normaliseerYoutube(invoer: string): string | null {
  const id = videoId(invoer)
  return id === null ? null : `https://www.youtube.com/watch?v=${id}`
}

/** Foutmelding voor in het bewerkscherm, of null als de invoer klopt (leeg mag). */
export function youtubeFout(invoer: string): string | null {
  if (invoer.trim() === '') return null
  return normaliseerYoutube(invoer) === null
    ? 'Dit lijkt geen YouTube-link. Plak een link als youtube.com/watch?v=..., youtu.be/... of een /shorts/-link'
    : null
}
