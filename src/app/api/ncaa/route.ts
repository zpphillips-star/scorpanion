/* eslint-disable @typescript-eslint/no-explicit-any */
import { SEATTLE_TEAMS } from '@/lib/teams'
import { Game } from '@/lib/types'

export const runtime = 'edge'

const NCAA_BASE = 'https://ncaa-api.henrygd.me/scoreboard'

// NCAA sport slug → our team id
const NCAA_SPORTS = [
  { slug: 'softball',     division: 'd1', teamId: 'uw-softball' },
  { slug: 'soccer-women', division: 'd1', teamId: 'uw-soccer'   },
]

function isWashington(name: string): boolean {
  return name.toLowerCase().includes('washington') && !name.toLowerCase().includes('washington state')
}

function padDate(n: number): string {
  return String(n).padStart(2, '0')
}

/** Generate yyyy/mm/dd strings for today ±30 days */
function dateRange(days: number): string[] {
  const dates: string[] = []
  const now = new Date()
  for (let i = -days; i <= days; i++) {
    const d = new Date(now)
    d.setDate(d.getDate() + i)
    dates.push(`${d.getFullYear()}/${padDate(d.getMonth() + 1)}/${padDate(d.getDate())}`)
  }
  return dates
}

export async function GET() {
  const allGames: Game[] = []
  const seenIds = new Set<string>()

  const dates = dateRange(30)

  for (const { slug, division, teamId } of NCAA_SPORTS) {
    const team = SEATTLE_TEAMS.find(t => t.id === teamId)
    if (!team) continue

    // Fetch all dates in parallel (respect 5 req/sec with chunking)
    const CHUNK = 5
    for (let i = 0; i < dates.length; i += CHUNK) {
      const chunk = dates.slice(i, i + CHUNK)
      const results = await Promise.all(
        chunk.map(async (dateStr) => {
          try {
            const url = `${NCAA_BASE}/${slug}/${division}/${dateStr}`
            const res = await fetch(url, { next: { revalidate: 3600 } })
            if (!res.ok) return []
            const data = await res.json()
            return data?.games ?? []
          } catch {
            return []
          }
        })
      )

      for (const gameList of results) {
        for (const entry of gameList) {
          const game = entry?.game
          if (!game) continue

          const awayName: string = game.away?.names?.short ?? ''
          const homeName: string = game.home?.names?.short ?? ''

          if (!isWashington(awayName) && !isWashington(homeName)) continue

          const isHome = isWashington(homeName)
          const gameId = `${teamId}|${game.gameID}`
          if (seenIds.has(gameId)) continue
          seenIds.add(gameId)

          const opponentSide = isHome ? game.away : game.home
          const seattleSide = isHome ? game.home : game.away

          const gameState: string = (game.gameState ?? '').toLowerCase()
          let status: 'upcoming' | 'live' | 'ft' = 'upcoming'
          if (gameState === 'final') status = 'ft'
          else if (gameState === 'live' || gameState === 'in progress') status = 'live'

          // Parse epoch → ISO string
          const epochSec = parseInt(game.startTimeEpoch ?? '0', 10)
          const kickoff = epochSec
            ? new Date(epochSec * 1000).toISOString()
            : game.startDate ?? new Date().toISOString()

          const seattleScoreRaw = seattleSide?.score
          const opponentScoreRaw = opponentSide?.score

          const opponentAbbr: string =
            opponentSide?.names?.char6 ?? opponentSide?.names?.short ?? 'OPP'
          const opponentName: string =
            opponentSide?.names?.short ?? opponentSide?.names?.char6 ?? 'Opponent'

          allGames.push({
            id: gameId,
            seattleTeamId: teamId,
            seattleTeam: team,
            isHome,
            opponent: {
              id: opponentSide?.names?.seo ?? opponentAbbr,
              name: opponentName,
              shortName: opponentAbbr,
              abbr: opponentAbbr,
              logo: '',
            },
            kickoff,
            venue: { name: '', city: isHome ? 'Seattle, WA' : '' },
            status,
            seattleScore: status !== 'upcoming' && seattleScoreRaw !== undefined
              ? Number(seattleScoreRaw) : undefined,
            opponentScore: status !== 'upcoming' && opponentScoreRaw !== undefined
              ? Number(opponentScoreRaw) : undefined,
            sport: team.sport,
            league: team.league,
            broadcast: game.network || undefined,
          })
        }
      }
    }
  }

  allGames.sort((a, b) => new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime())
  return Response.json(allGames)
}
