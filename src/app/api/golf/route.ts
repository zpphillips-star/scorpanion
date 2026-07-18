import { NextRequest } from 'next/server'

export const runtime = 'edge'

interface GolfPlayer {
  rank: number
  name: string
  country: string
  score: string        // e.g. "-12", "E", "+3"
  today: string        // today's round score
  thru: string         // holes completed e.g. "F", "14", "–"
  status: 'active' | 'cut' | 'wd' | 'complete'
}

interface GolfTournament {
  id: string
  name: string
  course: string
  location: string
  status: 'pre' | 'in' | 'post'
  round: number
  totalRounds: number
  startDate: string
  endDate: string
  leaders: GolfPlayer[]
  purse?: string
}

async function fetchTour(slug: string): Promise<GolfTournament | null> {
  try {
    const url = `https://site.api.espn.com/apis/site/v2/sports/golf/${slug}/scoreboard`
    const res = await fetch(url, { next: { revalidate: 120 } })
    if (!res.ok) return null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = await res.json()

    const events = data.events ?? []
    if (events.length === 0) return null

    // Most relevant event (first one, usually the active tournament)
    const event = events[0]
    const comp = event.competitions?.[0]
    if (!comp) return null

    const venue = comp.venue ?? {}
    const status = event.status?.type?.state ?? 'pre'  // 'pre' | 'in' | 'post'
    const round = comp.status?.period ?? 1
    const totalRounds = 4

    const leaders: GolfPlayer[] = (comp.competitors ?? []).map((c: any) => {
      const stats = c.statistics ?? []
      const scoreStat = stats.find((s: any) => s.name === 'scoreToPar' || s.abbreviation === 'STP')
      const todayStat = stats.find((s: any) => s.name === 'roundScore' || s.abbreviation === 'RS')
      const thruStat  = stats.find((s: any) => s.name === 'holesPlayed' || s.abbreviation === 'HP')

      const rawScore = scoreStat?.displayValue ?? c.score ?? 'E'
      const rawToday = todayStat?.displayValue ?? ''
      const rawThru  = thruStat?.displayValue ?? '–'

      const fmtScore = (v: string) => {
        if (!v || v === 'E' || v === '--') return v || 'E'
        const n = Number(v)
        if (isNaN(n)) return v
        if (n === 0) return 'E'
        return n > 0 ? `+${n}` : `${n}`
      }

      return {
        rank: c.order ?? 0,
        name: c.athlete?.displayName ?? c.athlete?.fullName ?? 'Unknown',
        country: c.athlete?.flag?.alt ?? '',
        score: fmtScore(rawScore),
        today: fmtScore(rawToday),
        thru: rawThru === '18' ? 'F' : rawThru,
        status: c.status?.type?.name === 'Withdrawn' ? 'wd'
          : c.status?.type?.name === 'Cut' ? 'cut'
          : status === 'post' ? 'complete' : 'active',
      }
    }).filter((p: GolfPlayer) => p.status !== 'wd') // keep cut players, remove WD only

    return {
      id: event.id,
      name: event.name ?? event.shortName ?? 'Tournament',
      course: venue.fullName ?? venue.name ?? '',
      location: venue.address?.city ? `${venue.address.city}, ${venue.address.state ?? ''}`.trim().replace(/,$/, '') : '',
      status: status === 'pre' ? 'pre' : status === 'in' ? 'in' : 'post',
      round,
      totalRounds,
      startDate: event.date ?? '',
      endDate: event.endDate ?? '',
      leaders,
      purse: event.competitions?.[0]?.purse ?? undefined,
    }
  } catch {
    return null
  }
}

export async function GET(req: NextRequest) {
  const tour = new URL(req.url).searchParams.get('tour') ?? 'pga'
  const mode = new URL(req.url).searchParams.get('mode') ?? 'current'
  const slug = tour === 'lpga' ? 'lpga' : 'pga'

  // Schedule mode: return all tournaments for the season (for calendar dots)
  if (mode === 'schedule') {
    try {
      const url = `https://site.api.espn.com/apis/site/v2/sports/golf/${slug}/scoreboard`
      const res = await fetch(url, { next: { revalidate: 3600 } })
      if (!res.ok) return Response.json([], { status: 200 })
      const data: any = await res.json()
      const calendar: any[] = data.leagues?.[0]?.calendar ?? []
      const tournaments = calendar.map((entry: any) => ({
        id: entry.id,
        name: entry.label ?? entry.name ?? 'Tournament',
        startDate: entry.startDate ?? '',
        endDate: entry.endDate ?? entry.startDate ?? '',
      })).filter((t: any) => t.startDate)
      return Response.json(tournaments)
    } catch {
      return Response.json([])
    }
  }

  const result = await fetchTour(slug)
  if (!result) return Response.json({ error: 'No active tournament' }, { status: 404 })
  return Response.json(result)
}
