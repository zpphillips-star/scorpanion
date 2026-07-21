"use client"
import { useState, useEffect } from "react"

// ─── Types ────────────────────────────────────────────────────────────────────

interface LineTeam {
  teamId: string
  abbr: string
  logo: string
  homeAway: string
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

interface TopScorer {
  teamId: string
  abbr: string
  name: string
  pts: string
  reb: string
  ast: string
}

interface TopBatter {
  teamId: string
  name: string
  ab: string
  h: string
  hr: string
  rbi: string
}

interface GoalScorer {
  teamId: string
  name: string
  minute: string
  type: string
}

interface BoxScoreData {
  sportType: string
  periodLabels: string[]
  linescores: LineTeam[]
  stats: TeamStat[]
  keyPlays: { text: string; period: string; clock: string; awayScore: number; homeScore: number }[]
  currentPeriod: number | null
  pitchers: {
    winning: { name: string; line: string } | null
    losing:  { name: string; line: string } | null
    saving:  { name: string; line: string } | null
  } | null
  topScorers: TopScorer[]
  topBatters?: TopBatter[]
  shotsOnGoal: { teamId: string; abbr: string; value: string }[]
  isShootout: boolean
  goalScorers: GoalScorer[]
  pitcherList?: { teamId: string; name: string; ip: string; era: string }[]
}

// ─── Stat highlight keys per sport ────────────────────────────────────────────

const BASEBALL_STATS: string[] = []
const FOOTBALL_STATS    = ["passingYards", "rushingYards", "totalYards", "turnovers"]
const HOCKEY_STATS      = ["goals", "powerPlayGoals", "penaltyMinutes"]
const BASKETBALL_STATS  = ["fieldGoalsAttempted", "threePointFieldGoalsMade", "rebounds", "assists", "turnovers"]
const SOCCER_STATS      = ["shotsOnTarget", "shots", "fouls", "yellowCards"]

function getHighlightStats(sportType: string): string[] {
  if (sportType === "baseball")   return BASEBALL_STATS
  if (sportType === "football")   return FOOTBALL_STATS
  if (sportType === "hockey")     return HOCKEY_STATS
  if (sportType === "basketball") return BASKETBALL_STATS
  if (sportType === "soccer")     return SOCCER_STATS
  return []
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  eventId: string
  league: string
  seattleTeamId?: string
  color?: string
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

const CELL  = "px-2 py-4 font-display tabular-nums text-center"
const HDR   = "pb-3 px-2 font-display text-[12px] font-700 text-zinc-500 uppercase tracking-wider text-center"
const TEAM_CELL = "pr-3 py-4 text-left"

/** Returns true when the column index corresponds to the live period */
function isCurrentCol(periodIdx: number, currentPeriod: number | null, sportType: string): boolean {
  if (currentPeriod === null) return false
  if (sportType === "baseball") {
    // ESPN baseball: period = half-inning (1=top1, 2=bot1, 3=top2 …)
    const inningCol = Math.ceil(currentPeriod / 2) - 1
    return periodIdx === inningCol
  }
  return periodIdx === currentPeriod - 1
}

// ─── Team label cell (logo + abbr) ────────────────────────────────────────────

function TeamCell({ team, isSea }: { team: LineTeam; isSea: boolean }) {
  return (
    <td className={TEAM_CELL}>
      <div className="flex items-center gap-2 min-w-[52px]">
        {team.logo
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={team.logo} alt={team.abbr} width={20} height={20} className="object-contain flex-shrink-0" />
          : <span className="w-5 h-5 rounded-full bg-white/10 flex-shrink-0" />}
        <span className={`font-display text-[14px] font-700 ${isSea ? "text-white" : "text-zinc-400"}`}>{team.abbr}</span>
      </div>
    </td>
  )
}

// ─── Section header — WC-style hairline-flanked centered label ───────────────

function SectionHeader({ label, first = false }: { label: string; first?: boolean }) {
  return (
    <div className={`flex items-center gap-2 ${first ? "pt-1" : "pt-6"} pb-3 px-1`}>
      <div className="flex-1 h-px bg-zinc-700/50" />
      <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">{label}</span>
      <div className="flex-1 h-px bg-zinc-700/50" />
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// SPORT-SPECIFIC SCOREBOARD TABLES
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Baseball ─────────────────────────────────────────────────────────────────

function BaseballScoreboard({ data, seattleTeamId }: { data: BoxScoreData; seattleTeamId?: string }) {
  const { linescores, periodLabels, currentPeriod, topBatters, pitcherList } = data

  return (
    <>
      <SectionHeader label="Line Score" first />
      <div className="px-3 overflow-x-auto">
        <table className="min-w-max w-full" style={{ borderCollapse: "separate", borderSpacing: 0 }}>
          <thead>
            <tr>
              <th className={`${HDR} text-left pr-3 w-14`}></th>
              {periodLabels.map((lbl, i) => {
                const isCur = isCurrentCol(i, currentPeriod, "baseball")
                return (
                  <th key={i} className={`${HDR} ${isCur ? "text-red-400" : ""}`}>{lbl}</th>
                )
              })}
              {/* R / H / E header — same width as inning cols, subtle divider via border-l only (no extra padding) */}
              <th className={`${HDR} border-l border-zinc-700 text-zinc-300`}>R</th>
              <th className={`${HDR}`}>H</th>
              <th className={`${HDR} text-zinc-600`}>E</th>
            </tr>
          </thead>
          <tbody>
            {linescores.map((team) => {
              const isSea = (seattleTeamId && team.teamId === seattleTeamId) || team.abbr === "SEA"
              const R = String(Math.round(team.score))
              const H = team.hits !== undefined ? String(team.hits) : "–"
              const E = team.errors !== undefined ? String(team.errors) : "–"
              return (
                <tr key={team.teamId} className="border-t border-zinc-500/65">
                  <TeamCell team={team} isSea={!!isSea} />
                  {periodLabels.map((_, pi) => {
                    const val = team.linescores[pi]
                    const isCur = isCurrentCol(pi, currentPeriod, "baseball")
                    return (
                      <td key={pi} className={`${CELL} text-[15px] font-600 ${
                        isCur ? "bg-zinc-800 rounded" : ""
                      } ${val !== undefined ? (isSea ? "text-zinc-200" : "text-zinc-500") : "text-zinc-700"}`}>
                        {val !== undefined ? val : (pi >= team.linescores.length && team.homeAway === "home" ? "x" : "–")}
                      </td>
                    )
                  })}
                  {/* R / H / E — same width as inning cols */}
                  <td className={`${CELL} text-[17px] font-800 border-l border-zinc-700 ${isSea ? "text-white" : "text-zinc-400"}`}>{R}</td>
                  <td className={`${CELL} text-[15px] font-600 text-zinc-400`}>{H}</td>
                  <td className={`${CELL} text-[15px] font-600 text-zinc-600`}>{E}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Top Performers — mirrors WNBA Top Scorers exactly */}
      {topBatters && topBatters.length > 0 && (() => {
        const awayId = linescores[0]?.teamId
        const homeId = linescores[1]?.teamId
        const awayBatters = topBatters.filter(b => b.teamId === awayId)
        const homeBatters = topBatters.filter(b => b.teamId === homeId)
        if (awayBatters.length === 0 && homeBatters.length === 0) return null
        return (
          <>
            <SectionHeader label="Top Performers" />
            <div className="pb-2">
              {/* Single header row */}
              <div className="flex items-center pb-1.5 mb-1 border-b border-zinc-500/65">
                <div className="flex-1" />
                <div className="flex gap-3 text-[10px] font-bold text-zinc-600 uppercase tracking-widest tabular-nums">
                  <span className="w-8 text-center">H</span>
                  <span className="w-8 text-center">HR</span>
                  <span className="w-8 text-center">RBI</span>
                </div>
              </div>
              {/* Away team group */}
              {awayBatters.length > 0 && (
                <div className="relative overflow-hidden">
                  {linescores[0]?.logo && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={linescores[0].logo} alt="" aria-hidden className="absolute pointer-events-none select-none"
                      style={{ width: 64, height: 64, opacity: 0.08, objectFit: "contain", top: "50%", left: "50%", transform: "translate(-50%,-50%)" }} />
                  )}
                  {awayBatters.map((b, idx) => (
                    <div key={idx} className="relative flex items-center py-2.5">
                      <span className={`flex-1 text-[14px] font-semibold truncate ${b.teamId === seattleTeamId ? "text-white" : "text-zinc-200"}`}>{b.name}</span>
                      <div className="flex gap-3 text-[14px] font-bold tabular-nums">
                        <span className="w-8 text-center text-zinc-200">{b.h}</span>
                        <span className="w-8 text-center text-zinc-400">{b.hr}</span>
                        <span className="w-8 text-center text-zinc-400">{b.rbi}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {/* Home team group — separated by border, same as WNBA */}
              {homeBatters.length > 0 && (
                <div className={`relative overflow-hidden ${awayBatters.length > 0 ? "mt-3 pt-3 border-t-2 border-zinc-800" : ""}`}>
                  {linescores[1]?.logo && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={linescores[1].logo} alt="" aria-hidden className="absolute pointer-events-none select-none"
                      style={{ width: 64, height: 64, opacity: 0.08, objectFit: "contain", top: "50%", left: "50%", transform: "translate(-50%,-50%)" }} />
                  )}
                  {homeBatters.map((b, idx) => (
                    <div key={idx} className="relative flex items-center py-2.5">
                      <span className={`flex-1 text-[14px] font-semibold truncate ${b.teamId === seattleTeamId ? "text-white" : "text-zinc-200"}`}>{b.name}</span>
                      <div className="flex gap-3 text-[14px] font-bold tabular-nums">
                        <span className="w-8 text-center text-zinc-200">{b.h}</span>
                        <span className="w-8 text-center text-zinc-400">{b.hr}</span>
                        <span className="w-8 text-center text-zinc-400">{b.rbi}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )
      })()}

      {/* Pitching — full pitcher list with IP / game ERA */}
      {pitcherList && pitcherList.length > 0 && (() => {
        const awayId = linescores[0]?.teamId
        const homeId = linescores[1]?.teamId
        const awayPitchers = pitcherList.filter(p => p.teamId === awayId)
        const homePitchers = pitcherList.filter(p => p.teamId === homeId)
        if (awayPitchers.length === 0 && homePitchers.length === 0) return null
        const PitchHeader = () => (
          <div className="flex items-center pb-1.5 mb-1 border-b border-zinc-500/65">
            <div className="flex-1" />
            <div className="flex gap-3 text-[10px] font-bold text-zinc-600 uppercase tracking-widest tabular-nums">
              <span className="w-8 text-center">IP</span>
              <span className="w-8 text-center">ERA</span>
            </div>
          </div>
        )
        return (
          <>
            <SectionHeader label="Pitching" />
            <div className="px-3 grid grid-cols-2 gap-x-4 pb-2">
              {/* Away pitchers */}
              <div className="min-w-0 overflow-hidden">
                <PitchHeader />
                {awayPitchers.map((p, idx) => (
                  <div key={idx} className="flex items-center py-2.5 min-w-0">
                    <span className="flex-1 text-[14px] font-semibold text-zinc-200 truncate min-w-0 pr-1">{p.name}</span>
                    <div className="flex gap-3 text-[14px] font-bold tabular-nums flex-shrink-0">
                      <span className="w-8 text-center text-zinc-400">{p.ip}</span>
                      <span className="w-8 text-center text-zinc-400">{p.era}</span>
                    </div>
                  </div>
                ))}
              </div>
              {/* Home pitchers */}
              <div className="min-w-0 overflow-hidden">
                <PitchHeader />
                {homePitchers.map((p, idx) => (
                  <div key={idx} className="flex items-center py-2.5 min-w-0">
                    <span className="flex-1 text-[14px] font-semibold text-zinc-200 truncate min-w-0 pr-1">{p.name}</span>
                    <div className="flex gap-3 text-[14px] font-bold tabular-nums flex-shrink-0">
                      <span className="w-8 text-center text-zinc-400">{p.ip}</span>
                      <span className="w-8 text-center text-zinc-400">{p.era}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )
      })()}
    </>
  )
}

// ─── Basketball ───────────────────────────────────────────────────────────────

function BasketballScoreboard({ data, seattleTeamId, color }: { data: BoxScoreData; seattleTeamId?: string; color: string }) {
  const { linescores, periodLabels, currentPeriod, topScorers } = data

  // Group scorers by team
  const scoresByTeam: Record<string, TopScorer[]> = {}
  for (const s of topScorers) {
    if (!scoresByTeam[s.teamId]) scoresByTeam[s.teamId] = []
    scoresByTeam[s.teamId].push(s)
  }

  return (
    <>
      <SectionHeader label="Score by Quarter" first />
      <div className="px-3 overflow-x-auto no-scrollbar">
        <table className="w-full min-w-max" style={{ borderCollapse: "separate", borderSpacing: 0 }}>
          <thead>
            <tr>
              <th className={`${HDR} text-left pr-3 w-14`}></th>
              {periodLabels.map((lbl, i) => {
                const isCur = isCurrentCol(i, currentPeriod, "basketball")
                return (
                  <th key={i} className={`${HDR} ${isCur ? "text-red-400" : ""}`}>{lbl}</th>
                )
              })}
              <th className="pb-2 pl-4 font-display text-[14px] font-700 text-zinc-200 uppercase border-l-2 border-zinc-700 text-center">T</th>
            </tr>
          </thead>
          <tbody>
            {linescores.map((team) => {
              const isSea = (seattleTeamId && team.teamId === seattleTeamId) || team.abbr === "SEA"
              return (
                <tr key={team.teamId} className="border-t border-zinc-500/65">
                  <TeamCell team={team} isSea={!!isSea} />
                  {periodLabels.map((_, pi) => {
                    const val = team.linescores[pi]
                    const isCur = isCurrentCol(pi, currentPeriod, "basketball")
                    return (
                      <td key={pi} className={`${CELL} text-[15px] font-600 ${
                        isCur ? "bg-zinc-800 rounded font-700 text-white" : ""
                      } ${val !== undefined ? (isSea ? "text-zinc-200" : "text-zinc-500") : "text-zinc-700"}`}>
                        {val !== undefined ? val : "–"}
                      </td>
                    )
                  })}
                  <td className={`${CELL} pl-4 text-[18px] font-800 border-l-2 border-zinc-700 ${isSea ? "text-white" : "text-zinc-400"}`}>
                    {Math.round(team.score)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Top Scorers */}
      {topScorers.length > 0 && (
        <>
          <SectionHeader label="Top Scorers" />
          <div className="pb-2">
            {/* Column header — matches player rows */}
            <div className="flex items-center pb-1.5 mb-1 border-b border-zinc-500/65">
              <div className="flex-1" />
              <div className="flex gap-3 text-[10px] font-bold text-zinc-600 uppercase tracking-widest tabular-nums">
                <span className="w-8 text-center">PTS</span>
                <span className="w-8 text-center">REB</span>
                <span className="w-8 text-center">AST</span>
              </div>
            </div>
            {linescores.map((team, teamIdx) => {
              const teamScorers = scoresByTeam[team.teamId] ?? []
              if (teamScorers.length === 0) return null
              return (
                <div key={team.teamId} className={`relative overflow-hidden ${teamIdx > 0 ? "mt-3 pt-3 border-t-2 border-zinc-800" : ""}`}>
                  {/* Ghost watermark — contained, won't overflow */}
                  {team.logo && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={team.logo}
                      alt=""
                      aria-hidden
                      className="absolute pointer-events-none select-none"
                      style={{ width: 64, height: 64, opacity: 0.08, objectFit: "contain", top: "50%", left: "50%", transform: "translate(-50%, -50%)" }}
                    />
                  )}
                  {teamScorers.map((s, idx) => (
                    <div key={idx} className="relative flex items-center py-2.5">
                      <span className="flex-1 text-[14px] font-semibold text-zinc-200 truncate">{s.name}</span>
                      <div className="flex gap-3 text-[14px] font-bold tabular-nums">
                        <span className="w-8 text-center text-zinc-200">{s.pts}</span>
                        <span className="w-8 text-center text-zinc-400">{s.reb}</span>
                        <span className="w-8 text-center text-zinc-400">{s.ast}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        </>
      )}
    </>
  )
}

// ─── Hockey ───────────────────────────────────────────────────────────────────

function HockeyScoreboard({ data, seattleTeamId }: { data: BoxScoreData; seattleTeamId?: string }) {
  const { linescores, periodLabels, currentPeriod, shotsOnGoal, isShootout } = data

  // Map SOG by teamId
  const sogMap: Record<string, string> = {}
  for (const s of shotsOnGoal) sogMap[s.teamId] = s.value

  const winner = isShootout
    ? linescores.reduce((a, b) => a.score > b.score ? a : b, linescores[0])
    : null

  return (
    <>
      <SectionHeader label="Score by Period" first />
      <div className="px-3 overflow-x-auto no-scrollbar">
        <table className="w-full min-w-max" style={{ borderCollapse: "separate", borderSpacing: 0 }}>
          <thead>
            <tr>
              <th className={`${HDR} text-left pr-3 w-14`}></th>
              {periodLabels.map((lbl, i) => {
                const isCur = isCurrentCol(i, currentPeriod, "hockey")
                return (
                  <th key={i} className={`${HDR} ${isCur ? "text-red-400" : ""}`}>{lbl}</th>
                )
              })}
              <th className="pb-2 pl-4 font-display text-[14px] font-700 text-zinc-200 uppercase border-l-2 border-zinc-700 text-center">T</th>
              {shotsOnGoal.length > 0 && (
                <th className="pb-2 pl-3 font-display text-[14px] font-600 text-zinc-500 uppercase text-center">SOG</th>
              )}
            </tr>
          </thead>
          <tbody>
            {linescores.map((team) => {
              const isSea = (seattleTeamId && team.teamId === seattleTeamId) || team.abbr === "SEA"
              const isWinner = winner?.teamId === team.teamId
              return (
                <tr key={team.teamId} className="border-t border-zinc-500/65">
                  <TeamCell team={team} isSea={!!isSea} />
                  {periodLabels.map((lbl, pi) => {
                    const val = team.linescores[pi]
                    const isCur = isCurrentCol(pi, currentPeriod, "hockey")
                    return (
                      <td key={pi} className={`${CELL} text-[15px] font-600 ${
                        isCur ? "bg-zinc-800 rounded font-700 text-white" : ""
                      } ${val !== undefined ? (isSea ? "text-zinc-200" : "text-zinc-500") : "text-zinc-700"}`}>
                        {lbl === "SO" && val !== undefined ? (isWinner ? "✓" : "–") : (val !== undefined ? val : "–")}
                      </td>
                    )
                  })}
                  <td className={`${CELL} pl-4 text-[18px] font-800 border-l-2 border-zinc-700 ${isSea ? "text-white" : "text-zinc-400"}`}>
                    {Math.round(team.score)}
                    {isShootout && isWinner && <span className="text-[11px] text-zinc-500 ml-1">(SO)</span>}
                  </td>
                  {shotsOnGoal.length > 0 && (
                    <td className={`${CELL} pl-3 text-[14px] font-600 text-zinc-500`}>{sogMap[team.teamId] ?? "–"}</td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </>
  )
}

// ─── Football ─────────────────────────────────────────────────────────────────

function FootballScoreboard({ data, seattleTeamId }: { data: BoxScoreData; seattleTeamId?: string }) {
  const { linescores, periodLabels, currentPeriod } = data
  return (
    <>
      <SectionHeader label="Score by Quarter" first />
      <div className="px-3 overflow-x-auto no-scrollbar">
        <table className="w-full min-w-max" style={{ borderCollapse: "separate", borderSpacing: 0 }}>
          <thead>
            <tr>
              <th className={`${HDR} text-left pr-3 w-14`}></th>
              {periodLabels.map((lbl, i) => {
                const isCur = isCurrentCol(i, currentPeriod, "football")
                return (
                  <th key={i} className={`${HDR} ${isCur ? "text-red-400" : ""}`}>{lbl}</th>
                )
              })}
              <th className="pb-2 pl-4 font-display text-[14px] font-700 text-zinc-200 uppercase border-l-2 border-zinc-700 text-center">T</th>
            </tr>
          </thead>
          <tbody>
            {linescores.map((team) => {
              const isSea = (seattleTeamId && team.teamId === seattleTeamId) || team.abbr === "SEA"
              return (
                <tr key={team.teamId} className="border-t border-zinc-500/65">
                  <TeamCell team={team} isSea={!!isSea} />
                  {periodLabels.map((_, pi) => {
                    const val = team.linescores[pi]
                    const isCur = isCurrentCol(pi, currentPeriod, "football")
                    return (
                      <td key={pi} className={`${CELL} text-[15px] font-600 ${
                        isCur ? "bg-zinc-800 rounded font-700 text-white" : ""
                      } ${val !== undefined ? (isSea ? "text-zinc-200" : "text-zinc-500") : "text-zinc-700"}`}>
                        {val !== undefined ? val : "–"}
                      </td>
                    )
                  })}
                  <td className={`${CELL} pl-4 text-[18px] font-800 border-l-2 border-zinc-700 ${isSea ? "text-white" : "text-zinc-400"}`}>
                    {Math.round(team.score)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </>
  )
}

// ─── Soccer ───────────────────────────────────────────────────────────────────

function SoccerScoreboard({ data }: { data: BoxScoreData; seattleTeamId?: string }) {
  const { linescores, goalScorers } = data
  if (linescores.length < 2) return null

  // Identify home vs away by the homeAway flag on each linescore entry
  const homeEntry = linescores.find(t => t.homeAway === "home") ?? linescores[1]
  const awayEntry = linescores.find(t => t.homeAway === "away") ?? linescores[0]
  const homeTeamId = homeEntry.teamId
  const awayTeamId = awayEntry.teamId
  const homeAbbr   = homeEntry.abbr
  const awayAbbr   = awayEntry.abbr

  // Sort goals chronologically; minute strings may include "+" for stoppage (e.g. "45+2")
  const sorted = [...goalScorers].sort((a, b) => {
    const parse = (m: string) => { const [base, extra = "0"] = m.split("+"); return parseInt(base) * 100 + parseInt(extra) }
    return parse(a.minute) - parse(b.minute)
  })

  // Goal type suffix — matches WCScores: (OG) for own goal, (P) for penalty
  const goalSuffix = (type: string) => {
    if (/own.?goal/i.test(type)) return " (OG)"
    if (/penalty/i.test(type)) return " (P)"
    return ""
  }

  return (
    <>
      <SectionHeader label="Goals" first />
      <div className="mb-6">
        {/* Team abbreviation column headers */}
        <div
          className="grid items-center w-full mb-2"
          style={{ gridTemplateColumns: "1fr 40px 1fr", columnGap: "8px" }}
        >
          <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest text-right">
            {awayAbbr}
          </span>
          <span />
          <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest text-left">
            {homeAbbr}
          </span>
        </div>

        {goalScorers.length === 0 ? (
          <div className="text-center text-[12px] text-zinc-600 py-3">No goals recorded</div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {sorted.map((s, i) => {
              const isHome = s.teamId === homeTeamId
              const label  = s.name + goalSuffix(s.type)
              // minute display: include stoppage time portion if present (e.g. "45+2′")
              const minDisplay = s.minute.includes("+")
                ? s.minute.replace("+", "+") + "′"
                : s.minute + "′"
              return (
                <div
                  key={i}
                  className="grid items-center w-full"
                  style={{ gridTemplateColumns: "1fr 40px 1fr", columnGap: "8px" }}
                >
                  {/* Away scorer — right-aligned on left column */}
                  <span className="text-[12px] text-white font-semibold text-right leading-snug">
                    {!isHome ? label : ""}
                  </span>
                  {/* Minute — dimmed, centered */}
                  <span className="text-[11px] text-zinc-500 font-medium leading-none text-center tabular-nums">
                    {minDisplay}
                  </span>
                  {/* Home scorer — left-aligned on right column */}
                  <span className="text-[12px] text-white font-semibold text-left leading-snug">
                    {isHome ? label : ""}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}

// ─── Generic fallback (other sports) ─────────────────────────────────────────

function GenericScoreboard({ data, seattleTeamId }: { data: BoxScoreData; seattleTeamId?: string }) {
  const { linescores, periodLabels, currentPeriod, sportType } = data
  return (
    <>
      <SectionHeader label="Score" first />
      <div className="px-3 overflow-x-auto no-scrollbar">
        <table className="w-full min-w-max" style={{ borderCollapse: "separate", borderSpacing: 0 }}>
          <thead>
            <tr>
              <th className={`${HDR} text-left pr-3 w-14`}></th>
              {periodLabels.map((lbl, i) => {
                const isCur = isCurrentCol(i, currentPeriod, sportType)
                return (
                  <th key={i} className={`${HDR} ${isCur ? "text-red-400" : ""}`}>{lbl}</th>
                )
              })}
              <th className="pb-2 pl-4 font-display text-[14px] font-700 text-zinc-200 uppercase border-l-2 border-zinc-700 text-center">T</th>
            </tr>
          </thead>
          <tbody>
            {linescores.map((team) => {
              const isSea = (seattleTeamId && team.teamId === seattleTeamId) || team.abbr === "SEA"
              return (
                <tr key={team.teamId} className="border-t border-zinc-500/65">
                  <TeamCell team={team} isSea={!!isSea} />
                  {periodLabels.map((_, pi) => {
                    const val = team.linescores[pi]
                    const isCur = isCurrentCol(pi, currentPeriod, sportType)
                    return (
                      <td key={pi} className={`${CELL} text-[15px] font-600 ${
                        isCur ? "bg-zinc-800 rounded font-700 text-white" : ""
                      } ${val !== undefined ? (isSea ? "text-zinc-200" : "text-zinc-500") : "text-zinc-700"}`}>
                        {val !== undefined ? val : "–"}
                      </td>
                    )
                  })}
                  <td className={`${CELL} pl-4 text-[18px] font-800 border-l-2 border-zinc-700 ${isSea ? "text-white" : "text-zinc-400"}`}>
                    {Math.round(team.score)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </>
  )
}

// ─── Team Stats Bar ───────────────────────────────────────────────────────────

function TeamStatsSection({ data, color }: { data: BoxScoreData; color: string }) {
  const { sportType, stats } = data
  if (stats.length < 2) return null

  const highlightKeys = getHighlightStats(sportType)
  const teamA = stats[0]
  const teamB = stats[1]

  const sharedStats = highlightKeys.filter(k =>
    stats.some(t => t.statistics.some(s => s.name === k || s.label?.toLowerCase().includes(k.toLowerCase())))
  )
  if (sharedStats.length === 0) return null

  return (
    <>
      <SectionHeader label="Team Stats" />
      {sharedStats.map(key => {
          const sa = teamA.statistics.find(s => s.name === key || s.label?.toLowerCase().includes(key.toLowerCase()))
          const sb = teamB.statistics.find(s => s.name === key || s.label?.toLowerCase().includes(key.toLowerCase()))
          if (!sa && !sb) return null
          const label = sa?.label ?? sb?.label ?? key
          const vA = sa?.displayValue ?? "–"
          const vB = sb?.displayValue ?? "–"
          const numA = parseFloat(vA.replace(/[^\d.]/g, "")) || 0
          const numB = parseFloat(vB.replace(/[^\d.]/g, "")) || 0
          const total = numA + numB || 1
          const pctA = numA / total
          return (
            <div key={key} className="px-5 py-5 border-b border-zinc-500/60 last:border-0">
              <div className="flex justify-between items-baseline mb-3">
                <span className="font-display text-[15px] font-700 text-white tabular-nums">{vA}</span>
                <span className="font-display text-[10px] font-700 text-zinc-500 uppercase tracking-[0.12em]">{label}</span>
                <span className="font-display text-[15px] font-700 text-zinc-400 tabular-nums">{vB}</span>
              </div>
              <div className="h-[3px] overflow-hidden flex" style={{ background: "rgba(255,255,255,0.15)" }}>
                <div className="h-full transition-all" style={{ width: `${pctA * 100}%`, background: color }} />
              </div>
            </div>
          )
        })}
    </>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN EXPORT
// ═══════════════════════════════════════════════════════════════════════════════

export default function BoxScore({ eventId, league, seattleTeamId, color = "#00d4ff" }: Props) {
  const [data, setData] = useState<BoxScoreData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [fromCache, setFromCache] = useState(false)

  useEffect(() => {
    if (!eventId) { setLoading(false); return }
    setLoading(true)
    setError(false)
    setFromCache(false)

    const cacheKey = `bsc:${eventId}:${league}`

    fetch(`/api/boxscore?eventId=${eventId}&league=${encodeURIComponent(league)}`)
      .then(r => r.ok ? r.json() : null)
      .then((d: BoxScoreData | null) => {
        if (d && d.linescores && d.linescores.length > 0) {
          // Fresh data — persist to localStorage for future stale fallback
          try { localStorage.setItem(cacheKey, JSON.stringify(d)) } catch { /* quota */ }
          setData(d)
          setFromCache(false)
        } else {
          // ESPN returned empty — try localStorage fallback
          try {
            const raw = localStorage.getItem(cacheKey)
            if (raw) {
              const cached: BoxScoreData = JSON.parse(raw)
              if (cached.linescores.length > 0) {
                setData(cached)
                setFromCache(true)
              }
            }
          } catch { /* parse error */ }
        }
        setLoading(false)
      })
      .catch(() => {
        // Network error — try localStorage fallback
        try {
          const raw = localStorage.getItem(cacheKey)
          if (raw) {
            const cached: BoxScoreData = JSON.parse(raw)
            if (cached.linescores.length > 0) {
              setData(cached)
              setFromCache(true)
              setLoading(false)
              return
            }
          }
        } catch { /* parse error */ }
        setError(true)
        setLoading(false)
      })
  }, [eventId, league])

  if (loading) {
    return (
      <div className="flex justify-center py-6">
        <div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: color, borderTopColor: "transparent" }} />
      </div>
    )
  }

  if (error || !data || data.linescores.length === 0) return null

  const { sportType } = data
  const showStats = true // show team stats for all sports

  return (
    <div className="mt-1">
      {/* Sport-specific scoreboard */}
      {sportType === "baseball"   && <BaseballScoreboard    data={data} seattleTeamId={seattleTeamId} />}
      {sportType === "basketball" && <BasketballScoreboard  data={data} seattleTeamId={seattleTeamId} color={color} />}
      {sportType === "hockey"     && <HockeyScoreboard      data={data} seattleTeamId={seattleTeamId} />}
      {sportType === "football"   && <FootballScoreboard    data={data} seattleTeamId={seattleTeamId} />}
      {sportType === "soccer"     && <SoccerScoreboard      data={data} seattleTeamId={seattleTeamId} />}
      {!["baseball","basketball","hockey","football","soccer"].includes(sportType) && (
        <GenericScoreboard data={data} seattleTeamId={seattleTeamId} />
      )}

      {/* Team stats bars */}
      {showStats && <TeamStatsSection data={data} color={color} />}

      {/* Subtle cached-data indicator */}
      {fromCache && (
        <div className="px-4 pb-3 pt-1">
          <span className="text-[10px] text-zinc-600 uppercase tracking-widest">Cached · live data unavailable</span>
        </div>
      )}
    </div>
  )
}
