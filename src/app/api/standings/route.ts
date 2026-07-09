/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest } from 'next/server'

export const runtime = 'edge'

const LEAGUE_MAP: Record<string, { sport: string; league: string }> = {
  mlb:  { sport: 'baseball',    league: 'mlb'      },
  nhl:  { sport: 'hockey',      league: 'nhl'      },
  nba:  { sport: 'basketball',  league: 'nba'      },
  wnba: { sport: 'basketball',  league: 'wnba'     },
  mls:  { sport: 'soccer',      league: 'usa.1'    },
  nfl:  { sport: 'football',    league: 'nfl'      },
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
  winPct: number; gamesBehind: number | string; isFollowed: boolean
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
  followedDivisionName: string | null
  followedConferenceName: string | null
}

function getStat(stats: any[], name: string): number {
  const s = stats?.find((s: any) => s.name === name || s.abbreviation === name)
  return s ? Number(s.value) : 0
}
function getStatStr(stats: any[], name: string): string {
  const s = stats?.find((s: any) => s.name === name || s.abbreviation === name)
  return s ? String(s.displayValue ?? s.value) : '-'
}

function parseEntries(entries: any[], highlightAbbrs: Set<string>): StandingsEntry[] {
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
      isFollowed: highlightAbbrs.has(team.abbreviation || ''),
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
  highlightAbbrs: Set<string>,
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
            entries: parseEntries(entries, highlightAbbrs),
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
          entries: parseEntries(entries, highlightAbbrs),
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
      const d: Division = { name: 'Overall', entries: parseEntries(entries, highlightAbbrs) }
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

function getSeasonInfo(standingsData: any, leagueId: string, scoreboard: any): SeasonInfo {
  const season = standingsData.season || standingsData.leagues?.[0]?.season || {}
  const year: number = season.year || new Date().getFullYear()

  // Prefer scoreboard season.type — it's more accurate than standings (standings often omits type)
  const rawType = scoreboard?.season?.type ?? season.type
  const typeId: number = typeof rawType === 'object' && rawType !== null
    ? Number(rawType.id ?? rawType.type ?? 2)
    : Number(rawType ?? 2)

  // ESPN: 1=preseason, 2=regular, 3=postseason, 4=offseason
  let status: SeasonInfo['status'] = 'regular'
  if (typeId === 1) status = 'preseason'
  else if (typeId === 3) status = 'playoffs'
  else if (typeId === 4) status = 'offseason'

  // If playoffs but no live/upcoming events → season is actually complete
  if (status === 'playoffs') {
    const events: any[] = scoreboard?.events || []
    const now = Date.now()
    const hasActiveOrFuture = events.some((e: any) => {
      const stateType = e.status?.type?.state || ''
      const eventDate = new Date(e.date || 0).getTime()
      return stateType === 'in' || stateType === 'pre' || eventDate > now
    })
    if (!hasActiveOrFuture) status = 'offseason'
  }

  const label: string = season.displayName || season.name || `${year} Season`

  let nextStartApprox: string | null = null
  if (status === 'offseason') {
    const month = NEXT_SEASON_MONTH[leagueId] || 'Fall'
    const currentMonth = new Date().getMonth()
    const nextYear = currentMonth >= 6 ? year + 1 : year
    nextStartApprox = `${month} ${nextYear}`
  }

  return { status, year, label, nextStartApprox }
}

// ── MLB division ID → name mapping ───────────────────────────────────────────
const MLB_DIVISION_ID_NAME: Record<number, string> = {
  200: 'AL West', 201: 'AL East', 202: 'AL Central',
  203: 'NL West', 204: 'NL Central', 205: 'NL East',
}

// ── Compute current MLB/NHL season year ───────────────────────────────────────
function getCurrentMLBYear(): number {
  return new Date().getFullYear()
}

function getNHLSeasonId(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  const startYear = month >= 10 ? year : year - 1
  return `${startYear}${startYear + 1}`
}

// ── Determine season status from current date (simplified) ────────────────────
function getSeasonStatusFromDate(leagueId: string): SeasonInfo {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1 // 1–12
  let status: SeasonInfo['status'] = 'regular'
  let nextStartApprox: string | null = null

  if (leagueId === 'mlb') {
    // MLB: regular March-Sept, playoffs Oct-Nov, off-season Dec-Feb
    if (month >= 10 && month <= 11) status = 'playoffs'
    else if (month === 12 || month <= 2) { status = 'offseason'; nextStartApprox = `April ${year + 1}` }
    else status = 'regular'
  } else if (leagueId === 'nhl') {
    // NHL: regular Oct-Apr, playoffs Apr-Jun, off-season Jul-Sept
    if (month >= 4 && month <= 6) status = 'playoffs'
    else if (month >= 7 && month <= 9) { status = 'offseason'; nextStartApprox = `October ${year}` }
    else status = 'regular'
  }

  const label = leagueId === 'nhl'
    ? `${year - 1}–${year} Season`
    : `${year} Season`

  return { status, year, label, nextStartApprox }
}

// ── Fetch MLB standings from statsapi.mlb.com ─────────────────────────────────
async function fetchMLBStandings(highlightAbbrs: Set<string>): Promise<StandingsResponse> {
  const year = getCurrentMLBYear()
  const url = `https://statsapi.mlb.com/api/v1/standings?leagueId=103,104&season=${year}&hydrate=team`
  const res = await fetch(url, { next: { revalidate: 300 } })
  if (!res.ok) throw new Error('MLB standings request failed')
  const data = await res.json()

  const divisionOrder = DIVISION_ORDER['mlb'] ?? []
  const confOrder = CONFERENCE_ORDER['mlb'] ?? []

  // Group into divisions, then conferences
  const divMap = new Map<string, StandingsEntry[]>()

  for (const record of data.records ?? []) {
    const divId: number = record.division?.id
    const divName: string = MLB_DIVISION_ID_NAME[divId] ?? `Division ${divId}`

    for (const tr of record.teamRecords ?? []) {
      const team = tr.team ?? {}
      const wins: number = tr.wins ?? 0
      const losses: number = tr.losses ?? 0
      const gp: number = tr.gamesPlayed ?? 0
      const pct: number = parseFloat(tr.winningPercentage ?? '0') || 0
      const gbRaw: string = tr.gamesBack ?? '-'
      const gb: number | string = gbRaw === '-' ? 0 : parseFloat(gbRaw) || 0

      const logo = `https://a.espncdn.com/i/teamlogos/mlb/500/${(team.fileCode ?? team.abbreviation ?? 'x').toLowerCase()}.png`

      const entry: StandingsEntry = {
        teamId: String(team.id ?? ''),
        teamName: team.name ?? team.shortName ?? '',
        abbr: team.abbreviation ?? '',
        logo,
        wins,
        losses,
        winPct: pct,
        gamesBehind: gb,
        isFollowed: highlightAbbrs.has(team.abbreviation ?? ''),
        gamesPlayed: gp || undefined,
      }

      if (!divMap.has(divName)) divMap.set(divName, [])
      divMap.get(divName)!.push(entry)
    }
  }

  // Sort each division by win% descending
  for (const [, entries] of divMap) {
    entries.sort((a, b) => b.winPct - a.winPct || b.wins - a.wins)
  }

  const divMapConf = DIVISION_CONFERENCE_MAP['mlb'] ?? {}
  const confMap = new Map<string, Division[]>()

  for (const [divName, entries] of divMap) {
    const confName = divMapConf[divName] ?? 'Other'
    if (!confMap.has(confName)) confMap.set(confName, [])
    confMap.get(confName)!.push({ name: divName, entries })
  }

  const conferences: ConferenceGroup[] = []
  const divisions: Division[] = []

  const sortedConfs = [...confMap.entries()].sort(
    ([a], [b]) => sortByOrder(a, confOrder) - sortByOrder(b, confOrder)
  )
  for (const [confName, confDivs] of sortedConfs) {
    const sortedDivs = [...confDivs].sort(
      (a, b) => sortByOrder(a.name, divisionOrder) - sortByOrder(b.name, divisionOrder)
    )
    conferences.push({ name: confName, divisions: sortedDivs })
    divisions.push(...sortedDivs)
  }

  let followedDivisionName: string | null = null
  let followedConferenceName: string | null = null
  for (const conf of conferences) {
    for (const div of conf.divisions) {
      if (div.entries.some(e => e.isFollowed)) {
        followedDivisionName = div.name
        followedConferenceName = conf.name
      }
    }
  }

  return {
    season: getSeasonStatusFromDate('mlb'),
    divisions,
    conferences,
    followedDivisionName,
    followedConferenceName,
  }
}

// ── Fetch NHL standings from api-web.nhle.com ─────────────────────────────────
async function fetchNHLStandings(highlightAbbrs: Set<string>): Promise<StandingsResponse> {
  const url = `https://api-web.nhle.com/v1/standings/now`
  const res = await fetch(url, { next: { revalidate: 300 } })
  if (!res.ok) throw new Error('NHL standings request failed')
  const data = await res.json()

  const divisionOrder = DIVISION_ORDER['nhl'] ?? []
  const confOrder = CONFERENCE_ORDER['nhl'] ?? []
  const divConfMap = DIVISION_CONFERENCE_MAP['nhl'] ?? {}

  const divMap = new Map<string, StandingsEntry[]>()

  for (const s of data.standings ?? []) {
    const abbr: string = s.teamAbbrev?.default ?? ''
    const teamName: string = s.teamName?.default ?? ''
    const logo: string = s.teamLogo ?? ''
    const wins: number = s.wins ?? 0
    const losses: number = s.losses ?? 0
    const otLosses: number = s.otLosses ?? 0
    const points: number = s.points ?? 0
    const gp: number = s.gamesPlayed ?? 0
    const winPct: number = s.pointPctg ?? 0
    const divName: string = s.divisionName ?? 'Unknown'

    const entry: StandingsEntry = {
      teamId: String(s.teamAbbrev?.default ?? ''),
      teamName,
      abbr,
      logo,
      wins,
      losses,
      overtimeLosses: otLosses || undefined,
      winPct,
      gamesBehind: 0,
      points: points || undefined,
      isFollowed: highlightAbbrs.has(abbr),
      gamesPlayed: gp || undefined,
    }

    if (!divMap.has(divName)) divMap.set(divName, [])
    divMap.get(divName)!.push(entry)
  }

  // Sort each division by points desc, then wins
  for (const [, entries] of divMap) {
    entries.sort((a, b) => (b.points ?? 0) - (a.points ?? 0) || b.wins - a.wins)
  }

  const confMap = new Map<string, Division[]>()
  for (const [divName, entries] of divMap) {
    const confName = divConfMap[divName] ?? 'Other'
    if (!confMap.has(confName)) confMap.set(confName, [])
    confMap.get(confName)!.push({ name: divName, entries })
  }

  const conferences: ConferenceGroup[] = []
  const divisions: Division[] = []

  const sortedConfs = [...confMap.entries()].sort(
    ([a], [b]) => sortByOrder(a, confOrder) - sortByOrder(b, confOrder)
  )
  for (const [confName, confDivs] of sortedConfs) {
    const sortedDivs = [...confDivs].sort(
      (a, b) => sortByOrder(a.name, divisionOrder) - sortByOrder(b.name, divisionOrder)
    )
    conferences.push({ name: confName, divisions: sortedDivs })
    divisions.push(...sortedDivs)
  }

  let followedDivisionName: string | null = null
  let followedConferenceName: string | null = null
  for (const conf of conferences) {
    for (const div of conf.divisions) {
      if (div.entries.some(e => e.isFollowed)) {
        followedDivisionName = div.name
        followedConferenceName = conf.name
      }
    }
  }

  const seasonId = getNHLSeasonId()
  const seasonYear = parseInt(seasonId.slice(4), 10)

  return {
    season: {
      ...getSeasonStatusFromDate('nhl'),
      year: seasonYear,
      label: `${seasonYear - 1}–${seasonYear} Season`,
    },
    divisions,
    conferences,
    followedDivisionName,
    followedConferenceName,
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const leagueId = searchParams.get('league') || 'mlb'
  const highlightParam = searchParams.get('highlight') || ''
  const highlightAbbrs = new Set(highlightParam.split(',').map(s => s.trim()).filter(Boolean))

  try {
    // ── Official MLB standings ─────────────────────────────────────────────
    if (leagueId === 'mlb') {
      const response = await fetchMLBStandings(highlightAbbrs)
      return Response.json(response)
    }

    // ── Official NHL standings ─────────────────────────────────────────────
    if (leagueId === 'nhl') {
      const response = await fetchNHLStandings(highlightAbbrs)
      return Response.json(response)
    }

    // ── ESPN fallback for all other leagues ───────────────────────────────
    const mapping = LEAGUE_MAP[leagueId]
    if (!mapping) {
      return Response.json({ divisions: [], conferences: [], season: null, followedDivisionName: null, followedConferenceName: null })
    }

    const standingsUrl = `https://site.api.espn.com/apis/v2/sports/${mapping.sport}/${mapping.league}/standings`
    const scoreboardUrl = `https://site.api.espn.com/apis/site/v2/sports/${mapping.sport}/${mapping.league}/scoreboard`

    const [standingsRes, scoreboardRes] = await Promise.all([
      fetch(standingsUrl, { next: { revalidate: 300 } }),
      fetch(scoreboardUrl, { next: { revalidate: 300 } }),
    ])
    if (!standingsRes.ok) throw new Error('ESPN standings request failed')
    const data = await standingsRes.json()
    const scoreboard = scoreboardRes.ok ? await scoreboardRes.json() : null

    const season = getSeasonInfo(data, leagueId, scoreboard)
    const { conferences, divisions } = parseHierarchy(data, highlightAbbrs, leagueId)

    let followedDivisionName: string | null = null
    let followedConferenceName: string | null = null

    for (const conf of conferences) {
      for (const div of conf.divisions) {
        if (div.entries.some(e => e.isFollowed)) {
          followedDivisionName = div.name
          followedConferenceName = conf.name
        }
      }
    }

    const response: StandingsResponse = {
      season, divisions, conferences, followedDivisionName, followedConferenceName,
    }
    return Response.json(response)
  } catch {
    return Response.json({ divisions: [], conferences: [], season: null, followedDivisionName: null, followedConferenceName: null }, { status: 500 })
  }
}
