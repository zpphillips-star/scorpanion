/* eslint-disable @typescript-eslint/no-explicit-any */
import { SEATTLE_TEAMS } from '@/lib/teams'
import { Game } from '@/lib/types'

export const runtime = 'edge'

const WHL_BASE =
  'https://cluster.leaguestat.com/feed/?feed=modulekit&key=41b145a848f4bd67&client_code=whl&fmt=json&lang=en'

const WHL_TEAMS = [
  { teamId: 'thunderbirds', whlId: '214' },
  { teamId: 'silvertips',   whlId: '226' },
]

// Season IDs to try in order.
// 293 = 2025-26 season (ends ~May 2026).
// 294 = 2026-27 season (expected start Sep 18, 2026 — API returns empty until then, which is fine).
// TODO: add 295 when the 2027-28 season ID is known (~Sep 2027).
const WHL_SEASON_IDS = [293, 294]

export async function GET() {
  const allGames: Game[] = []
  const seenIds = new Set<string>()

  for (const { teamId, whlId } of WHL_TEAMS) {
    const team = SEATTLE_TEAMS.find(t => t.id === teamId)
    if (!team) continue

    for (const seasonId of WHL_SEASON_IDS) {
      try {
        const url = `${WHL_BASE}&view=schedule&team_id=${whlId}&season_id=${seasonId}`
        const res = await fetch(url, { next: { revalidate: 60 } })
        if (!res.ok) continue
        const data = await res.json()

        const schedule: any[] = data?.SiteKit?.Schedule ?? []

        for (const game of schedule) {
          const isHome = String(game.home_team) === whlId
          const isAway = String(game.visiting_team) === whlId
          if (!isHome && !isAway) continue

          const gameId = `${teamId}|${seasonId}|${game.id ?? game.game_id}`
          if (seenIds.has(gameId)) continue
          seenIds.add(gameId)

          const statusRaw = String(game.game_status ?? '').toLowerCase()
          let status: 'upcoming' | 'live' | 'ft' = 'upcoming'
          if (statusRaw.includes('final')) status = 'ft'
          else if (statusRaw === 'live' || statusRaw.includes('progress')) status = 'live'

          const opponentCity = isHome ? game.visiting_team_city : game.home_team_city
          const opponentCode = isHome ? game.visiting_team_code : game.home_team_code
          const opponentId = String(isHome ? game.visiting_team : game.home_team)

          const seattleGoals = isHome
            ? Number(game.home_goal_count ?? 0)
            : Number(game.visiting_goal_count ?? 0)
          const opponentGoals = isHome
            ? Number(game.visiting_goal_count ?? 0)
            : Number(game.home_goal_count ?? 0)

          const kickoff: string = game.GameDateISO8601
            ?? `${game.date_played}T${game.schedule_time ?? '00:00:00'}`

          const venueName: string = game.venue_name ?? ''

          allGames.push({
            id: gameId,
            seattleTeamId: teamId,
            seattleTeam: team,
            isHome,
            opponent: {
              id: opponentId,
              name: opponentCity ?? opponentCode,
              shortName: opponentCode,
              abbr: opponentCode,
              logo: '',
            },
            kickoff,
            venue: {
              name: venueName.split('|')[0].trim(),
              city: venueName.includes('|')
                ? venueName.split('|')[1].trim()
                : (isHome ? (teamId === 'thunderbirds' ? 'Kent, WA' : 'Everett, WA') : (opponentCity ?? '')),
            },
            status,
            seattleScore: status !== 'upcoming' ? seattleGoals : undefined,
            opponentScore: status !== 'upcoming' ? opponentGoals : undefined,
            sport: 'hockey',
            league: 'whl',
          })
        }
      } catch {
        // ignore individual season/team errors
      }
    }
  }

  allGames.sort((a, b) => new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime())
  return Response.json(allGames)
}
