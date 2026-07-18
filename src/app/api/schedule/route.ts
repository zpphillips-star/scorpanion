/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest } from 'next/server'
import { SEATTLE_TEAMS } from '@/lib/teams'
import { ALL_PRO_TEAMS } from '@/lib/allProTeams'
import { Game, SeattleTeam, TeamRecord } from '@/lib/types'

export const runtime = 'edge'

// ── MLB Mariners official team ID ─────────────────────────────────────────────
const MLB_MARINERS_TEAM_ID = 136

// ── MLB statsapi team ID → ESPN team ID ──────────────────────────────────────
// The MLB official API (statsapi.mlb.com) uses different numeric IDs than ESPN.
// opponent.id must be the ESPN ID so that team-detail can call the ESPN API.
const MLB_STATSAPI_TO_ESPN_ID: Record<number, string> = {
  108: '3',    // LAA
  109: '29',   // ARI
  110: '1',    // BAL
  111: '2',    // BOS
  112: '16',   // CHC
  113: '17',   // CIN
  114: '5',    // CLE
  115: '27',   // COL
  116: '6',    // DET
  117: '18',   // HOU
  118: '7',    // KC
  119: '19',   // LAD
  120: '20',   // WSH
  121: '21',   // NYM
  133: '11',   // OAK
  134: '23',   // PIT
  135: '25',   // SD
  136: '12',   // SEA
  137: '26',   // SF
  138: '24',   // STL
  139: '30',   // TB
  140: '13',   // TEX
  141: '14',   // TOR
  142: '9',    // MIN
  143: '22',   // PHI
  144: '15',   // ATL
  145: '4',    // CWS
  146: '28',   // MIA
  147: '10',   // NYY
  158: '8',    // MIL
}

// ── NHL internal API team ID → ESPN team ID ───────────────────────────────────
// The NHL API (api-web.nhle.com) uses its own numeric team IDs; ESPN uses different ones.
const NHL_API_TO_ESPN_ID: Record<number, string> = {
  1: '11',     // NJD
  2: '12',     // NYI
  3: '13',     // NYR
  4: '15',     // PHI
  5: '16',     // PIT
  6: '1',      // BOS
  7: '2',      // BUF
  8: '10',     // MTL
  9: '14',     // OTT
  10: '21',    // TOR
  12: '7',     // CAR
  13: '26',    // FLA
  14: '20',    // TBL
  15: '23',    // WSH
  16: '4',     // CHI
  17: '5',     // DET
  18: '27',    // NSH
  19: '19',    // STL
  20: '3',     // CGY
  21: '17',    // COL
  22: '6',     // EDM
  23: '22',    // VAN
  24: '25',    // ANA
  25: '9',     // DAL
  26: '8',     // LAK
  28: '18',    // SJS
  29: '29',    // CBJ
  30: '30',    // MIN
  52: '28',    // WPG
  54: '37',    // VGK
  55: '124292',// SEA
  68: '129764',// UTA (Utah Hockey Club)
}

// ── NHL Kraken team abbreviation ──────────────────────────────────────────────
const NHL_KRAKEN_ABBREV = 'SEA'

// ── Compute the current NHL season ID (e.g. 20252026) ────────────────────────
function getNHLSeasonId(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1 // 1–12
  // NHL season runs Oct–June; if before October we're in a season that started last year
  const startYear = month >= 10 ? year : year - 1
  return `${startYear}${startYear + 1}`
}

// ── MLB logo URL from file code (e.g. "sea", "nyy") ──────────────────────────
function mlbLogoUrl(fileCode: string): string {
  return `https://a.espncdn.com/i/teamlogos/mlb/500/${fileCode.toLowerCase()}.png`
}

