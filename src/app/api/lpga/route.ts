/* eslint-disable @typescript-eslint/no-explicit-any */
export const runtime = 'edge'

export interface PGAPlayer {
  position: string
  name: string
  shortName: string
  totalScore: string   // e.g. "-12", "+3", "E"
  todayScore: string   // today's round e.g. "-4"
  thru: string         // "F" | "14" | "F*" (WD)
  country?: string
  isAmateur?: boolean
}

export interface PGATournament {
  id: string
  name: string
  shortName: string
  course: string
  location: string
  roundLabel: string    // "Round 3" | "Final" | "Preview"
  status: 'upcoming' | 'live' | 'completed'
  startDate: string
  endDate: string
  purse?: string
  leaders: PGAPlayer[]
  cutLine?: string
}

function parsePar(raw: string | undefined | null): string {
  if (!raw && raw !== '0') return 'E'
  const n = Number(raw)
  if (isNaN(n)) return raw ?? 'E'
  if (n === 0) return 'E'
  return n > 0 ? `+${n}` : `${n}`
}

export async function GET() {
  try {
    const [scoreboardRes, schedulerRes] = await Promise.allSettled([
      fetch('https://site.api.espn.com/apis/site/v2/sports/golf/lpga/scoreboard', { cache: 'no-store' }),
      fetch('https://site.api.espn.com/apis/site/v2/sports/golf/lpga/schedule', { cache: 'no-store' }),
    ])

    const tournaments: PGATournament[] = []

    if (scoreboardRes.status === 'fulfilled' && scoreboardRes.value.ok) {
      const data = await scoreboardRes.value.json()

      for (const event of (data.events ?? []).slice(0, 2)) {
        const comp = event.competitions?.[0]
        if (!comp) continue

        const statusName: string = comp.status?.type?.name ?? event.status?.type?.name ?? ''
        let status: 'upcoming' | 'live' | 'completed' = 'upcoming'
        if (statusName === 'STATUS_IN_PROGRESS') status = 'live'
        else if (statusName === 'STATUS_FINAL' || comp.status?.type?.completed) status = 'completed'

        const period: number = comp.status?.period ?? 0
        let roundLabel = 'Preview'
        if (status === 'live') roundLabel = `Round ${period} — Live`
        else if (status === 'completed') roundLabel = 'Final'
        else if (period > 0) roundLabel = `Round ${period}`

        const venue = event.venue ?? comp.venue ?? {}
        const course = venue.fullName ?? ''
        const addr = venue.address ?? {}
        const location = [addr.city, addr.state ?? addr.country].filter(Boolean).join(', ')

        // Parse leaders — sorted by position
        const rawPlayers: any[] = (comp.competitors ?? [])
          .filter((c: any) => c.status !== 'cut' && c.status !== 'wd')
          .slice(0, 15)

        const leaders: PGAPlayer[] = rawPlayers.map((c: any) => {
          const athlete = c.athlete ?? {}
          // totalScore: c.score is total to par as string
          const totalRaw = c.score ?? c.scoreToParTotal ?? ''
          const todayRaw = c.linescores?.[period - 1]?.value ?? c.scoreToParToday ?? ''
          const thru = c.status === 'active'
            ? (comp.status?.displayClock ?? c.thru ?? '')
            : (c.status === 'complete' ? 'F' : c.thru ?? '')

          return {
            position: c.status === 'cut' ? 'CUT' : (c.standing?.displayValue ?? c.position?.displayValue ?? '—'),
            name: athlete.displayName ?? c.displayName ?? 'Unknown',
            shortName: athlete.shortName ?? athlete.displayName ?? 'Unknown',
            totalScore: parsePar(totalRaw),
            todayScore: parsePar(todayRaw),
            thru: thru || '—',
            country: athlete.flag?.alt ?? athlete.countryFlag?.alt,
          }
        })

        // Sort by position (numeric first, then ties, then —)
        leaders.sort((a, b) => {
          const posA = parseInt(a.position.replace(/\D/g, '')) || 999
          const posB = parseInt(b.position.replace(/\D/g, '')) || 999
          return posA - posB
        })

        tournaments.push({
          id: event.id,
          name: event.name,
          shortName: event.shortName ?? event.name,
          course,
          location,
          roundLabel,
          status,
          startDate: event.date ?? '',
          endDate: event.endDate ?? '',
          purse: event.prize ?? event.purse,
          leaders: leaders.slice(0, 10),
          cutLine: comp.notes?.[0]?.headline,
        })
      }
    }

    // If no active/recent tourney, try to get next scheduled event name
    if (tournaments.length === 0 && schedulerRes.status === 'fulfilled' && schedulerRes.value.ok) {
      const sched = await schedulerRes.value.json()
      const next = (sched.events ?? []).find((e: any) => {
        const start = new Date(e.date ?? '')
        return start >= new Date()
      })
      if (next) {
        tournaments.push({
          id: next.id,
          name: next.name,
          shortName: next.shortName ?? next.name,
          course: next.venue?.fullName ?? '',
          location: '',
          roundLabel: 'Upcoming',
          status: 'upcoming',
          startDate: next.date ?? '',
          endDate: next.endDate ?? '',
          leaders: [],
        })
      }
    }

    return Response.json(tournaments)
  } catch (e) {
    return Response.json([], { status: 200 })
  }
}
