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

/** Fetch course name + location from ESPN core API for a given LPGA event ID */
async function fetchVenueInfo(eventId: string): Promise<{ course: string; location: string }> {
  try {
    const r = await fetch(
      `https://sports.core.api.espn.com/v2/sports/golf/leagues/lpga/events/${eventId}`,
      { cache: 'no-store' }
    )
    if (!r.ok) return { course: '', location: '' }
    const d = await r.json()
    const courseObj = Array.isArray(d.courses) ? d.courses[0] : d.courses
    const courseName: string = courseObj?.name ?? ''
    const addr = courseObj?.address ?? {}
    const location = [addr.city, addr.state ?? addr.country].filter(Boolean).join(', ')
    return { course: courseName, location }
  } catch {
    return { course: '', location: '' }
  }
}

export async function GET() {
  try {
    const nextWeekDate = new Date()
    nextWeekDate.setDate(nextWeekDate.getDate() + 7)
    const nextWeekStr = nextWeekDate.toISOString().slice(0, 10).replace(/-/g, '')

    const [scoreboardRes, nextWeekRes] = await Promise.allSettled([
      fetch('https://site.api.espn.com/apis/site/v2/sports/golf/lpga/scoreboard', { cache: 'no-store' }),
      fetch(`https://site.api.espn.com/apis/site/v2/sports/golf/lpga/scoreboard?dates=${nextWeekStr}`, { cache: 'no-store' }),
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

        // ESPN scoreboard has null venue — fetch from core API
        const { course, location } = await fetchVenueInfo(event.id)

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

    // If no active or upcoming tourney found in the current scoreboard,
    // look for the next scheduled event in the look-ahead scoreboard.
    const hasActiveOrUpcoming = tournaments.some(t => t.status === 'live' || t.status === 'upcoming')
    if (!hasActiveOrUpcoming && nextWeekRes.status === 'fulfilled' && nextWeekRes.value.ok) {
      const nextData = await nextWeekRes.value.json()
      const next = (nextData.events ?? []).find((e: any) => {
        const comp = e.competitions?.[0]
        const statusName: string = comp?.status?.type?.name ?? ''
        return statusName !== 'STATUS_FINAL' && !comp?.status?.type?.completed
      })
      if (next) {
        const { course, location } = await fetchVenueInfo(next.id)
        tournaments.push({
          id: next.id,
          name: next.name,
          shortName: next.shortName ?? next.name,
          course,
          location,
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
