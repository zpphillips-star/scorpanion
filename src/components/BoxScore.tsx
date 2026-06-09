"use client"
import { useState, useEffect } from "react"

interface LineTeam {
  teamId: string
  abbr: string
  logo: string
  homeAway: string
  score: number
  linescores: number[]
  record: string
}

interface BoxScoreData {
  sportType: string
  periodLabels: string[]
  linescores: LineTeam[]
  stats: { teamId: string; abbr: string; statistics: { name: string; label: string; displayValue: string }[] }[]
  keyPlays: { text: string; period: string; clock: string; awayScore: number; homeScore: number }[]
}

// Sport-specific stat highlights
const BASEBALL_STATS = ["runs", "hits", "errors"]
const FOOTBALL_STATS = ["passingYards", "rushingYards", "totalYards", "turnovers"]
const HOCKEY_STATS = ["goals", "shots", "powerPlayGoals", "penaltyMinutes"]
const BASKETBALL_STATS = ["points", "fieldGoalsAttempted", "threePointFieldGoalsMade", "rebounds", "assists", "turnovers"]
const SOCCER_STATS = ["goals", "shotsOnTarget", "shots", "fouls", "yellowCards"]

function getHighlightStats(sportType: string): string[] {
  if (sportType === "baseball") return BASEBALL_STATS
  if (sportType === "football") return FOOTBALL_STATS
  if (sportType === "hockey") return HOCKEY_STATS
  if (sportType === "basketball") return BASKETBALL_STATS
  if (sportType === "soccer") return SOCCER_STATS
  return []
}

interface Props {
  eventId: string
  league: string
  seattleTeamId?: string
  color?: string
}

