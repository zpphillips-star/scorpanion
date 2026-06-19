/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest } from 'next/server'
import { SEATTLE_TEAMS } from '@/lib/teams'
import { Game, SeattleTeam, TeamRecord } from '@/lib/types'

export const runtime = 'edge'

// ── MLB Mariners official team ID ─────────────────────────────────────────────
const MLB_MARINERS_TEAM_ID = 136

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
  const res = await fetch(url, { next: { revalidate: 300 } })
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
          id: String(opp.team.id),
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
  const res = await fetch(url, { next: { revalidate: 300 } })
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
        id: String(opp.id),
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
  const records: any[] = comp.records || []
  const overall = records.find((r: any) => r.type === 'total' || r.name === 'overall' || r.type === 'overall') || records[0]
  if (!overall) return undefined
  const summary: string = overall.summary || ''
  const parts = summary.split('-').map((s: string) => parseInt(s.trim(), 10))
  if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
    return { wins: parts[0], losses: parts[1], ties: parts[2], summary }
  }
  return undefined
}

async function fetchESPNSchedule(team: SeattleTeam): Promise<Game[]> {
  const url = `https://site.api.espn.com/apis/site/v2/sports/${team.sport}/${team.league}/teams/${team.espnId}/schedule`
  const res = await fetch(url, { next: { revalidate: 300 } })
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

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const teamsParam = searchParams.get('teams')

  const teamIds = teamsParam ? teamsParam.split(',') : SEATTLE_TEAMS.map(t => t.id)
  const teams = SEATTLE_TEAMS.filter(t => teamIds.includes(t.id))

  const allGames: Game[] = []
  const seenIds = new Set<string>()

  await Promise.all(
    teams.map(async (team) => {
      try {
        let games: Game[] = []

        if (team.league === 'mlb') {
          // ── Official MLB API ──────────────────────────────────────────────
          games = await fetchMLBSchedule(team)
        } else if (team.league === 'nhl') {
          // ── Official NHL API ──────────────────────────────────────────────
          games = await fetchNHLSchedule(team)
        } else {
          // ── ESPN fallback for all other leagues ───────────────────────────
          if (!team.espnId) return
          games = await fetchESPNSchedule(team)
        }

        for (const game of games) {
          if (seenIds.has(game.id)) continue
          seenIds.add(game.id)
          allGames.push(game)
        }
      } catch {
        // ignore errors for individual teams
      }
    })
  )

  allGames.sort((a, b) => new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime())

  return Response.json(allGames)
}
