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

// Maps ESPN team abbreviation → division name (for sports where ESPN returns flat conference data)
const TEAM_DIVISION_MAP: Record<string, Record<string, string>> = {
  mlb: {
    // AL West (Mariners)
    LAA: 'AL West', HOU: 'AL West', ATH: 'AL West', SEA: 'AL West', TEX: 'AL West',
    // AL Central
    CHW: 'AL Central', CLE: 'AL Central', DET: 'AL Central', KC: 'AL Central', MIN: 'AL Central',
    // AL East
    BAL: 'AL East', BOS: 'AL East', NYY: 'AL East', TB: 'AL East', TOR: 'AL East',
    // NL West
    ARI: 'NL West', COL: 'NL West', LAD: 'NL West', SD: 'NL West', SF: 'NL West',
    // NL Central
    CHC: 'NL Central', CIN: 'NL Central', MIL: 'NL Central', PIT: 'NL Central', STL: 'NL Central',
    // NL East
    ATL: 'NL East', MIA: 'NL East', NYM: 'NL East', PHI: 'NL East', WSH: 'NL East',
  },
  nfl: {
    // NFC West (Seahawks)
    ARI: 'NFC West', LAR: 'NFC West', SF: 'NFC West', SEA: 'NFC West',
    // NFC North
    CHI: 'NFC North', DET: 'NFC North', GB: 'NFC North', MIN: 'NFC North',
    // NFC South
    ATL: 'NFC South', CAR: 'NFC South', NO: 'NFC South', TB: 'NFC South',
    // NFC East
    DAL: 'NFC East', NYG: 'NFC East', PHI: 'NFC East', WSH: 'NFC East',
    // AFC West
    DEN: 'AFC West', KC: 'AFC West', LV: 'AFC West', LAC: 'AFC West',
    // AFC North
    BAL: 'AFC North', CIN: 'AFC North', CLE: 'AFC North', PIT: 'AFC North',
    // AFC South
    HOU: 'AFC South', IND: 'AFC South', JAX: 'AFC South', TEN: 'AFC South',
    // AFC East
    BUF: 'AFC East', MIA: 'AFC East', NE: 'AFC East', NYJ: 'AFC East',
  },
  nhl: {
    // Pacific Division (Kraken)
    ANA: 'Pacific', CGY: 'Pacific', EDM: 'Pacific', LA: 'Pacific',
    SEA: 'Pacific', SJ: 'Pacific', VAN: 'Pacific', VGK: 'Pacific',
    // Central Division
    CHI: 'Central', COL: 'Central', DAL: 'Central', MIN: 'Central',
    NSH: 'Central', STL: 'Central', UTA: 'Central', WPG: 'Central',
    // Metropolitan Division
    CAR: 'Metropolitan', CBJ: 'Metropolitan', NJ: 'Metropolitan', NYI: 'Metropolitan',
    NYR: 'Metropolitan', PHI: 'Metropolitan', PIT: 'Metropolitan', WSH: 'Metropolitan',
    // Atlantic Division
    BOS: 'Atlantic', BUF: 'Atlantic', DET: 'Atlantic', FLA: 'Atlantic',
    MTL: 'Atlantic', OTT: 'Atlantic', TB: 'Atlantic', TOR: 'Atlantic',
  },
  nba: {
    // Northwest Division
    DEN: 'Northwest', MIN: 'Northwest', OKC: 'Northwest', POR: 'Northwest', UTAH: 'Northwest',
    // Pacific Division
    GS: 'Pacific', LAC: 'Pacific', LAL: 'Pacific', PHX: 'Pacific', SAC: 'Pacific',
    // Southwest Division
    DAL: 'Southwest', HOU: 'Southwest', MEM: 'Southwest', NO: 'Southwest', SA: 'Southwest',
    // Atlantic Division
    BOS: 'Atlantic', BKN: 'Atlantic', NY: 'Atlantic', PHI: 'Atlantic', TOR: 'Atlantic',
    // Central Division
    CHI: 'Central', CLE: 'Central', DET: 'Central', IND: 'Central', MIL: 'Central',
    // Southeast Division
    ATL: 'Southeast', CHA: 'Southeast', MIA: 'Southeast', ORL: 'Southeast', WSH: 'Southeast',
  },
}

