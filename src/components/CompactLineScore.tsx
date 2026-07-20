"use client"
import { useState, useEffect } from "react"

interface LineTeam {
  teamId: string
  abbr: string
  homeAway: "home" | "away"
  score: number
  linescores: number[]
}

interface BoxScoreData {
  sportType: string
  periodLabels: string[]
  linescores: LineTeam[]
  currentPeriod: number | null
}

interface Props {
  gameId: string
  league: string
  seattleTeamId: string
}

/** Returns true when periodIdx is the currently-live period column */
function isCurrentCol(periodIdx: number, currentPeriod: number | null): boolean {
  if (currentPeriod === null) return false
  return periodIdx === currentPeriod - 1
}

/**
 * Compact inline period/quarter linescore for non-baseball live games.
 * Used on the home TodayGameCard for basketball, hockey, and football.
 * Shows: team abbr | period cols (highlighted if live) | total
 * Renders null on fetch failure — no disruptive error state on the home card.
 */
export default function CompactLineScore({ gameId, league, seattleTeamId }: Props) {
  const [data, setData] = useState<BoxScoreData | null>(null)
  const [loading, setLoading] = useState(true)

  const eventId = gameId.includes("|") ? gameId.split("|")[1] : gameId

  useEffect(() => {
    if (!eventId) { setLoading(false); return }
    setLoading(true)
    fetch(`/api/boxscore?eventId=${encodeURIComponent(eventId)}&league=${encodeURIComponent(league)}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d && d.linescores?.length > 0) setData(d)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [eventId, league])

  if (loading) {
    return (
      <div className="rounded-md p-2 mt-2 flex items-center gap-2" style={{ background: "rgba(255,255,255,0.04)" }}>
        <div className="w-3 h-3 border border-zinc-600 border-t-transparent rounded-full animate-spin flex-shrink-0" />
        <span className="text-[10px] text-zinc-600 uppercase tracking-wider">Loading score…</span>
      </div>
    )
  }

  if (!data) return null

  const { linescores, periodLabels, currentPeriod } = data
  if (!periodLabels.length) return null

  // Always render away first, home second
  const sorted = [...linescores].sort((a, b) => {
    if (a.homeAway === "away" && b.homeAway !== "away") return -1
    if (b.homeAway === "away" && a.homeAway !== "away") return 1
    return 0
  })

  return (
    <div
      className="rounded-md p-2 mt-2 overflow-x-auto no-scrollbar"
      style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.10)" }}
    >
      <table className="text-xs w-full" style={{ borderCollapse: "separate", borderSpacing: 0 }}>
        <thead>
          <tr>
            <th className="w-8 pb-1" />
            {periodLabels.map((lbl, i) => {
              const isCur = isCurrentCol(i, currentPeriod)
              return (
                <th
                  key={i}
                  className={`w-6 text-center font-display font-600 pb-1 ${isCur ? "text-red-400" : "text-zinc-600"}`}
                >
                  {lbl}
                </th>
              )
            })}
            <th className="w-6 text-center font-display font-700 text-zinc-200 pb-1 border-l border-zinc-700">T</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((team) => {
            const isSea = team.teamId === seattleTeamId || team.abbr === "SEA"
            return (
              <tr key={team.teamId}>
                <td className="w-8 pr-1 font-display font-700 text-left">
                  <span className={isSea ? "text-white" : "text-zinc-400"}>{team.abbr}</span>
                </td>
                {periodLabels.map((_, pi) => {
                  const val = team.linescores[pi]
                  const isCur = isCurrentCol(pi, currentPeriod)
                  return (
                    <td
                      key={pi}
                      className={`w-6 text-center tabular-nums ${
                        isCur
                          ? "bg-red-500/20 text-red-400 font-bold rounded"
                          : val !== undefined
                          ? isSea ? "text-zinc-200" : "text-zinc-500"
                          : "text-zinc-700"
                      }`}
                    >
                      {val !== undefined ? val : "–"}
                    </td>
                  )
                })}
                <td
                  className={`w-6 text-center tabular-nums font-700 border-l border-zinc-700 ${
                    isSea ? "text-white" : "text-zinc-400"
                  }`}
                >
                  {Math.round(team.score)}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