// ── Fetch Mariners schedule from statsapi.mlb.com ────────────────────────────
async function fetchMLBSchedule(team: SeattleTeam): Promise<Game[]> {
  const year = new Date().getFullYear()
  const url = `https://statsapi.mlb.com/api/v1/schedule?sportId=1&teamId=${MLB_MARINERS_TEAM_ID}&season=${year}&hydrate=linescore,team`
  const res = await fetch(url, { next: { revalidate: 60 } })
  if (!res.ok) return []
  const data = await res.json()

  const games: Game[] = []
  for (const date of data.dates ?? []) {
    for (const game of date.games ?? []) {
      // Only regular season + postseason
      if (game.gameType !== 'R' && game.gameType !== 'P' && game.gameType !== 'D' && game.gameType !== 'L' && game.gameType !== 'W') continue

      const awayData = game.teams.away
      const homeData = game.teams.home
      const isHome = homeData.team.id === MLB_MARINERS_TEAM_ID

      const mariners = isHome ? homeData : awayData
      const opp = isHome ? awayData : homeData

      const state: string = game.status?.abstractGameState ?? ''
      let status: 'upcoming' | 'live' | 'ft' = 'upcoming'
      if (state === 'Live') status = 'live'
      else if (state === 'Final') status = 'ft'

      const mW = mariners.leagueRecord?.wins ?? 0
      const mL = mariners.leagueRecord?.losses ?? 0
      const oW = opp.leagueRecord?.wins ?? 0
      const oL = opp.leagueRecord?.losses ?? 0

      const parseScore = (val: any): number | undefined => {
        if (val === undefined || val === null || val === '') return undefined
        const n = Number(val)
        return isNaN(n) ? undefined : n
      }

      games.push({
        id: `${team.id}|${game.gamePk}`,
        seattleTeamId: team.id,
        seattleTeam: team,
        isHome,
        opponent: {
          id: MLB_STATSAPI_TO_ESPN_ID[opp.team.id] ?? String(opp.team.id),
          name: opp.team.name,
          shortName: opp.team.teamName,
          abbr: opp.team.abbreviation,
          logo: mlbLogoUrl(opp.team.fileCode ?? opp.team.abbreviation),
          record: { wins: oW, losses: oL, summary: `${oW}-${oL}` } satisfies TeamRecord,
        },
        kickoff: game.gameDate,
        venue: {
          name: game.venue?.name ?? '',
          city: homeData.team.locationName ?? '',
        },
        status,
        seattleScore: parseScore(mariners.score),
        opponentScore: parseScore(opp.score),
        sport: team.sport,
        league: team.league,
        seattleRecord: { wins: mW, losses: mL, summary: `${mW}-${mL}` },
        opponentRecord: { wins: oW, losses: oL, summary: `${oW}-${oL}` },
      })
    }
  }
  return games
}

// ── Fetch Kraken schedule from api-web.nhle.com ───────────────────────────────
async function fetchNHLSchedule(team: SeattleTeam): Promise<Game[]> {
  const seasonId = getNHLSeasonId()
  const url = `https://api-web.nhle.com/v1/club-schedule-season/${NHL_KRAKEN_ABBREV}/${seasonId}`
  const res = await fetch(url, { next: { revalidate: 60 } })
  if (!res.ok) return []
  const data = await res.json()

  const games: Game[] = []
  for (const game of data.games ?? []) {
    // gameType: 1=preseason, 2=regular, 3=playoffs — skip preseason
    if (game.gameType === 1) continue

    const awayTeam = game.awayTeam
    const homeTeam = game.homeTeam
    const isHome = homeTeam.abbrev === NHL_KRAKEN_ABBREV

    const kraken = isHome ? homeTeam : awayTeam
    const opp = isHome ? awayTeam : homeTeam

    const state: string = game.gameState ?? ''
    let status: 'upcoming' | 'live' | 'ft' = 'upcoming'
    if (state === 'LIVE' || state === 'CRIT') status = 'live'
    else if (state === 'FINAL' || state === 'OFF') status = 'ft'

    const parseScore = (val: any): number | undefined => {
      if (val === undefined || val === null) return undefined
      const n = Number(val)
      return isNaN(n) ? undefined : n
    }

    // Use dark logo for opponent (better on dark background)
    const oppLogo: string = opp.darkLogo ?? opp.logo ?? ''
    const oppName: string = [opp.placeName?.default, opp.commonName?.default ?? opp.abbrev]
      .filter(Boolean)
      .join(' ')

    const broadcast = game.tvBroadcasts
      ?.find((b: any) => b.countryCode === 'US' && (b.market === 'N' || b.market === 'H' || b.market === 'A'))
      ?.network ?? undefined

    games.push({
      id: `${team.id}|${game.id}`,
      seattleTeamId: team.id,
      seattleTeam: team,
      isHome,
      opponent: {
        id: NHL_API_TO_ESPN_ID[opp.id] ?? String(opp.id),
        name: oppName,
        shortName: opp.commonName?.default ?? opp.abbrev,
        abbr: opp.abbrev,
        logo: oppLogo,
      },
      kickoff: game.startTimeUTC,
      venue: {
        name: game.venue?.default ?? '',
        city: isHome ? 'Seattle' : (opp.placeName?.default ?? ''),
        state: isHome ? 'WA' : undefined,
      },
      status,
      seattleScore: parseScore(kraken.score),
      opponentScore: parseScore(opp.score),
      sport: team.sport,
      league: team.league,
      broadcast,
    })
  }
  return games
}

