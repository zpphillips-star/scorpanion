/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest } from 'next/server'

export const runtime = 'edge'

const LEAGUE_MAP: Record<string, { sport: string; league: string; seattleIds: string[] }> = {
  mlb:  { sport: 'baseball',   league: 'mlb',  seattleIds: ['12'] },
  nhl:  { sport: 'hockey',     league: 'nhl',  seattleIds: ['124292'] },
  wnba: { sport: 'basketball', league: 'wnba', seattleIds: ['14'] },
  nfl:  { sport: 'football',   league: 'nfl',  seattleIds: ['26'] },
  nba:  { sport: 'basketball', league: 'nba',  seattleIds: [] },
  mls:  { sport: 'soccer',     league: 'usa.1',seattleIds: ['9726'] },
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const leagueId = searchParams.get('league') || 'mlb'
  const mapping = LEAGUE_MAP[leagueId]
  if (!mapping) return Response.json({ rounds: [], currentRound: null }, { status: 400 })

  try {
    const url = `https://site.api.espn.com/apis/site/v2/sports/${mapping.sport}/${mapping.league}/scoreboard?seasontype=3&limit=100`
    const res = await fetch(url, { next: { revalidate: 120 } })
    if (!res.ok) return Response.json({ rounds: [], currentRound: null })
    const data = await res.json()

    const events: any[] = data.events ?? []
    if (events.length === 0) return Response.json({ rounds: [], currentRound: null })

    const roundMap = new Map<string, any[]>()
    let latestRound = ''

    for (const ev of events) {
      const comp = ev.competitions?.[0]
      if (!comp) continue
      const round: string = comp.series?.round?.displayName ?? ev.week?.text ?? ev.season?.slug ?? 'Playoffs'
      if (!roundMap.has(round)) roundMap.set(round, [])

      const comps: any[] = comp.competitors ?? []
      const home = comps.find((c: any) => c.homeAway === 'home') ?? comps[0]
      const away = comps.find((c: any) => c.homeAway === 'away') ?? comps[1]

      const makeTeam = (c: any) => ({
        id: String(c?.team?.id ?? ''),
        name: c?.team?.shortDisplayName ?? c?.team?.abbreviation ?? '?',
        abbr: c?.team?.abbreviation ?? '?',
        logo: c?.team?.logos?.[0]?.href ?? c?.team?.logo ?? '',
        seed: c?.curatedRank?.current ?? c?.seed ?? null,
        wins: parseInt(c?.record?.split('-')?.[0] ?? c?.score ?? '0') || 0,
      })

      const hTeam = makeTeam(home)
      const aTeam = makeTeam(away)
      const isSeattle = mapping.seattleIds.includes(hTeam.id) || mapping.seattleIds.includes(aTeam.id)

      const seriesKey = [hTeam.id, aTeam.id].sort().join('-')
      const alreadyHas = roundMap.get(round)!.find((s: any) => s.seriesKey === seriesKey)
      if (!alreadyHas) {
        const status = comp.status?.type?.completed ? 'final'
          : comp.status?.type?.state === 'in' ? 'live' : 'scheduled'
        roundMap.get(round)!.push({ seriesKey, id: ev.id, status, round, home: hTeam, away: aTeam, isSeattle })
        latestRound = round
      }
    }

    const rounds = Array.from(roundMap.entries()).map(([name, series]) => ({ name, series }))
    return Response.json({ league: leagueId, season: data.season?.displayName ?? '', rounds, currentRound: latestRound })
  } catch {
    return Response.json({ rounds: [], currentRound: null })
  }
}
