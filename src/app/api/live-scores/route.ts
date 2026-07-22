/* eslint-disable @typescript-eslint/no-explicit-any */
import { SEATTLE_TEAMS } from '@/lib/teams'
import { ALL_PRO_TEAMS } from '@/lib/allProTeams'
import { ScoreUpdate } from '@/lib/types'

export const runtime = 'edge'

// ── Pro-league → ESPN sport/league slug ──────────────────────────────────────
const PRO_LEAGUE_SLUG: Record<string, string> = {
  NFL:  'football/nfl',
  NBA:  'basketball/nba',
  WNBA: 'basketball/wnba',
  MLS:  'soccer/usa.1',
  NWSL: 'soccer/usa.nwsl',
  // NHL and MLB are handled by dedicated APIs — excluded here
}

// ── MLB Mariners official team ID ─────────────────────────────────────────────
const MLB_MARINERS_TEAM_ID = 136

// ── NHL Kraken abbreviation ───────────────────────────────────────────────────
const NHL_KRAKEN_ABBREV = 'SEA'

// ── Fetch today's Mariners live score from statsapi.mlb.com ──────────────────
// Accepts a date range (yesterday..today in ET) so games running past midnight ET are included.
async function fetchMLBLiveScores(today: string, yesterday: string): Promise<Record<string, ScoreUpdate>> {
  const url = `https://statsapi.mlb.com/api/v1/schedule?sportId=1&teamId=${MLB_MARINERS_TEAM_ID}&startDate=${yesterday}&endDate=${today}&hydrate=linescore,team`
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) return {}

  const data = await res.json()
  const updates: Record<string, ScoreUpdate> = {}
  const mariner = SEATTLE_TEAMS.find(t => t.id === 'mariners')
  if (!mariner) return {}

  for (const date of data.dates ?? []) {
    for (const game of date.games ?? []) {
      const awayData = game.teams.away
      const homeData = game.teams.home
      const isHome = homeData.team.id === MLB_MARINERS_TEAM_ID

      const marinersData = isHome ? homeData : awayData
      const oppData = isHome ? awayData : homeData

      const state: string = game.status?.abstractGameState ?? ''
      let status: 'upcoming' | 'live' | 'ft' = 'upcoming'
      if (state === 'Live') status = 'live'
      else if (state === 'Final') status = 'ft'

      const linescore = game.linescore
      let clock: string | undefined
      let period: string | undefined

      if (status === 'live' && linescore) {
        const inning: number = linescore.currentInning ?? 0
        const isTop: boolean = linescore.isTopInning ?? true
        clock = linescore.inningState ?? ''
        period = `${isTop ? 'Top' : 'Bot'} ${linescore.currentInningOrdinal ?? `${inning}th`}`
      }

      const gameId = `mariners|${game.gamePk}`
      updates[gameId] = {
        gameId,
        seattleTeamId: mariner.id,
        seattleScore: marinersData.score !== undefined ? Number(marinersData.score) : 0,
        opponentScore: oppData.score !== undefined ? Number(oppData.score) : 0,
        status,
        clock,
        period,
      }
    }
  }
  return updates
}

// ── Fetch today's Kraken live score from api-web.nhle.com ────────────────────
async function fetchNHLLiveScores(today: string): Promise<Record<string, ScoreUpdate>> {
  const url = `https://api-web.nhle.com/v1/score/${today}`
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) return {}

  const data = await res.json()
  const updates: Record<string, ScoreUpdate> = {}
  const kraken = SEATTLE_TEAMS.find(t => t.id === 'kraken')
  if (!kraken) return {}

  for (const game of data.games ?? []) {
    const awayTeam = game.awayTeam
    const homeTeam = game.homeTeam
    const isHome = homeTeam.abbrev === NHL_KRAKEN_ABBREV
    const isAway = awayTeam.abbrev === NHL_KRAKEN_ABBREV

    if (!isHome && !isAway) continue

    const krakenTeam = isHome ? homeTeam : awayTeam
    const oppTeam = isHome ? awayTeam : homeTeam

    const state: string = game.gameState ?? ''
    let status: 'upcoming' | 'live' | 'ft' = 'upcoming'
    if (state === 'LIVE' || state === 'CRIT') status = 'live'
    else if (state === 'FINAL' || state === 'OFF') status = 'ft'

    let clock: string | undefined
    let period: string | undefined

    if (status === 'live') {
      const pd = game.periodDescriptor
      const periodNum = pd?.number ?? 0
      const periodType = pd?.periodType ?? 'REG'
      if (periodType === 'OT') period = `OT`
      else if (periodType === 'SO') period = `SO`
      else period = `P${periodNum}`
      clock = game.clock?.timeRemaining ?? undefined
    }

    const gameId = `kraken|${game.id}`
    updates[gameId] = {
      gameId,
      seattleTeamId: kraken.id,
      seattleScore: krakenTeam.score !== undefined ? Number(krakenTeam.score) : 0,
      opponentScore: oppTeam.score !== undefined ? Number(oppTeam.score) : 0,
      status,
      clock,
      period,
    }
  }
  return updates
}