// ── ESPN fallback ─────────────────────────────────────────────────────────────
function parseRecord(comp: any): TeamRecord | undefined {
  // Strategy 1: comp.records array (most ESPN endpoints)
  const records: any[] = comp.records || []
  const overall = records.find((r: any) =>
    r.type === 'total' || r.type === 'overall' || r.name === 'overall' ||
    r.type === 'Total' || r.type === 'cumulative'
  ) || records[0]
  if (overall?.summary) {
    const parts = overall.summary.split('-').map((s: string) => parseInt(s.trim(), 10))
    if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      return { wins: parts[0], losses: parts[1], ties: parts[2], summary: overall.summary }
    }
  }
  // Strategy 2: comp.statistics array (some WNBA / NCAAB endpoints)
  const stats: any[] = comp.statistics || []
  const winsStat  = stats.find((s: any) => s.name === 'wins'   || s.abbreviation === 'W')
  const lossesStat = stats.find((s: any) => s.name === 'losses' || s.abbreviation === 'L')
  if (winsStat && lossesStat) {
    const w = parseInt(winsStat.displayValue  ?? winsStat.value,  10)
    const l = parseInt(lossesStat.displayValue ?? lossesStat.value, 10)
    if (!isNaN(w) && !isNaN(l)) return { wins: w, losses: l, summary: `${w}-${l}` }
  }
  // Strategy 3: comp.team.record (some league overviews)
  const teamRec = comp.team?.record
  if (teamRec?.displayValue) {
    const parts = teamRec.displayValue.split('-').map((s: string) => parseInt(s.trim(), 10))
    if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      return { wins: parts[0], losses: parts[1], summary: teamRec.displayValue }
    }
  }
  return undefined
}

async function fetchESPNSchedule(team: SeattleTeam): Promise<Game[]> {
  const url = `https://site.api.espn.com/apis/site/v2/sports/${team.sport}/${team.league}/teams/${team.espnId}/schedule`
  const res = await fetch(url, { next: { revalidate: 60 } })
  if (!res.ok) return []
  const data = await res.json()

  const games: Game[] = []
  for (const event of data.events ?? []) {
    const comp = event.competitions?.[0]
    if (!comp) continue
    const home = comp.competitors?.find((c: any) => c.homeAway === 'home')
    const away = comp.competitors?.find((c: any) => c.homeAway === 'away')
    if (!home || !away) continue

    const isSeattleHome = home.team.id === team.espnId
    const seattleComp = isSeattleHome ? home : away
    const opponentComp = isSeattleHome ? away : home

    const statusName = comp.status?.type?.name
    let status: 'upcoming' | 'live' | 'ft' = 'upcoming'
    if (statusName === 'STATUS_IN_PROGRESS') status = 'live'
    else if (statusName === 'STATUS_FINAL' || comp.status?.type?.completed) status = 'ft'

    const seattleRecord = parseRecord(seattleComp)
    const opponentRecord = parseRecord(opponentComp)

    const parseScore = (val: any): number | undefined => {
      if (val === undefined || val === null || val === '') return undefined
      // ESPN returns score as object: { value: 78.0, displayValue: "78" }
      if (typeof val === 'object') val = val.displayValue ?? val.value
      if (val === undefined || val === null || val === '') return undefined
      const n = Number(val)
      return isNaN(n) ? undefined : n
    }

    games.push({
      id: `${team.id}|${event.id}`,
      seattleTeamId: team.id,
      seattleTeam: team,
      isHome: isSeattleHome,
      opponent: {
        id: opponentComp.team.id,
        name: opponentComp.team.displayName || opponentComp.team.name,
        shortName: opponentComp.team.shortDisplayName || opponentComp.team.abbreviation,
        abbr: opponentComp.team.abbreviation,
        logo: opponentComp.team.logos?.[0]?.href || opponentComp.team.logo || '',
        record: opponentRecord,
      },
      kickoff: event.date,
      venue: {
        name: comp.venue?.fullName || comp.venue?.name || '',
        city: comp.venue?.address?.city || '',
        state: comp.venue?.address?.state,
      },
      status,
      seattleScore: parseScore(seattleComp.score),
      opponentScore: parseScore(opponentComp.score),
      sport: team.sport,
      league: team.league,
      broadcast: comp.broadcasts?.[0]?.names?.[0],
      seattleRecord,
      opponentRecord,
    })
  }
  return games
}