// Maps division name → conference name
const DIVISION_CONFERENCE_MAP: Record<string, Record<string, string>> = {
  mlb: {
    'AL West': 'American League', 'AL Central': 'American League', 'AL East': 'American League',
    'NL West': 'National League', 'NL Central': 'National League', 'NL East': 'National League',
  },
  nfl: {
    'NFC West': 'NFC', 'NFC North': 'NFC', 'NFC South': 'NFC', 'NFC East': 'NFC',
    'AFC West': 'AFC', 'AFC North': 'AFC', 'AFC South': 'AFC', 'AFC East': 'AFC',
  },
  nhl: {
    'Pacific': 'Western Conference', 'Central': 'Western Conference',
    'Metropolitan': 'Eastern Conference', 'Atlantic': 'Eastern Conference',
  },
  nba: {
    'Northwest': 'Western Conference', 'Pacific': 'Western Conference', 'Southwest': 'Western Conference',
    'Atlantic': 'Eastern Conference', 'Central': 'Eastern Conference', 'Southeast': 'Eastern Conference',
  },
}

// Preferred display order for divisions and conferences (Seattle's first)
const DIVISION_ORDER: Record<string, string[]> = {
  mlb:  ['AL West', 'AL Central', 'AL East', 'NL West', 'NL Central', 'NL East'],
  nfl:  ['NFC West', 'NFC North', 'NFC South', 'NFC East', 'AFC West', 'AFC North', 'AFC South', 'AFC East'],
  nhl:  ['Pacific', 'Central', 'Metropolitan', 'Atlantic'],
  nba:  ['Northwest', 'Pacific', 'Southwest', 'Atlantic', 'Central', 'Southeast'],
}

const CONFERENCE_ORDER: Record<string, string[]> = {
  mlb:  ['American League', 'National League'],
  nfl:  ['NFC', 'AFC'],
  nhl:  ['Western Conference', 'Eastern Conference'],
  nba:  ['Western Conference', 'Eastern Conference'],
  mls:  ['Western Conference', 'Eastern Conference'],
  wnba: ['Western Conference', 'Eastern Conference'],
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
  gamesPlayed?: number
  overtimeLosses?: number
  points?: number
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
    const tiesRaw = getStat(stats, 'ties')
    const winPct = getStat(stats, 'winPercent') || getStat(stats, 'winPct') || getStat(stats, 'pointsPercentage')
    const gbRaw = getStatStr(stats, 'gamesBehind') || getStatStr(stats, 'gb')
    const gb = gbRaw === '-' || gbRaw === '--' ? 0 : parseFloat(gbRaw) || 0
    const logo = team.logos?.[0]?.href || team.logo || ''
    const gamesPlayed = getStat(stats, 'gamesPlayed') || getStat(stats, 'GP') || 0
    const overtimeLosses = getStat(stats, 'otLosses') || getStat(stats, 'overtimeLosses') || getStat(stats, 'OTL') || 0
    const points = getStat(stats, 'points') || getStat(stats, 'leaguePoints') || 0
    return {
      teamId: String(team.id || ''),
      teamName: team.displayName || team.name || team.abbreviation || '',
      abbr: team.abbreviation || '',
      logo, wins, losses,
      ties: tiesRaw > 0 ? tiesRaw : undefined,
      winPct,
      gamesBehind: gb,
      isSeattle: seattleIds.includes(String(team.id || '')),
      gamesPlayed: gamesPlayed || undefined,
      overtimeLosses: overtimeLosses || undefined,
      points: points || undefined,
    }
  })
}

function sortByOrder(name: string, order: string[]): number {
  const idx = order.indexOf(name)
  return idx === -1 ? 999 : idx
}

