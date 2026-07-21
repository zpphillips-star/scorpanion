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
  /** ISO string of the first tee time for the current/next round. Only set when ESPN's
   *  competitions[0].timeValid === true (i.e. an actual scheduled start time exists). */
  firstTeeTime?: string
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
    const scoreboardRes = await fetch(
      'https://site.api.espn.com/apis/site/v2/sports/golf/lpga/scoreboard',
      { cache: 'no-store' }
    )

    // Health-check: surface ESPN failure as a 502 instead of silently returning [].
    if (!scoreboardRes.ok) {
      return Response.json(
        { error: `ESPN LPGA scoreboard returned ${scoreboardRes.status}`, tournaments: [] },
        { status: 502 }
      )
    }

    const data = await scoreboardRes.json()
    const tournaments: PGATournament[] = []

    // The season calendar in leagues[0].calendar has accurate startDate/endDate for every
    // scheduled event — use it for the look-ahead so we are never limited by a fixed window.
    const calendarEntries: { id: string; label: string; startDate: string; endDate: string }[] =
      (data.leagues?.[0]?.calendar ?? []).map((e: any) => ({
        id: e.id,
        label: e.label ?? e.name ?? '',
        startDate: e.startDate ?? '',
        endDate: e.endDate ?? '',
      }))

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

      const { course, location } = await fetchVenueInfo(event.id)

      const rawPlayers: any[] = (comp.competitors ?? [])
        .filter((c: any) => c.status !== 'cut' && c.status !== 'wd')
        .slice(0, 15)

      const leaders: PGAPlayer[] = rawPlayers.map((c: any) => {
        const athlete = c.athlete ?? {}
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
        // Only include tee time when ESPN confirms the time is valid.
        firstTeeTime: comp.timeValid === true ? (comp.startDate ?? comp.date ?? undefined) : undefined,
        // Note: LPGA Tour does not publish tee times via a PGA Tour-style public GraphQL API.
        // timeValid-false events correctly return undefined (no midnight-UTC placeholder leaks).
      })
    }

    // If no active or upcoming tourney in the current scoreboard, find the next
    // scheduled event using the season calendar (not a fixed ±7-day window, which
    // can miss events when LPGA has gaps > 7 days between tournaments).
    const hasActiveOrUpcoming = tournaments.some(t => t.status === 'live' || t.status === 'upcoming')
    if (!hasActiveOrUpcoming) {
      const now = new Date()
      const nextEntry = calendarEntries
        .filter(e => e.startDate && new Date(e.startDate) > now)
        .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())[0]

      if (nextEntry) {
        const dateStr = new Date(nextEntry.startDate).toISOString().slice(0, 10).replace(/-/g, '')
        let pushed = false
        try {
          const nextRes = await fetch(
            `https://site.api.espn.com/apis/site/v2/sports/golf/lpga/scoreboard?dates=${dateStr}`,
            { cache: 'no-store' }
          )
          if (nextRes.ok) {
            const nextData = await nextRes.json()
            const nextEvent = (nextData.events ?? []).find((e: any) => {
              const s: string = e.competitions?.[0]?.status?.type?.name ?? ''
              return s !== 'STATUS_FINAL' && !e.competitions?.[0]?.status?.type?.completed
            })
            if (nextEvent) {
              const { course, location } = await fetchVenueInfo(nextEvent.id)
              const nextComp = nextEvent.competitions?.[0]
              tournaments.push({
                id: nextEvent.id,
                name: nextEvent.name,
                shortName: nextEvent.shortName ?? nextEvent.name,
                course,
                location,
                roundLabel: 'Upcoming',
                status: 'upcoming',
                startDate: nextEvent.date ?? '',
                endDate: nextEvent.endDate ?? '',
                leaders: [],
                firstTeeTime: nextComp?.timeValid === true ? (nextComp.startDate ?? nextComp.date ?? undefined) : undefined,
              })
              pushed = true
            }
          }
        } catch { /* fall through to calendar stub */ }

        // Fallback: ESPN doesn't have event details yet — surface a calendar stub
        if (!pushed) {
          const { course, location } = await fetchVenueInfo(nextEntry.id)
          // ESPN calendar dates include Pro-Am day (Wed); shift +1 to show actual rounds (Thu–Sun)
          const shiftDay = (iso: string) => { const d = new Date(iso); d.setUTCDate(d.getUTCDate() + 1); return d.toISOString() }
          tournaments.push({
            id: nextEntry.id,
            name: nextEntry.label,
            shortName: nextEntry.label,
            course,
            location,
            roundLabel: 'Upcoming',
            status: 'upcoming',
            startDate: shiftDay(nextEntry.startDate),
            endDate: shiftDay(nextEntry.endDate),
            leaders: [],
          })
        }
      }
    }

    return Response.json(tournaments)
  } catch (e) {
    return Response.json(
      { error: `LPGA fetch failed: ${String(e)}`, tournaments: [] },
      { status: 500 }
    )
  }
}
