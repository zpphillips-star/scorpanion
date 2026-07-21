/* eslint-disable @typescript-eslint/no-explicit-any */
export const runtime = 'edge'

// ---------------------------------------------------------------------------
// PGA Tour GraphQL — real tee-time fallback when ESPN's timeValid is false
// ---------------------------------------------------------------------------
const PGA_GQL_URL = 'https://orchestrator.pgatour.com/graphql'
const PGA_GQL_KEY = 'da2-gsrx5bibzbb4njvhl7t37wqyl4' // public key used by pgatour.com

/** Return the earliest Round 1 tee-time ISO string for the PGA Tour tournament
 *  whose schedule start date falls within ±2 days of `espnEventDateISO`.
 *  Returns undefined on any error or when tee times haven't been posted yet. */
async function fetchPGATourFirstTeeTime(espnEventDateISO: string): Promise<string | undefined> {
  if (!espnEventDateISO) return undefined
  const year = espnEventDateISO.slice(0, 4)
  const eventDateMs = new Date(espnEventDateISO.slice(0, 10)).getTime()
  if (!year || isNaN(eventDateMs)) return undefined

  try {
    // Step 1: fetch schedule to map date → PGA Tour tournament ID
    const schedRes = await fetch(PGA_GQL_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': PGA_GQL_KEY },
      body: JSON.stringify({
        query: `{ schedule(tourCode: "R", year: "${year}") {
          upcoming { tournaments { id tournamentName startDate } }
          completed { tournaments { id tournamentName startDate } }
        } }`,
      }),
      cache: 'no-store',
    })
    if (!schedRes.ok) return undefined
    const schedData = await schedRes.json()
    const sched = schedData?.data?.schedule
    const allTourneys: any[] = [
      ...(sched?.upcoming?.flatMap((m: any) => m.tournaments ?? []) ?? []),
      ...(sched?.completed?.flatMap((m: any) => m.tournaments ?? []) ?? []),
    ]
    // Match by start date within ±2 days (handles Wed Pro-Am vs Thu first round offset)
    const match = allTourneys.find((t: any) => {
      const ms = typeof t.startDate === 'number' ? t.startDate : parseInt(t.startDate ?? '0')
      return Math.abs(ms - eventDateMs) < 2 * 86_400_000
    })
    if (!match?.id) return undefined

    // Step 2: fetch tee times for the matched tournament ID
    const ttRes = await fetch(PGA_GQL_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': PGA_GQL_KEY },
      body: JSON.stringify({
        query: `{ teeTimesV2(id: "${match.id}") {
          rounds { roundInt groups { teeTime } }
        } }`,
      }),
      cache: 'no-store',
    })
    if (!ttRes.ok) return undefined
    const ttData = await ttRes.json()
    const rounds: any[] = ttData?.data?.teeTimesV2?.rounds ?? []
    const r1 = rounds.find((r: any) => r.roundInt === 1)
    if (!r1?.groups?.length) return undefined

    const earliest: number = r1.groups
      .map((g: any) => (typeof g.teeTime === 'number' ? g.teeTime : 0))
      .filter((t: number) => t > 0)
      .sort((a: number, b: number) => a - b)[0]
    return earliest ? new Date(earliest).toISOString() : undefined
  } catch {
    return undefined
  }
}

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
  /** ISO string of the first tee time for the current/next round.
   *  Set from ESPN when timeValid === true, or from PGA Tour GraphQL (teeTimesV2)
   *  as a fallback when ESPN still has a midnight-UTC placeholder. */
  firstTeeTime?: string
}

function parsePar(raw: string | undefined | null): string {
  if (!raw && raw !== '0') return 'E'
  const n = Number(raw)
  if (isNaN(n)) return raw ?? 'E'
  if (n === 0) return 'E'
  return n > 0 ? `+${n}` : `${n}`
}

/** Fetch course name + location from ESPN core API for a given event ID */
async function fetchVenueInfo(eventId: string): Promise<{ course: string; location: string }> {
  try {
    const r = await fetch(
      `https://sports.core.api.espn.com/v2/sports/golf/leagues/pga/events/${eventId}`,
      { cache: 'no-store' }
    )
    if (!r.ok) return { course: '', location: '' }
    const d = await r.json()
    // courses can be an array or a single object
    const courseObj = Array.isArray(d.courses) ? d.courses[0] : d.courses
    const courseName: string = courseObj?.name ?? ''
    const addr = courseObj?.address ?? {}
    const location = [addr.city, addr.state ?? addr.country].filter(Boolean).join(', ')
    return { course: courseName, location }
  } catch {
    return { course: '', location: '' }
  }
}

