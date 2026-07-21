/* eslint-disable @typescript-eslint/no-explicit-any */
export const runtime = 'edge'

// ---------------------------------------------------------------------------
// PGA Tour GraphQL — real tee-time fallback when ESPN's timeValid is false
// ---------------------------------------------------------------------------
const PGA_GQL_URL = 'https://orchestrator.pgatour.com/graphql'
const PGA_GQL_KEY = 'da2-gsrx5bibzbb4njvhl7t37wqyl4' // public key used by pgatour.com

/** Fetch per-round tee times for a PGA Tour tournament whose schedule start date
 *  falls within ±2 days of `espnEventDateISO`.  Returns an array of 4 round objects
 *  (R1–R4) where `teeTime` is the earliest tee time ISO string for that round when
 *  available, and `date` is the YYYY-MM-DD UTC date for that round.
 *  Returns undefined on any error or when the tournament cannot be matched. */
async function fetchPGATourAllRounds(espnEventDateISO: string): Promise<{
  pgatourId: string
  rounds: {
    roundNumber: number
    label: string
    teeTime?: string
    date: string
  }[]
} | undefined> {
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

    // Step 2: fetch tee times for ALL rounds of the matched tournament
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
    const gqlRounds: any[] = ttData?.data?.teeTimesV2?.rounds ?? []
    if (gqlRounds.length === 0) return undefined

    // Derive R1 date from the earliest R1 tee time (handles Pro-Am Wed vs Thu offset)
    const r1Gql = gqlRounds.find((r: any) => r.roundInt === 1)
    let r1DateMs: number
    if (r1Gql?.groups?.length) {
      const earliest: number = r1Gql.groups
        .map((g: any) => (typeof g.teeTime === 'number' ? g.teeTime : 0))
        .filter((t: number) => t > 0)
        .sort((a: number, b: number) => a - b)[0] ?? 0
      r1DateMs = earliest || (typeof match.startDate === 'number' ? match.startDate : parseInt(match.startDate ?? '0'))
    } else {
      r1DateMs = typeof match.startDate === 'number' ? match.startDate : parseInt(match.startDate ?? '0')
    }
    const r1DateStr = new Date(r1DateMs).toISOString().slice(0, 10)

    // Build rounds 1–4; teeTime is set only when GraphQL data is available for that round
    const rounds = [1, 2, 3, 4].map(n => {
      const roundDateMs = new Date(r1DateStr).getTime() + (n - 1) * 86_400_000
      const date = new Date(roundDateMs).toISOString().slice(0, 10)

      const gqlRound = gqlRounds.find((r: any) => r.roundInt === n)
      let teeTime: string | undefined
      if (gqlRound?.groups?.length) {
        const earliest: number = gqlRound.groups
          .map((g: any) => (typeof g.teeTime === 'number' ? g.teeTime : 0))
          .filter((t: number) => t > 0)
          .sort((a: number, b: number) => a - b)[0] ?? 0
        if (earliest) teeTime = new Date(earliest).toISOString()
      }

      return { roundNumber: n, label: `R${n}`, teeTime, date }
    })
    return { pgatourId: match.id, rounds }
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
  /** PGA Tour tournament ID (e.g. "R2026525") — used to fetch tee sheets. */
  pgatourId?: string
  /** Per-round tee times for upcoming tournaments (R1–R4).
   *  Populated from PGA Tour GraphQL teeTimesV2 when status === 'upcoming'.
   *  teeTime is the earliest tee time ISO string for that round (may be undefined
   *  if tee times haven't been posted yet for that round). */
  rounds?: {
    roundNumber: number  // 1, 2, 3, 4
    label: string        // "R1", "R2", "R3", "R4"
    teeTime?: string     // ISO string of first tee time for that round
    date: string         // YYYY-MM-DD UTC date for that round
  }[]
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

    // When status is upcoming, fetch per-round tee times from PGA Tour GraphQL.
    // This gives us R1–R4 each with their exact date and earliest tee time.
    const pgaTourData = status === 'upcoming'
      ? await fetchPGATourAllRounds(event.date ?? '')
      : undefined

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
    // firstTeeTime: prefer ESPN when timeValid (real competition start), else R1 tee time from GraphQL
    firstTeeTime: comp.timeValid === true
      ? (comp.startDate ?? comp.date ?? undefined)
      : pgaTourData?.rounds?.[0]?.teeTime,
    rounds: pgaTourData?.rounds,
    pgatourId: pgaTourData?.pgatourId,
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
          const shiftedStart = shiftDay(nextEntry.startDate)
          const pgaTourData = await fetchPGATourAllRounds(shiftedStart)
          tournaments.push({
            id: nextEntry.id,
            name: nextEntry.label,
            shortName: nextEntry.label,
            course,
            location,
            roundLabel: 'Upcoming',
            status: 'upcoming',
            startDate: shiftedStart,
            endDate: shiftDay(nextEntry.endDate),
            leaders: [],
            firstTeeTime: pgaTourData?.rounds?.[0]?.teeTime,
            rounds: pgaTourData?.rounds,
            pgatourId: pgaTourData?.pgatourId,
          })
        }
      }
    }

    // If no completed tournament was captured from the current scoreboard window,
    // look back at the most recently completed calendar entry so the home-screen
    // "Recent" section always has data (completed events roll off data.events
    // once ESPN moves to the next tournament week).
    const hasCompleted = tournaments.some(t => t.status === 'completed')
    if (!hasCompleted) {
      const now = new Date()
      const lastEntry = calendarEntries
        .filter(e => e.endDate && new Date(e.endDate) < now)
        .sort((a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime())[0]

      if (lastEntry) {
        const yyyymmdd = new Date(lastEntry.endDate).toISOString().slice(0, 10).replace(/-/g, '')
        try {
          const prevRes = await fetch(
            `https://site.api.espn.com/apis/site/v2/sports/golf/pga/scoreboard?dates=${yyyymmdd}`,
            { cache: 'no-store' }
          )
          if (prevRes.ok) {
            const prevData = await prevRes.json()
            const prevEvent = (prevData.events ?? []).find((e: any) =>
              e.competitions?.[0]?.status?.type?.name === 'STATUS_FINAL' ||
              e.competitions?.[0]?.status?.type?.completed === true
            )
            if (prevEvent) {
              const t = await parseScoreboardEvent(prevEvent)
              if (t) tournaments.push(t)
            }
          }
        } catch { /* skip — upcoming-only is still functional */ }
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
