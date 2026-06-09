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

interface StandingsEntry {
  teamId: string
  teamName: string
  abbr: string
  logo: string
  wins: number
  losses: number
  ties?: number
  winPct: number
  gamesBehind: number | string
  isSeattle: boolean
}

interface Division {
  name: string
  entries: StandingsEntry[]
}

function getStat(stats: any[], name: string): number {
  const s = stats?.find((s: any) => s.name === name || s.abbreviation === name)
  return s ? Number(s.value) : 0
}

function getStatStr(stats: any[], name: string): string {
  const s = stats?.find((s: any) => s.name === name || s.abbreviation === name)
  if (!s) return '-'
  return String(s.displayValue ?? s.value)
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
      logo,
      wins,
      losses,
      winPct,
      gamesBehind: gb,
      isSeattle: seattleIds.includes(String(team.id || '')),
    }
  })
}

function parseDivisions(data: any, seattleIds: string[]): Division[] {
  const divisions: Division[] = []

  const topChildren: any[] = data.children || []
  for (const conf of topChildren) {
    const confChildren: any[] = conf.children || []
    if (confChildren.length > 0) {
      for (const div of confChildren) {
        const entries: any[] = div.standings?.entries || div.entries || []
        if (entries.length > 0) {
          divisions.push({
            name: div.name || div.abbreviation || conf.name,
            entries: parseEntries(entries, seattleIds),
          })
        }
      }
    } else {
      const entries: any[] = conf.standings?.entries || conf.entries || []
      if (entries.length > 0) {
        divisions.push({
          name: conf.name || conf.abbreviation || 'Standings',
          entries: parseEntries(entries, seattleIds),
        })
      }
    }
  }

  if (divisions.length === 0) {
    const entries: any[] = data.standings?.entries || data.entries || []
    if (entries.length > 0) {
      divisions.push({
        name: 'Overall',
        entries: parseEntries(entries, seattleIds),
      })
    }
  }

  return divisions
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const leagueId = searchParams.get('league') || 'mlb'
  const mapping = LEAGUE_MAP[leagueId]

  if (!mapping) {
    return Response.json({ divisions: [] })
  }

  try {
    const url = `https://site.api.espn.com/apis/v2/sports/${mapping.sport}/${mapping.league}/standings`
    const res = await fetch(url, { next: { revalidate: 300 } })
    if (!res.ok) throw new Error('ESPN request failed')
    const data = await res.json()
    const divisions = parseDivisions(data, mapping.seattleIds)
    return Response.json({ divisions })
  } catch {
    return Response.json({ divisions: [] }, { status: 500 })
  }
}
