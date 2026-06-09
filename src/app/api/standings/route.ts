/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest } from 'next/server'

export const runtime = 'edge'

const LEAGUE_MAP: Record<string, { sport: string; league: string; seattleIds: string[] }> = {
  mlb:  { sport: 'baseball',    league: 'mlb',      seattleIds: ['12'] },
  nhl:  { sport: 'hockey',      league: 'nhl',      seattleIds: ['124292'] },
  nba:  { sport: 'basketball',  league: 'nba',      seattleIds: [] },
  wnba: { sport: 'basketball',  league: 'wnba',     seattleIds: ['14'] },
  mls:  { sport: 'soccer',      league: 'usa.1',    seattleIds: ['9726'] },
  nfl:  { sport: 'football',    league: 'nfl',      seattleIds: ['26'] },
}

// Approximate next season start months per league (used when off-season)
const NEXT_SEASON_MONTH: Record<string, string> = {
  mlb:  'April',
  nhl:  'October',
  nba:  'October',
  wnba: 'May',
  mls:  'February',
  nfl:  'September',
}

interface StandingsEntry {
  teamId: string; teamName: string; abbr: string; logo: string
  wins: number; losses: number; ties?: number
  winPct: number; gamesBehind: number | string; isSeattle: boolean
}
interface Division { name: string; entries: StandingsEntry[] }
interface ConferenceGroup { name: string; divisions: Division[] }

interface SeasonInfo {
  status: 'preseason' | 'regular' | 'playoffs' | 'offseason'
  year: number
  label: string
  nextStartApprox: string | null // e.g. "April 2027"
}

interface StandingsResponse {
  season: SeasonInfo
  divisions: Division[]           // all divisions flat (for backward compat)
  conferences: ConferenceGroup[]  // grouped by conference
  seattleDivisionName: string | null
  seattleConferenceName: string | null
}

function getStat(stats: any[], name: string): number {
  const s = stats?.find((s: any) => s.name === name || s.abbreviation === name)
  return s ? Number(s.value) : 0
}
function getStatStr(stats: any[], name: string): string {
  const s = stats?.find((s: any) => s.name === name || s.abbreviation === name)
  return s ? String(s.displayValue ?? s.value) : '-'
}

function parseEntries(entries: any[], seattleIds: string[]): StandingsEntry[] {
  return entries.map((e: any) => {
    const team = e.team || {}
    const stats: any[] = e.stats || []
    const wins = getStat(stats, 'wins')
    const losses = getStat(stats, 'losses')
    const winPct = getStat(stats, 'winPercent') || getStat(stats, 'winPct') || getStat(stats, 'pointsPercentage')
    const gbRaw = getStatStr(stats, 'gamesBehind') || getStatStr(stats, 'gb')
    const gb = gbRaw === '-' || gbRaw === '--' ? 0 : parseFloat(gbRaw) || 0
    const logo = team.logos?.[0]?.href || team.logo || ''
    return {
      teamId: String(team.id || ''),
      teamName: team.displayName || team.name || team.abbreviation || '',
      abbr: team.abbreviation || '',
      logo, wins, losses, winPct,
      gamesBehind: gb,
      isSeattle: seattleIds.includes(String(team.id || '')),
    }
  })
}

function parseHierarchy(
  data: any,
  seattleIds: string[],
): { conferences: ConferenceGroup[]; divisions: Division[] } {
  const conferences: ConferenceGroup[] = []
  const divisionsFlat: Division[] = []

  const topChildren: any[] = data.children || []

  for (const conf of topChildren) {
    const confChildren: any[] = conf.children || []
    const confName: string = conf.name || conf.abbreviation || 'Conference'
    const confDivisions: Division[] = []

    if (confChildren.length > 0) {
      // Two-level hierarchy (conf → division)
      for (const div of confChildren) {
        const entries: any[] = div.standings?.entries || div.entries || []
        if (entries.length > 0) {
          const d: Division = {
            name: div.name || div.abbreviation || confName,
            entries: parseEntries(entries, seattleIds),
          }
          confDivisions.push(d)
          divisionsFlat.push(d)
        }
      }
    } else {
      // Single-level hierarchy (conf only, no divisions)
      const entries: any[] = conf.standings?.entries || conf.entries || []
      if (entries.length > 0) {
        const d: Division = {
          name: confName,
          entries: parseEntries(entries, seattleIds),
        }
        confDivisions.push(d)
        divisionsFlat.push(d)
      }
    }

    if (confDivisions.length > 0) {
      conferences.push({ name: confName, divisions: confDivisions })
    }
  }

  // Fallback: flat overall
  if (divisionsFlat.length === 0) {
    const entries: any[] = data.standings?.entries || data.entries || []
    if (entries.length > 0) {
      const d: Division = { name: 'Overall', entries: parseEntries(entries, seattleIds) }
      conferences.push({ name: 'League', divisions: [d] })
      divisionsFlat.push(d)
    }
  }

  return { conferences, divisions: divisionsFlat }
}

function getSeasonInfo(data: any, leagueId: string): SeasonInfo {
  const season = data.season || data.leagues?.[0]?.season || {}
  const year: number = season.year || new Date().getFullYear()
  const typeId: number = season.type ?? 2
  // ESPN: 1=preseason, 2=regular, 3=postseason, 4=offseason
  let status: SeasonInfo['status'] = 'regular'
  if (typeId === 1) status = 'preseason'
  else if (typeId === 3) status = 'playoffs'
  else if (typeId === 4) status = 'offseason'

  const label: string = season.displayName || season.name || `${year} Season`

  let nextStartApprox: string | null = null
  if (status === 'offseason') {
    const month = NEXT_SEASON_MONTH[leagueId] || 'Fall'
    // If off-season and we're past summer, next season is next year
    const nextYear = new Date().getMonth() >= 6 ? year + 1 : year
    nextStartApprox = `${month} ${nextYear}`
  }

  return { status, year, label, nextStartApprox }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const leagueId = searchParams.get('league') || 'mlb'
  const mapping = LEAGUE_MAP[leagueId]

  if (!mapping) {
    return Response.json({ divisions: [], conferences: [], season: null, seattleDivisionName: null, seattleConferenceName: null })
  }

  try {
    const url = `https://site.api.espn.com/apis/v2/sports/${mapping.sport}/${mapping.league}/standings`
    const res = await fetch(url, { next: { revalidate: 300 } })
    if (!res.ok) throw new Error('ESPN request failed')
    const data = await res.json()

    const season = getSeasonInfo(data, leagueId)
    const { conferences, divisions } = parseHierarchy(data, mapping.seattleIds)

    // Find Seattle's division and conference names
    let seattleDivisionName: string | null = null
    let seattleConferenceName: string | null = null

    for (const conf of conferences) {
      for (const div of conf.divisions) {
        if (div.entries.some(e => e.isSeattle)) {
          seattleDivisionName = div.name
          seattleConferenceName = conf.name
        }
      }
    }

    const response: StandingsResponse = {
      season, divisions, conferences, seattleDivisionName, seattleConferenceName,
    }
    return Response.json(response)
  } catch {
    return Response.json({ divisions: [], conferences: [], season: null, seattleDivisionName: null, seattleConferenceName: null }, { status: 500 })
  }
}
