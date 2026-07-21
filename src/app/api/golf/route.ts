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
    // No server-side cache — client polls on its own interval; always serve fresh data
    const res = await fetch(url, { cache: 'no-store' })
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
    // currentRound comes from the competition status (e.g. period=3 = "Round 3")
    const currentRound = comp.status?.period ?? 1
    const round = currentRound
    const totalRounds = 4

    const fmtScore = (v: string | number | null | undefined): string => {
      if (v == null || v === '' || v === 'E' || v === '--') return (v as string) || 'E'
      const n = Number(v)
      if (isNaN(n)) return String(v)
      if (n === 0) return 'E'
      return n > 0 ? `+${n}` : `${n}`
    }

    const leaders: GolfPlayer[] = (comp.competitors ?? []).map((c: any) => {
      // Total score: ESPN provides c.score as a number (e.g. -10), not via statistics
      const rawScore = c.score ?? 'E'

      // Round-by-round linescores: one object per round, each has .displayValue (score to par)
      // and an inner .linescores array (one entry per hole completed)
      const roundLinescores: any[] = c.linescores ?? []

      // Today's linescore = the entry matching the current round
      const todayLs = roundLinescores.find((ls: any) => ls.period === currentRound)
      const rawToday = todayLs?.displayValue ?? ''

      // Thru: count completed holes in today's round inner array
      const holesCompleted: number = todayLs?.linescores?.length ?? 0
      const thru = holesCompleted >= 18 ? 'F'
        : holesCompleted > 0 ? String(holesCompleted)
        : '–'

      // Cut detection: player has no linescore data for the current round (round 3+)
      const hasTodayData = todayLs != null && (todayLs.displayValue != null || holesCompleted > 0)
      const playerIsCut = currentRound > 2 && roundLinescores.length > 0 && !hasTodayData

      return {
        rank: c.order ?? 0,
        name: c.athlete?.displayName ?? c.athlete?.fullName ?? 'Unknown',
        country: c.athlete?.flag?.alt ?? '',
        score: fmtScore(rawScore),
        today: fmtScore(rawToday),
        thru,
        status: c.status?.type?.name === 'Withdrawn' ? 'wd'
          : (c.status?.type?.name === 'Cut' || playerIsCut) ? 'cut'
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

  // Schedule mode: return all tournaments for the season (for calendar dots).
  // Always fetch fresh — the Edge cache must never serve stale/empty data here,
  // because an empty calendar wipes ALL golf dots from every month at once.
  if (mode === 'schedule') {
    try {
      const url = `https://site.api.espn.com/apis/site/v2/sports/golf/${slug}/scoreboard`
      const res = await fetch(url, { cache: 'no-store' })
      if (!res.ok) {
        return Response.json(
          { error: `ESPN scoreboard returned ${res.status}`, tournaments: [] },
          { status: 502 }
        )
      }
      const data: any = await res.json()
      const calendar: any[] = data.leagues?.[0]?.calendar ?? []
      // Health-check: if ESPN returns an empty calendar, surface an error so we
      // catch regressions immediately rather than silently serving 0 dots.
      if (calendar.length === 0) {
        return Response.json(
          { error: `ESPN ${slug} calendar is empty — possible API shape change`, tournaments: [] },
          { status: 502 }
        )
      }
      const tournaments = calendar.map((entry: any) => ({
        id: entry.id,
        name: entry.label ?? entry.name ?? 'Tournament',
        startDate: entry.startDate ?? '',
        endDate: entry.endDate ?? entry.startDate ?? '',
      })).filter((t: any) => t.startDate)
      return Response.json(tournaments)
    } catch (err) {
      return Response.json(
        { error: `Schedule fetch failed: ${String(err)}`, tournaments: [] },
        { status: 502 }
      )
    }
  }

  // Rankings mode: FedEx Cup (PGA) or Race to CME Globe (LPGA) standings
  if (mode === 'rankings') {
    try {
      const url = `https://site.api.espn.com/apis/site/v2/sports/golf/${slug}/standings`
      const res = await fetch(url, { next: { revalidate: 3600 } })
      if (!res.ok) return Response.json([], { status: 200 })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data: any = await res.json()

      // ESPN standings shape varies; try several known paths
      const entries: any[] =
        data?.standings?.entries ??
        data?.content?.standings?.entries ??
        data?.standings?.groups?.[0]?.entries ??
        data?.entries ??
        []

      if (entries.length === 0) return Response.json([])

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rankings = entries.slice(0, 50).map((entry: any, idx: number) => {
        const athlete = entry.athlete ?? entry.competitor ?? entry.team ?? {}
        const stats: any[] = entry.stats ?? entry.statistics ?? []

        // Rank — prefer an explicit stat, fallback to array index
        const rankStat = stats.find((s: any) =>
          s.name === 'rank' || s.name === 'position' || s.shortDisplayName === 'RK'
        )
        const rank = rankStat
          ? (parseInt(rankStat.displayValue, 10) || idx + 1)
          : idx + 1

        // Points — FedEx or CME Globe points
        const pointsStat = stats.find((s: any) =>
          ['fedexPts', 'fedexPoints', 'points', 'raceToCMEPoints',
           'raceToGlobePoints', 'cmePts', 'seasonPoints'].includes(s.name)
        ) ?? stats.find((s: any) => s.displayValue && s.displayValue !== '0')
          ?? stats[0]

        // Optional earnings
        const earningStat = stats.find((s: any) =>
          ['earnings', 'totalEarnings', 'money', 'officialMoney'].includes(s.name)
        )

        return {
          rank,
          name: athlete.displayName ?? athlete.fullName ?? 'Unknown',
          country: athlete.flag?.alt ?? athlete.nationality ?? '',
          points: pointsStat?.displayValue ?? '',
          earnings: earningStat?.displayValue ?? undefined,
        }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      }).filter((p: any) => p.name && p.name !== 'Unknown')

      return Response.json(rankings)
    } catch {
      return Response.json([])
    }
  }

  const result = await fetchTour(slug)
  if (!result) return Response.json({ error: 'No active tournament' }, { status: 404 })
  return Response.json(result)
}
