import { NextResponse } from 'next/server'
import { ALL_PRO_TEAMS } from '@/lib/allProTeams'

const ESPN_ENDPOINTS: Record<string, string> = {
  NFL:  'https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams',
  NBA:  'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams',
  NHL:  'https://site.api.espn.com/apis/site/v2/sports/hockey/nhl/teams',
  MLB:  'https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/teams',
  WNBA: 'https://site.api.espn.com/apis/site/v2/sports/basketball/wnba/teams',
  MLS:  'https://site.api.espn.com/apis/site/v2/sports/soccer/usa.1/teams',
  NWSL: 'https://site.api.espn.com/apis/site/v2/sports/soccer/usa.nwsl/teams',
}

interface EspnTeam {
  id: string
  displayName: string
  shortDisplayName: string
  abbreviation: string
  color?: string
  alternateColor?: string
  logos?: { href: string }[]
  location?: string
}

async function fetchLeague(league: string, url: string): Promise<EspnTeam[]> {
  try {
    const res = await fetch(`${url}?limit=100`, { next: { revalidate: 3600 } })
    if (!res.ok) return []
    const data = await res.json()
    const items: EspnTeam[] = data.sports?.[0]?.leagues?.[0]?.teams?.map((t: { team: EspnTeam }) => t.team) ?? []
    return items
  } catch {
    return []
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const leagueFilter = searchParams.get('league')?.toUpperCase()

  // Determine which leagues to fetch
  const leaguesToFetch = leagueFilter && leagueFilter !== 'ALL' && ESPN_ENDPOINTS[leagueFilter]
    ? { [leagueFilter]: ESPN_ENDPOINTS[leagueFilter] }
    : ESPN_ENDPOINTS

  // Fetch all leagues in parallel
  const results = await Promise.all(
    Object.entries(leaguesToFetch).map(async ([league, url]) => {
      const espnTeams = await fetchLeague(league, url)
      return { league, espnTeams }
    })
  )

  // Build an ESPN ID → live data map for enrichment
  const espnById = new Map<string, EspnTeam & { league: string }>()
  for (const { league, espnTeams } of results) {
    for (const t of espnTeams) {
      espnById.set(`${league}:${t.id}`, { ...t, league })
    }
  }

  // Merge static data with live ESPN data
  const teams = ALL_PRO_TEAMS
    .filter(t => !leagueFilter || leagueFilter === 'ALL' || t.league === leagueFilter)
    .map(t => {
      const live = espnById.get(`${t.league}:${t.espnId}`)
      return {
        id: t.id,
        espnId: t.espnId,
        name: live?.displayName ?? t.name,
        shortName: live?.shortDisplayName ?? t.shortName,
        abbr: live?.abbreviation ?? t.abbr,
        city: t.city,
        state: t.state,
        league: t.league,
        sport: t.sport,
        primaryColor: live?.color ? `#${live.color}` : t.primaryColor,
        logo: live?.logos?.[0]?.href ?? t.logo,
      }
    })

  return NextResponse.json({ teams, total: teams.length })
}
