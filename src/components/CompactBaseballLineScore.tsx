"use client"
import { useState, useEffect } from "react"

interface LineTeam {
  teamId: string
  abbr: string
  logo: string
  homeAway: "home" | "away"
  score: number
  linescores: number[]
  record: string
  hits?: number
  errors?: number
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

function isCurrentCol(periodIdx: number, currentPeriod: number | null): boolean {
  if (currentPeriod === null) return false
  const inningCol = Math.ceil(currentPeriod / 2) - 1
  return periodIdx === inningCol
}

interface Props {
  gameId: string
  league: string
  seattleTeamId: string
  isLive: boolean
}

export default function CompactBaseballLineScore({ gameId, league, seattleTeamId, isLive }: Props) {
  const [data, setData] = useState<BoxScoreData | null>(null)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)

  const eventId = gameId.includes("|") ? gameId.split("|")[1] : gameId

  useEffect(() => {
    if (!eventId) { setLoading(false); return }
    setLoading(true)
    setFailed(false)
    fetch(`/api/boxscore?eventId=${encodeURIComponent(eventId)}&league=${encodeURIComponent(league)}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d && d.sportType === "baseball" && d.linescores?.length > 0) {
          setData(d)
        } else {
          setFailed(true)
        }
        setLoading(false)
      })
      .catch(() => { setFailed(true); setLoading(false) })
  }, [eventId, league])

  if (loading) {
    return (
      <div className="rounded-md p-2 mt-2 flex items-center gap-2" style={{ background: "rgba(255,255,255,0.04)" }}>
        <div className="w-3 h-3 border border-zinc-600 border-t-transparent rounded-full animate-spin flex-shrink-0" />
        <span className="text-[10px] text-zinc-600 uppercase tracking-wider">Loading line score…</span>
      </div>
    )
  }

  // If API failed or returned no data, show placeholder with dashes
  if (failed || !data) {
    const placeholder = ['1','2','3','4','5','6','7','8','9']
    return (
      <div className="rounded-md p-2 mt-2 overflow-x-auto no-scrollbar" style={{ background: "rgba(255,255,255,0.04)" }}>
        <table className="text-xs w-full" style={{ borderCollapse: "separate", borderSpacing: 0 }}>
          <thead>
            <tr>
              <th className="w-8 pb-1" />
              {placeholder.map(lbl => (
                <th key={lbl} className="w-5 text-center font-display font-600 pb-1 text-zinc-700">{lbl}</th>
              ))}
              <th className="w-5 text-center font-display font-700 text-zinc-500 pb-1 border-l border-zinc-700">R</th>
              <th className="w-5 text-center font-display font-600 text-zinc-600 pb-1">H</th>
              <th className="w-5 text-center font-display font-600 text-zinc-700 pb-1">E</th>
            </tr>
          </thead>
          <tbody>
            {['Away','Home'].map(side => (
              <tr key={side}>
                <td className="w-8 pr-1 font-display font-700 text-left text-zinc-600 text-[10px]">{side.slice(0,3).toUpperCase()}</td>
                {placeholder.map((_, i) => (
                  <td key={i} className="w-5 text-center text-zinc-800">–</td>
                ))}
                <td className="w-5 text-center tabular-nums font-700 border-l border-zinc-700 text-zinc-600">–</td>
                <td className="w-5 text-center text-zinc-700">–</td>
                <td className="w-5 text-center text-zinc-800">–</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  const { linescores, periodLabels, currentPeriod, stats } = data

  const sorted = [...linescores].sort((a, b) => {
    if (a.homeAway === "away" && b.homeAway !== "away") return -1
    if (b.homeAway === "away" && a.homeAway !== "away") return 1
    return 0
  })

  const getTeamStat = (teamId: string, statName: string): string => {
    const t = stats.find(s => s.teamId === teamId)
    return t?.statistics.find(s => s.name === statName || s.label?.toLowerCase().includes(statName))?.displayValue ?? "–"
  }

  return (
    <div className="rounded-md p-2 mt-2 overflow-x-auto no-scrollbar" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.06)" }}>
      <table className="text-xs w-full" style={{ borderCollapse: "separate", borderSpacing: 0 }}>
        <thead>
          <tr>
            <th className="w-8 pb-1" />
            {periodLabels.map((lbl, i) => {
              const isCur = isLive && isCurrentCol(i, currentPeriod)
              return (
                <th key={i} className={`w-5 text-center font-display font-600 pb-1 ${isCur ? "text-red-400" : "text-zinc-600"}`}>
                  {lbl}
                </th>
              )
            })}
            <th className="w-5 text-center font-display font-700 text-zinc-200 pb-1 border-l border-zinc-700">R</th>
            <th className="w-5 text-center font-display font-600 text-zinc-500 pb-1">H</th>
            <th className="w-5 text-center font-display font-600 text-zinc-700 pb-1">E</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((team) => {
            const isSea = team.teamId === seattleTeamId || team.abbr === "SEA"
            const R = String(Math.round(team.score))
            const H = team.hits !== undefined ? String(team.hits) : getTeamStat(team.teamId, "hits")
            const E = team.errors !== undefined ? String(team.errors) : getTeamStat(team.teamId, "errors")

            return (
              <tr key={team.teamId}>
                <td className="w-8 pr-1 font-display font-700 text-left">
                  <span className={isSea ? "text-white" : "text-zinc-400"}>{team.abbr}</span>
                </td>
                {periodLabels.map((_, pi) => {
                  const val = team.linescores[pi]
                  const isCur = isLive && isCurrentCol(pi, currentPeriod)
                  const unplayed = val === undefined
                  const showX = unplayed && team.homeAway === "home" && pi >= team.linescores.length
                  return (
                    <td key={pi} className={`w-5 text-center tabular-nums ${
                      isCur ? "bg-red-500/20 text-red-400 font-bold rounded"
                        : !unplayed ? (isSea ? "text-zinc-200" : "text-zinc-500") : "text-zinc-700"
                    }`}>
                      {unplayed ? (showX ? "x" : "–") : val}
                    </td>
                  )
                })}
                <td className={`w-5 text-center tabular-nums font-700 border-l border-zinc-700 ${isSea ? "text-white" : "text-zinc-400"}`}>{R}</td>
                <td className="w-5 text-center tabular-nums text-zinc-400">{H}</td>
                <td className="w-5 text-center tabular-nums text-zinc-600">{E}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

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

