/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest } from 'next/server'
import { SEATTLE_TEAMS } from '@/lib/teams'
import { Game, TeamRecord } from '@/lib/types'

export const runtime = 'edge'

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
        if (!team.espnId) return  // skip non-ESPN teams (e.g. PWHL)
        const url = `https://site.api.espn.com/apis/site/v2/sports/${team.sport}/${team.league}/teams/${team.espnId}/schedule`
        const res = await fetch(url, { next: { revalidate: 300 } })
        if (!res.ok) return
        const data = await res.json()
        
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
          
          const gameId = `${team.id}|${event.id}`
          if (seenIds.has(gameId)) continue
          seenIds.add(gameId)

          const seattleRecord = parseRecord(seattleComp)
          const opponentRecord = parseRecord(opponentComp)
          
          allGames.push({
            id: gameId,
            seattleTeamId: team.id,
            seattleTeam: team,
            isHome: isSeattleHome,
            opponent: {
              id: opponentComp.team.id,
              name: opponentComp.team.displayName || opponentComp.team.name,
              shortName: opponentComp.team.shortDisplayName || opponentComp.team.abbreviation,
              abbr: opponentComp.team.abbreviation,
              logo: opponentComp.team.logo || '',
              record: opponentRecord,
            },
            kickoff: event.date,
            venue: {
              name: comp.venue?.fullName || comp.venue?.name || '',
              city: comp.venue?.address?.city || '',
              state: comp.venue?.address?.state,
            },
            status,
            seattleScore: seattleComp.score !== undefined ? Number(seattleComp.score) : undefined,
            opponentScore: opponentComp.score !== undefined ? Number(opponentComp.score) : undefined,
            sport: team.sport,
            league: team.league,
            broadcast: comp.broadcasts?.[0]?.names?.[0],
            seattleRecord,
            opponentRecord,
          })
        }
      } catch {
        // ignore errors for individual teams
      }
    })
  )
  
  allGames.sort((a, b) => new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime())
  
  return Response.json(allGames)
}
