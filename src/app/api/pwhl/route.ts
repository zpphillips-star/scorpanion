/* eslint-disable @typescript-eslint/no-explicit-any */
import { SEATTLE_TEAMS } from '@/lib/teams'
import { Game } from '@/lib/types'

export const runtime = 'edge'

const PWHL_BASE =
  'https://lscluster.hockeytech.com/feed/index.php?feed=modulekit&key=446521baf8c38984&client_code=pwhl&fmt=json'
const TORRENT_TEAM_ID = '8'

/** Parse HockeyTech's non-standard date "M/D/YYYY HH:MM:SS" into ISO-8601 */
function parseHockeyTechDate(raw: string): string {
  // raw: "11/28/2025 13:00:00"
  const [datePart, timePart] = raw.split(' ')
  if (!datePart) return raw
  const [m, d, y] = datePart.split('/')
  if (!m || !d || !y) return raw
  const mm = m.padStart(2, '0')
  const dd = d.padStart(2, '0')
  return `${y}-${mm}-${dd}T${timePart ?? '00:00:00'}`
}

export async function GET() {
  const torrent = SEATTLE_TEAMS.find(t => t.id === 'torrent')
  if (!torrent) return Response.json([])

  const allGames: Game[] = []
  const seenIds = new Set<string>()

  for (const seasonId of [8, 9]) {
    try {
      const url = `${PWHL_BASE}&view=schedule&season_id=${seasonId}`
      const res = await fetch(url, { next: { revalidate: 60 } })
      if (!res.ok) continue
      const data = await res.json()

      const schedule: any[] = data?.SiteKit?.Schedule ?? []

      for (const game of schedule) {
        const isHome = String(game.home_team) === TORRENT_TEAM_ID
        const isAway = String(game.visiting_team) === TORRENT_TEAM_ID
        if (!isHome && !isAway) continue

        const gameId = `torrent|${seasonId}|${game.id ?? game.game_id}`
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

        const rawDate: string = game.GameDateISO8601 ?? `${game.date_played} ${game.schedule_time ?? '00:00:00'}`
        const kickoff = parseHockeyTechDate(rawDate)

        const venueName: string = game.venue_name ?? (isHome ? 'Climate Pledge Arena | Seattle' : '')

        allGames.push({
          id: gameId,
          seattleTeamId: 'torrent',
          seattleTeam: torrent,
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
            city: venueName.includes('|') ? venueName.split('|')[1].trim() : (isHome ? 'Seattle' : (opponentCity ?? '')),
          },
          status,
          seattleScore: status !== 'upcoming' ? seattleGoals : undefined,
          opponentScore: status !== 'upcoming' ? opponentGoals : undefined,
          sport: 'hockey',
          league: 'pwhl',
        })
      }
    } catch {
      // ignore individual season errors
    }
  }

  allGames.sort((a, b) => new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime())
  return Response.json(allGames)
}