export default function BoxScore({ eventId, league, seattleTeamId, color = "#00d4ff" }: Props) {
  const [data, setData] = useState<BoxScoreData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!eventId) { setLoading(false); return }
    setLoading(true)
    setError(false)
    fetch(`/api/boxscore?eventId=${eventId}&league=${encodeURIComponent(league)}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { setData(d); setLoading(false) })
      .catch(() => { setError(true); setLoading(false) })
  }, [eventId, league])

  if (loading) {
    return (
      <div className="flex justify-center py-6">
        <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: color, borderTopColor: "transparent" }} />
      </div>
    )
  }

  if (error || !data || data.linescores.length === 0) return null

  const { sportType, periodLabels, linescores, stats } = data

  // For baseball, show R/H/E summary differently
  const isBaseball = sportType === "baseball"
  const highlightKeys = getHighlightStats(sportType)

  // Find each team's highlight stats
  const getTeamStat = (teamId: string, statName: string) => {
    const team = stats.find(t => t.teamId === teamId)
    return team?.statistics.find(s => s.name === statName || s.label?.toLowerCase() === statName.toLowerCase())?.displayValue ?? "–"
  }

  // For baseball: R/H/E inline with linescores
  const getRHE = (team: LineTeam) => ({
    R: String(Math.round(team.score)),
    H: getTeamStat(team.teamId, "hits"),
    E: getTeamStat(team.teamId, "errors"),
  })

  return (
    <div className="mt-1">
      {/* Section header */}
      <div className="flex items-center gap-3 px-5 pt-5 pb-3">
        <span className="font-display text-[15px] font-800 text-zinc-200 uppercase tracking-wider">Box Score</span>
        <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.12)" }} />
      </div>

      {/* Line score table */}
      {periodLabels.length > 0 && (
        <div className="px-3 overflow-x-auto no-scrollbar">
          <table className="w-full min-w-max text-right" style={{ borderCollapse: "separate", borderSpacing: 0 }}>
            <thead>
              <tr>
                <td className="text-left pr-3 pb-2 font-display text-[12px] text-zinc-600 uppercase tracking-wider w-12"></td>
                {periodLabels.map((label, i) => (
                  <td key={i} className="pb-2 px-2 font-display text-[13px] font-700 text-zinc-400 uppercase tracking-wider min-w-[32px]">{label}</td>
                ))}
                {isBaseball ? (
                  <>
                    <td className="pb-2 pl-3 pr-1 font-display text-[13px] font-700 text-zinc-200 uppercase border-l border-white/10">R</td>
                    <td className="pb-2 px-2 font-display text-[13px] font-600 text-zinc-400 uppercase">H</td>
                    <td className="pb-2 px-2 font-display text-[13px] font-600 text-zinc-400 uppercase">E</td>
                  </>
                ) : (
                  <td className="pb-2 pl-3 font-display text-[13px] font-700 text-zinc-200 uppercase border-l border-white/10">F</td>
                )}
              </tr>
            </thead>
            <tbody>
              {linescores.map((team, ti) => {
                const rhe = isBaseball ? getRHE(team) : null
                const isSea = team.abbr === "SEA" || (seattleTeamId && team.teamId === seattleTeamId)
                return (
                  <tr key={team.teamId}>
                    {/* Team abbr + logo */}
                    <td className="pr-3 py-2.5 text-left">
                      <div className="flex items-center gap-2">
                        {team.logo ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={team.logo} alt={team.abbr} width={22} height={22} className="object-contain flex-shrink-0" />
                        ) : (
                          <span className="w-5 h-5 rounded-full bg-white/10 flex-shrink-0" />
                        )}
                        <span className={`font-display text-[15px] font-700 ${isSea ? "text-white" : "text-zinc-400"}`}>{team.abbr}</span>
                      </div>
                    </td>
                    {/* Per-period scores */}
                    {periodLabels.map((_, pi) => {
                      const val = team.linescores[pi]
                      return (
                        <td key={pi} className="px-2 py-2.5 font-display text-[15px] font-600 tabular-nums" style={{ color: val !== undefined ? (isSea ? "#e4e4e7" : "#71717a") : "#3f3f46" }}>
                          {val !== undefined ? val : "–"}
                        </td>
                      )
                    })}
                    {/* Final / R-H-E */}
                    {isBaseball ? (
                      <>
                        <td className="pl-3 pr-1 py-2.5 font-display text-[18px] font-800 tabular-nums border-l border-white/10" style={{ color: isSea ? "#fff" : "#a1a1aa" }}>{rhe!.R}</td>
                        <td className="px-2 py-2.5 font-display text-[16px] font-600 tabular-nums text-zinc-400">{rhe!.H}</td>
                        <td className="px-2 py-2.5 font-display text-[16px] font-600 tabular-nums text-zinc-500">{rhe!.E}</td>
                      </>
                    ) : (
                      <td className="pl-3 py-2.5 font-display text-[18px] font-800 tabular-nums border-l border-white/10" style={{ color: isSea ? "#fff" : "#a1a1aa" }}>{Math.round(team.score)}</td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Key team stats */}
      {stats.length >= 2 && highlightKeys.length > 0 && (() => {
        const sharedStats = highlightKeys.filter(k =>
          stats.some(t => t.statistics.some(s => s.name === k || s.label?.toLowerCase() === k.toLowerCase()))
        )
        if (sharedStats.length === 0) return null
        const teamA = stats[0]
        const teamB = stats[1]
        return (
          <div className="px-3 mt-4 space-y-2 pb-3">
            <div className="flex items-center gap-3 px-2 pb-1">
              <span className="font-display text-[15px] font-800 text-zinc-200 uppercase tracking-wider">Team Stats</span>
              <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.12)" }} />
            </div>
            {sharedStats.map(key => {
              const sa = teamA.statistics.find(s => s.name === key || s.label?.toLowerCase() === key.toLowerCase())
              const sb = teamB.statistics.find(s => s.name === key || s.label?.toLowerCase() === key.toLowerCase())
              if (!sa && !sb) return null
              const label = sa?.label ?? sb?.label ?? key
              const vA = sa?.displayValue ?? "–"
              const vB = sb?.displayValue ?? "–"
              const numA = parseFloat(vA.replace(/[^\d.]/g, "")) || 0
              const numB = parseFloat(vB.replace(/[^\d.]/g, "")) || 0
              const total = numA + numB || 1
              const pctA = numA / total
              return (
                <div key={key} className="px-2 py-1.5">
                  <div className="flex justify-between mb-1.5">
                    <span className="font-display text-[14px] font-700 text-white tabular-nums">{vA}</span>
                    <span className="font-display text-[12px] text-zinc-400 uppercase tracking-wide">{label}</span>
                    <span className="font-display text-[14px] font-700 text-zinc-300 tabular-nums">{vB}</span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden flex" style={{ background: "var(--surface-2)" }}>
                    <div className="h-full rounded-l-full transition-all" style={{ width: `${pctA * 100}%`, background: color }} />
                  </div>
                </div>
              )
            })}
          </div>
        )
      })()}
    </div>
  )
}
