/* eslint-disable @typescript-eslint/no-explicit-any */
import { SEATTLE_TEAMS } from '@/lib/teams'
import { ScoreUpdate } from '@/lib/types'

export const runtime = 'edge'

export async function GET() {
  // Group teams by sport+league to minimize API calls
  const sportLeagues = [...new Set(SEATTLE_TEAMS.map(t => `${t.sport}/${t.league}`))]
  
  const updates: Record<string, ScoreUpdate> = {}
  
  await Promise.all(
    sportLeagues.map(async (sl) => {
      try {
        const [sport, league] = sl.split('/')
        const url = `https://site.api.espn.com/apis/site/v2/sports/${sport}/${league}/scoreboard`
        const res = await fetch(url, { cache: 'no-store' })
        if (!res.ok) return
        const data = await res.json()
        
        for (const event of data.events ?? []) {
          const comp = event.competitions?.[0]
          if (!comp) continue
          
          const statusName = comp.status?.type?.name
          let status: 'upcoming' | 'live' | 'ft' = 'upcoming'
          if (statusName === 'STATUS_IN_PROGRESS') status = 'live'
          else if (statusName === 'STATUS_FINAL' || comp.status?.type?.completed) status = 'ft'
          
          // Find if any Seattle team is in this game
          for (const competitor of comp.competitors ?? []) {
            const seattleTeam = SEATTLE_TEAMS.find(
              t => t.sport === sport && t.league === league && t.espnId === competitor.team.id
            )
            if (!seattleTeam) continue
            
            const opponentComp = comp.competitors?.find((c: any) => c.homeAway !== competitor.homeAway)
            
            const gameId = `${seattleTeam.id}|${event.id}`
            updates[gameId] = {
              gameId,
              seattleTeamId: seattleTeam.id,
              seattleScore: competitor.score !== undefined ? Number(competitor.score) : 0,
              opponentScore: opponentComp?.score !== undefined ? Number(opponentComp.score) : 0,
              status,
              clock: comp.status?.displayClock,
              period: comp.status?.period?.toString(),
            }
          }
        }
      } catch {
        // ignore errors
      }
    })
  )
  
  return Response.json(updates)
}