export async function GET() {
  // Group non-MLB, non-NHL teams by sport+league for ESPN scoreboard fetches.
  // Include leagues from both SEATTLE_TEAMS and ALL_PRO_TEAMS so followed
  // non-Seattle teams (Lakers, Chiefs, etc.) also get live-score overlays.
  const NON_ESPN_LEAGUES = ['pwhl', 'whl', 'ncaa-softball', 'ncaa-soccer', 'mlb', 'nhl']
  const seattleSportLeagues = SEATTLE_TEAMS
    .filter(t => t.espnId && !NON_ESPN_LEAGUES.includes(t.league))
    .map(t => `${t.sport}/${t.league}`)

  // Add leagues from ALL_PRO_TEAMS (excluding MLB/NHL which have dedicated APIs)
  const proSportLeagues = Object.values(PRO_LEAGUE_SLUG)

  const sportLeagues = [...new Set([...seattleSportLeagues, ...proSportLeagues])]

  const updates: Record<string, ScoreUpdate> = {}

  // Use Eastern Time for MLB/NHL (schedules are organized by ET calendar date).
  // Also bracket yesterday ET so games that ran past midnight ET are still picked up.
  const etDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(new Date())
  const etYesterday = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(new Date(Date.now() - 86400000))

  // Run ESPN + MLB + NHL fetches in parallel
  await Promise.all([
    // ── Official MLB live scores (ET date + yesterday bracket) ────────────
    fetchMLBLiveScores(etDate, etYesterday).then(r => Object.assign(updates, r)).catch(() => {}),

    // ── Official NHL live scores (ET date) ────────────────────────────────
    fetchNHLLiveScores(etDate).then(r => Object.assign(updates, r)).catch(() => {}),

    // ── ESPN fallback for remaining leagues ───────────────────────────────
    ...sportLeagues.map(async (sl) => {
      try {
        const [sport, league] = sl.split('/')
        const base = `https://site.api.espn.com/apis/site/v2/sports/${sport}/${league}/scoreboard`
        // Fetch default scoreboard AND preseason scoreboard in parallel.
        // During preseason weeks the default endpoint may still return the next
        // regular season; the seasontype=1 call ensures live preseason games are
        // captured. Dedup by event ID so regular-season events aren't doubled.
        const [defaultRes, preRes] = await Promise.allSettled([
          fetch(base, { cache: 'no-store' }).then(r => r.ok ? r.json() : null).catch(() => null),
          fetch(`${base}?seasontype=1`, { cache: 'no-store' }).then(r => r.ok ? r.json() : null).catch(() => null),
        ])

        const seenEventIds = new Set<string>()
        const allEvents: any[] = []
        for (const result of [defaultRes, preRes]) {
          if (result.status !== 'fulfilled' || !result.value) continue
          for (const event of result.value.events ?? []) {
            if (!seenEventIds.has(event.id)) {
              seenEventIds.add(event.id)
              allEvents.push(event)
            }
          }
        }

        for (const event of allEvents) {
          const comp = event.competitions?.[0]
          if (!comp) continue

          const statusName = comp.status?.type?.name
          let status: 'upcoming' | 'live' | 'ft' = 'upcoming'
          if (statusName === 'STATUS_IN_PROGRESS') status = 'live'
          else if (statusName === 'STATUS_FINAL' || comp.status?.type?.completed) status = 'ft'

          for (const competitor of comp.competitors ?? []) {
            // ── Match against SEATTLE_TEAMS first ───────────────────────────
            const seattleTeam = SEATTLE_TEAMS.find(
              t => t.sport === sport && t.league === league && t.espnId === competitor.team.id
            )

            // ── Fallback: match against ALL_PRO_TEAMS ───────────────────────
            // ALL_PRO_TEAMS.league is uppercase ('NBA', 'NFL', etc.); we compare
            // against the ESPN slug derived from PRO_LEAGUE_SLUG.
            const proTeam = seattleTeam ? null : ALL_PRO_TEAMS.find(
              t => t.espnId === competitor.team.id &&
                   PRO_LEAGUE_SLUG[t.league] === `${sport}/${league}`
            )

            const matchedId    = seattleTeam?.id ?? proTeam?.id
            const matchedEspnId = seattleTeam?.espnId ?? proTeam?.espnId
            if (!matchedId || !matchedEspnId) continue

            // Skip injecting score updates for scheduled games — scores are 0/"" pre-game
            // and would overwrite the schedule API's cleaner undefined values.
            // The live-scores endpoint is only useful for live/final state changes.
            if (status === 'upcoming') continue

            const opponentComp = comp.competitors?.find((c: any) => c.homeAway !== competitor.homeAway)
            const gameId = `${matchedId}|${event.id}`
            const parseScore = (val: unknown): number => {
              if (val === undefined || val === null || val === '') return 0
              if (typeof val === 'object') {
                const obj = val as Record<string, unknown>
                val = obj.displayValue ?? obj.value
                if (val === undefined || val === null || val === '') return 0
              }
              const n = Number(val)
              return isNaN(n) ? 0 : n
            }
            updates[gameId] = {
              gameId,
              seattleTeamId: matchedId,
              seattleScore: parseScore(competitor.score),
              opponentScore: parseScore(opponentComp?.score),
              status,
              clock: comp.status?.displayClock,
              period: comp.status?.period?.toString(),
            }
          }
        }
      } catch {
        // ignore errors
      }
    }),
  ])

  return Response.json(updates)
}
