"use client"
import { useState, useEffect } from "react"

// ─── Minimal types for boxscore API response ──────────────────────────────────

interface LineTeam {
  teamId: string
  abbr: string
  logo: string
  homeAway: "home" | "away"
  score: number
  linescores: number[]
  record: string
}

interface TeamStat {
  teamId: string
  abbr: string
  statistics: { name: string; label: string; displayValue: string }[]
}

interface BoxScoreData {
  sportType: string
  periodLabels: string[]
  linescores: LineTeam[]
  stats: TeamStat[]
  currentPeriod: number | null
}

// ─── Helper: is this column index the currently-live inning? ─────────────────

function isCurrentCol(periodIdx: number, currentPeriod: number | null): boolean {
  if (currentPeriod === null) return false
  // ESPN baseball: period = half-inning (1 = top 1st, 2 = bot 1st, 3 = top 2nd …)
  const inningCol = Math.ceil(currentPeriod / 2) - 1
  return periodIdx === inningCol
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  /** Raw game.id — may be prefixed like "mariners|401234567" */
  gameId: string
  /** e.g. "mlb" */
  league: string
  /** ESPN team ID for the Seattle team */
  seattleTeamId: string
  /** Whether the game is currently live (controls column highlight) */
  isLive: boolean
}

// ─── CompactBaseballLineScore ─────────────────────────────────────────────────

export default function CompactBaseballLineScore({ gameId, league, seattleTeamId, isLive }: Props) {
  const [data, setData] = useState<BoxScoreData | null>(null)
  const [loading, setLoading] = useState(true)

  // Strip the "teamId|espnEventId" prefix if present
  const eventId = gameId.includes("|") ? gameId.split("|")[1] : gameId

  useEffect(() => {
    if (!eventId) { setLoading(false); return }
    setLoading(true)
    fetch(`/api/boxscore?eventId=${encodeURIComponent(eventId)}&league=${encodeURIComponent(league)}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [eventId, league])

  if (loading) {
    return (
      <div className="bg-zinc-800/60 rounded-lg p-2 mt-2 flex justify-center">
        <div className="w-3 h-3 border border-zinc-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!data || data.sportType !== "baseball" || data.linescores.length === 0) return null

  const { linescores, periodLabels, currentPeriod, stats } = data

  // Away on top, home on bottom — standard baseball convention
  const sorted = [...linescores].sort((a, b) => {
    if (a.homeAway === "away" && b.homeAway !== "away") return -1
    if (b.homeAway === "away" && a.homeAway !== "away") return 1
    return 0
  })

  const getTeamStat = (teamId: string, statName: string): string => {
    const t = stats.find(s => s.teamId === teamId)
    return (
      t?.statistics.find(
        s => s.name === statName || s.label?.toLowerCase().includes(statName)
      )?.displayValue ?? "–"
    )
  }

  return (
    <div className="bg-zinc-800/60 rounded-lg p-2 mt-2 overflow-x-auto no-scrollbar">
      <table className="text-xs w-full" style={{ borderCollapse: "separate", borderSpacing: 0 }}>
        <thead>
          <tr>
            {/* Team abbr header — empty */}
            <th className="w-8 pb-1" />
            {periodLabels.map((lbl, i) => {
              const isCur = isLive && isCurrentCol(i, currentPeriod)
              return (
                <th
                  key={i}
                  className={`w-5 text-center font-display font-600 pb-1 ${
                    isCur ? "text-red-400" : "text-zinc-600"
                  }`}
                >
                  {lbl}
                </th>
              )
            })}
            {/* R / H / E */}
            <th className="pl-2 text-center font-display font-700 text-zinc-200 pb-1 border-l border-zinc-700">R</th>
            <th className="px-1 text-center font-display font-600 text-zinc-500 pb-1">H</th>
            <th className="px-1 text-center font-display font-600 text-zinc-700 pb-1">E</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((team) => {
            const isSea = team.teamId === seattleTeamId || team.abbr === "SEA"
            const R = String(Math.round(team.score))
            const H = getTeamStat(team.teamId, "hits")
            const E = getTeamStat(team.teamId, "errors")

            return (
              <tr key={team.teamId}>
                {/* Team abbr */}
                <td className="w-8 pr-1 font-display font-700 text-left">
                  <span className={isSea ? "text-white" : "text-zinc-400"}>{team.abbr}</span>
                </td>

                {/* Inning cells */}
                {periodLabels.map((_, pi) => {
                  const val = team.linescores[pi]
                  const isCur = isLive && isCurrentCol(pi, currentPeriod)
                  const unplayed = val === undefined
                  // Show "x" for home team's unplayed half-inning only in 9th+ when they've won
                  const showX = unplayed && team.homeAway === "home" && pi >= team.linescores.length

                  return (
                    <td
                      key={pi}
                      className={`w-5 text-center tabular-nums ${
                        isCur
                          ? "bg-red-500/20 text-red-400 font-bold rounded"
                          : !unplayed
                          ? isSea
                            ? "text-zinc-200"
                            : "text-zinc-500"
                          : "text-zinc-700"
                      }`}
                    >
                      {unplayed ? (showX ? "x" : "") : val}
                    </td>
                  )
                })}

                {/* R / H / E totals */}
                <td
                  className={`pl-2 text-center tabular-nums font-700 border-l border-zinc-700 ${
                    isSea ? "text-white" : "text-zinc-400"
                  }`}
                >
                  {R}
                </td>
                <td className="px-1 text-center tabular-nums text-zinc-400">{H}</td>
                <td className="px-1 text-center tabular-nums text-zinc-600">{E}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