// Sort entries within a division by standings rank
function sortEntries(entries: StandingsEntry[], leagueId: string): StandingsEntry[] {
  return [...entries].sort((a, b) => {
    if (leagueId === 'nhl') {
      return (b.points ?? 0) - (a.points ?? 0) || b.wins - a.wins
    }
    if (leagueId === 'mls') {
      return (b.points ?? 0) - (a.points ?? 0) || b.wins - a.wins
    }
    return b.winPct - a.winPct || b.wins - a.wins
  })
}

// Apply static team→division→conference mapping when ESPN returns flat conference data
function applyStaticDivisions(
  allEntries: StandingsEntry[],
  leagueId: string,
): { conferences: ConferenceGroup[]; divisions: Division[] } {
  const teamDivMap = TEAM_DIVISION_MAP[leagueId]
  const divConfMap = DIVISION_CONFERENCE_MAP[leagueId]
  const divOrder = DIVISION_ORDER[leagueId] || []
  const confOrder = CONFERENCE_ORDER[leagueId] || []

  // Group entries by division
  const divGroups = new Map<string, StandingsEntry[]>()
  for (const entry of allEntries) {
    const divName = teamDivMap[entry.abbr] || 'Other'
    if (!divGroups.has(divName)) divGroups.set(divName, [])
    divGroups.get(divName)!.push(entry)
  }

  // Group divisions by conference
  const confGroups = new Map<string, Division[]>()
  for (const [divName, entries] of divGroups) {
    const confName = divConfMap?.[divName] || 'Other'
    if (!confGroups.has(confName)) confGroups.set(confName, [])
    confGroups.get(confName)!.push({
      name: divName,
      entries: sortEntries(entries, leagueId),
    })
  }

  const conferences: ConferenceGroup[] = []
  const divisions: Division[] = []

  // Sort conferences and divisions by predefined order
  const sortedConfs = [...confGroups.entries()].sort(
    ([a], [b]) => sortByOrder(a, confOrder) - sortByOrder(b, confOrder)
  )

  for (const [confName, confDivs] of sortedConfs) {
    const sortedDivs = [...confDivs].sort(
      (a, b) => sortByOrder(a.name, divOrder) - sortByOrder(b.name, divOrder)
    )
    conferences.push({ name: confName, divisions: sortedDivs })
    divisions.push(...sortedDivs)
  }

  return { conferences, divisions }
}

function parseHierarchy(
  data: any,
  seattleIds: string[],
  leagueId: string,
): { conferences: ConferenceGroup[]; divisions: Division[] } {
  const conferences: ConferenceGroup[] = []
  const divisionsFlat: Division[] = []

  const topChildren: any[] = data.children || []

  for (const conf of topChildren) {
    const confChildren: any[] = conf.children || []
    const confName: string = conf.name || conf.abbreviation || 'Conference'
    const confDivisions: Division[] = []

    if (confChildren.length > 0) {
      // Two-level hierarchy (conf → division → teams)
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
      // Flat conference (no division children) — handled below via static mapping
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

  // Fallback: flat overall (no conference children at all)
  if (divisionsFlat.length === 0) {
    const entries: any[] = data.standings?.entries || data.entries || []
    if (entries.length > 0) {
      const d: Division = { name: 'Overall', entries: parseEntries(entries, seattleIds) }
      conferences.push({ name: 'League', divisions: [d] })
      divisionsFlat.push(d)
    }
  }

  // If we have a static division mapping for this league, apply it to re-group flat conference data
  if (TEAM_DIVISION_MAP[leagueId] && divisionsFlat.length > 0) {
    const allEntries = divisionsFlat.flatMap(d => d.entries)
    return applyStaticDivisions(allEntries, leagueId)
  }

  // For sports without division mapping (MLS, WNBA), apply conference ordering and return as-is
  const confOrder = CONFERENCE_ORDER[leagueId] || []
  if (confOrder.length > 0) {
    conferences.sort((a, b) => sortByOrder(a.name, confOrder) - sortByOrder(b.name, confOrder))
    const reorderedDivs = conferences.flatMap(c => c.divisions)
    return { conferences, divisions: reorderedDivs }
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
    const { conferences, divisions } = parseHierarchy(data, mapping.seattleIds, leagueId)

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