/** Parse one ESPN scoreboard event object into a PGATournament. */
async function parseScoreboardEvent(event: any): Promise<PGATournament | null> {
  const comp = event.competitions?.[0]
  if (!comp) return null

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
    .slice(0, 100)

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

  return {
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
    leaders: leaders.slice(0, 50),
    cutLine: comp.notes?.[0]?.headline,
    // When ESPN's timeValid is true it provides the real competition start time.
    // When timeValid is false ESPN stores a midnight-UTC placeholder — fall back to
    // the PGA Tour GraphQL API which publishes actual tee times 2-3 days in advance.
    firstTeeTime: comp.timeValid === true
      ? (comp.startDate ?? comp.date ?? undefined)
      : (status === 'upcoming' ? await fetchPGATourFirstTeeTime(event.date ?? '') : undefined),
  }
}

export async function GET() {
  try {
    const scoreboardRes = await fetch(
      'https://site.api.espn.com/apis/site/v2/sports/golf/pga/scoreboard',
      { cache: 'no-store' }
    )

    const tournaments: PGATournament[] = []

    // Health-check: if ESPN returns non-OK, surface an error immediately so we
    // catch regressions rather than silently returning an empty list.
    if (!scoreboardRes.ok) {
      return Response.json(
        { error: `ESPN PGA scoreboard returned ${scoreboardRes.status}` },
        { status: 502 }
      )
    }

    const data = await scoreboardRes.json()

    // The season calendar lives in leagues[0].calendar and always has every
    // scheduled event with accurate startDate/endDate.  We use it as the
    // authoritative source for the look-ahead so we are never dependent on a
    // fixed date window that can skip imminent events.
    const calendarEntries: { id: string; label: string; startDate: string; endDate: string }[] =
      (data.leagues?.[0]?.calendar ?? []).map((e: any) => ({
        id: e.id,
        label: e.label ?? e.name ?? '',
        startDate: e.startDate ?? '',
        endDate: e.endDate ?? '',
      }))

    // Health-check: empty calendar indicates an ESPN API shape change.
    if (calendarEntries.length === 0) {
      return Response.json(
        { error: 'ESPN PGA calendar is empty — possible API shape change' },
        { status: 502 }
      )
    }

    // Process current-week events (up to 2 simultaneous tournaments, e.g. co-sanctioned)
    for (const event of (data.events ?? []).slice(0, 2)) {
      const t = await parseScoreboardEvent(event)
      if (t) tournaments.push(t)
    }

    // If no active or upcoming tournament in the current scoreboard, find the
    // next scheduled event using the season calendar (NOT a fixed 7-day window,
    // which is unreliable and can miss events starting in < 7 days).
    const hasActiveOrUpcoming = tournaments.some(t => t.status === 'live' || t.status === 'upcoming')
    if (!hasActiveOrUpcoming) {
      const now = new Date()
      const nextEntry = calendarEntries
        .filter(e => e.startDate && new Date(e.startDate) > now)
        .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())[0]

      if (nextEntry) {
        // Fetch the scoreboard for the exact tournament start date so we get
        // full event details (competitors, status, etc.) when available.
        const dateStr = new Date(nextEntry.startDate).toISOString().slice(0, 10).replace(/-/g, '')
        let pushed = false
        try {
          const nextRes = await fetch(
            `https://site.api.espn.com/apis/site/v2/sports/golf/pga/scoreboard?dates=${dateStr}`,
            { cache: 'no-store' }
          )
          if (nextRes.ok) {
            const nextData = await nextRes.json()
            const nextEvent = (nextData.events ?? []).find((e: any) => {
              const s: string = e.competitions?.[0]?.status?.type?.name ?? ''
              return s !== 'STATUS_FINAL' && !e.competitions?.[0]?.status?.type?.completed
            })
            if (nextEvent) {
              const t = await parseScoreboardEvent(nextEvent)
              if (t) { tournaments.push({ ...t, status: 'upcoming', roundLabel: 'Upcoming' }); pushed = true }
            }
          }
        } catch { /* fall through to stub */ }

        // Fallback: ESPN doesn't have event details yet — surface a calendar stub
        // so the home screen and detail sheet still show the upcoming tournament.
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
      { error: `PGA fetch failed: ${String(e)}` },
      { status: 500 }
    )
  }
}