// ── Map ProTeam league key (uppercase) → ESPN URL slug ────────────────────────
function proLeagueToEspnSlug(league: string): string {
  const SLUG_MAP: Record<string, string> = {
    MLS:  'usa.1',
    NWSL: 'usa.nwsl',
  }
  return SLUG_MAP[league] ?? league.toLowerCase()
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const teamsParam = searchParams.get('teams')

  const teamIds = teamsParam ? teamsParam.split(',') : SEATTLE_TEAMS.map(t => t.id)

  // Split into known Seattle teams and non-Seattle pro teams
  const seattleTeamSet = new Set(SEATTLE_TEAMS.map(t => t.id))
  const proTeamMap = new Map(ALL_PRO_TEAMS.map(t => [t.id, t]))

  const seattleTeams = SEATTLE_TEAMS.filter(t => teamIds.includes(t.id))
  const otherProTeams = teamIds
    .filter(id => !seattleTeamSet.has(id) && proTeamMap.has(id))
    .map(id => {
      const pt = proTeamMap.get(id)!
      // Map ProTeam to a SeattleTeam-compatible shape for fetchESPNSchedule
      const mapped: SeattleTeam = {
        id: pt.id,
        name: pt.name,
        shortName: pt.shortName,
        abbr: pt.abbr,
        sport: pt.sport,
        league: proLeagueToEspnSlug(pt.league),
        espnId: pt.espnId,
        primaryColor: pt.primaryColor,
        secondaryColor: '#ffffff',
        emoji: '',
        logoUrl: pt.logo,
      }
      return mapped
    })

  const allGames: Game[] = []
  const seenIds = new Set<string>()
  // Deduplicate by underlying event ID AND by matchup key.
  // The matchup key catches cross-system duplicates (e.g. Mariners via MLB Stats API
  // + Giants via ESPN API return the same game with completely different numeric IDs).
  const seenEventKeys = new Set<string>()
  const seenMatchupKeys = new Set<string>()

  function addGame(game: Game) {
    if (seenIds.has(game.id)) return
    // Key 1: raw event ID (strips team prefix) — catches same-system duplicates
    const eventKey = game.id.includes('|') ? game.id.split('|').slice(1).join('|') : game.id
    if (seenEventKeys.has(eventKey)) return
    // Key 2: date + sport + sorted team abbrs — catches cross-system duplicates
    // (e.g. MLB Stats API gamePk vs ESPN event ID for the same Mariners/Giants game)
    const dateKey = game.kickoff.slice(0, 10) // YYYY-MM-DD
    const abbrs = [game.seattleTeam.abbr, game.opponent.abbr].map(s => s.toUpperCase()).sort()
    const matchupKey = `${dateKey}|${game.sport}|${abbrs.join('-')}`
    if (seenMatchupKeys.has(matchupKey)) return
    seenIds.add(game.id)
    seenEventKeys.add(eventKey)
    seenMatchupKeys.add(matchupKey)
    allGames.push(game)
  }

  await Promise.all([
    // ── Seattle teams (existing logic) ───────────────────────────────────────
    ...seattleTeams.map(async (team) => {
      try {
        let games: Game[] = []

        if (team.league === 'mlb') {
          // ── Official MLB API ────────────────────────────────────────────────
          games = await fetchMLBSchedule(team)
        } else if (team.league === 'nhl') {
          // ── Official NHL API ────────────────────────────────────────────────
          games = await fetchNHLSchedule(team)
        } else {
          // ── ESPN fallback for all other leagues ─────────────────────────────
          if (!team.espnId) return
          games = await fetchESPNSchedule(team)
        }

        for (const game of games) addGame(game)
      } catch {
        // ignore errors for individual teams
      }
    }),

    // ── Non-Seattle pro teams (always via ESPN) ───────────────────────────────
    ...otherProTeams.map(async (team) => {
      try {
        if (!team.espnId) return
        const games = await fetchESPNSchedule(team)
        for (const game of games) addGame(game)
      } catch {
        // ignore errors for individual teams
      }
    }),
  ])

  allGames.sort((a, b) => new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime())

  return Response.json(allGames)
}
