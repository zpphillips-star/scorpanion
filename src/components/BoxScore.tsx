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
  shotsOnGoal: { teamId: string; abbr: string; value: string }[]
  isShootout: boolean
  goalScorers: GoalScorer[]
}

// ─── Stat highlight keys per sport ────────────────────────────────────────────

const BASEBALL_STATS    = ["runs", "hits", "errors"]
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

const CELL  = "px-2 py-2.5 font-display tabular-nums text-center"
const HDR   = "pb-2 px-2 font-display text-[12px] font-700 text-zinc-500 uppercase tracking-wider text-center"
const TEAM_CELL = "pr-3 py-2.5 text-left"

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

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 px-5 pt-5 pb-3">
      <span className="font-display text-[13px] font-800 text-zinc-300 uppercase tracking-widest">{label}</span>
      <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.10)" }} />
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// SPORT-SPECIFIC SCOREBOARD TABLES
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Baseball ─────────────────────────────────────────────────────────────────

function BaseballScoreboard({ data, seattleTeamId }: { data: BoxScoreData; seattleTeamId?: string }) {
  const { linescores, periodLabels, currentPeriod, stats, pitchers } = data

  const getTeamStat = (teamId: string, statName: string) => {
    const t = stats.find(s => s.teamId === teamId)
    return t?.statistics.find(s => s.name === statName || s.label?.toLowerCase().includes(statName.toLowerCase()))?.displayValue ?? "–"
  }

  return (
    <>
      <SectionHeader label="Line Score" />
      <div className="px-3 overflow-x-auto no-scrollbar">
        <table className="w-full min-w-max" style={{ borderCollapse: "separate", borderSpacing: 0 }}>
          <thead>
            <tr>
              <th className={`${HDR} text-left pr-3 w-14`}></th>
              {periodLabels.map((lbl, i) => {
                const isCur = isCurrentCol(i, currentPeriod, "baseball")
                return (
                  <th key={i} className={`${HDR} ${isCur ? "text-red-400" : ""}`}>{lbl}</th>
                )
              })}
              {/* R / H / E header */}
              <th className="pb-2 pl-4 pr-1 font-display text-[13px] font-700 text-zinc-200 uppercase border-l-2 border-zinc-700 text-center">R</th>
              <th className="pb-2 px-2 font-display text-[13px] font-600 text-zinc-500 uppercase text-center">H</th>
              <th className="pb-2 px-2 font-display text-[13px] font-600 text-zinc-600 uppercase text-center">E</th>
            </tr>
          </thead>
          <tbody>
            {linescores.map((team) => {
              const isSea = (seattleTeamId && team.teamId === seattleTeamId) || team.abbr === "SEA"
              const R = String(Math.round(team.score))
              const H = team.hits !== undefined ? String(team.hits) : "–"
              const E = team.errors !== undefined ? String(team.errors) : "–"
              return (
                <tr key={team.teamId} className="border-t border-zinc-800/60">
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
                  {/* R / H / E */}
                  <td className={`${CELL} pl-4 text-[17px] font-800 border-l-2 border-zinc-700 ${isSea ? "text-white" : "text-zinc-400"}`}>{R}</td>
                  <td className={`${CELL} text-[15px] font-600 text-zinc-400`}>{H}</td>
                  <td className={`${CELL} text-[15px] font-600 text-zinc-600`}>{E}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Pitcher Info */}
      {pitchers && (pitchers.winning || pitchers.losing || pitchers.saving) && (
        <div className="px-4 mt-3 flex flex-wrap gap-x-5 gap-y-1.5 pb-1">
          {pitchers.winning && (
            <div className="text-[12px]">
              <span className="text-zinc-500 uppercase tracking-wider">W </span>
              <span className="text-zinc-200 font-600">{pitchers.winning.name}</span>
              {pitchers.winning.line && <span className="text-zinc-500"> · {pitchers.winning.line}</span>}
            </div>
          )}
          {pitchers.losing && (
            <div className="text-[12px]">
              <span className="text-zinc-500 uppercase tracking-wider">L </span>
              <span className="text-zinc-200 font-600">{pitchers.losing.name}</span>
              {pitchers.losing.line && <span className="text-zinc-500"> · {pitchers.losing.line}</span>}
            </div>
          )}
          {pitchers.saving && (
            <div className="text-[12px]">
              <span className="text-zinc-500 uppercase tracking-wider">SV </span>
              <span className="text-zinc-200 font-600">{pitchers.saving.name}</span>
              {pitchers.saving.line && <span className="text-zinc-500"> · {pitchers.saving.line}</span>}
            </div>
          )}
        </div>
      )}
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
      <SectionHeader label="Score by Quarter" />
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
              <th className="pb-2 pl-4 font-display text-[13px] font-700 text-zinc-200 uppercase border-l-2 border-zinc-700 text-center">T</th>
            </tr>
          </thead>
          <tbody>
            {linescores.map((team) => {
              const isSea = (seattleTeamId && team.teamId === seattleTeamId) || team.abbr === "SEA"
              return (
                <tr key={team.teamId} className="border-t border-zinc-800/60">
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
          <div className="px-3 pb-2 space-y-1.5">
            {linescores.map(team => {
              const teamScorers = scoresByTeam[team.teamId] ?? []
              const isSea = (seattleTeamId && team.teamId === seattleTeamId) || team.abbr === "SEA"
              if (teamScorers.length === 0) return null
              return (
                <div key={team.teamId} className="rounded-xl px-3 py-2.5" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <div className="flex items-center gap-2 mb-2">
                    {team.logo
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={team.logo} alt={team.abbr} width={16} height={16} className="object-contain" />
                      : null}
                    <span className={`font-display text-[11px] font-700 uppercase tracking-wider ${isSea ? "text-zinc-300" : "text-zinc-500"}`}>{team.abbr}</span>
                    <div className="ml-auto flex gap-3 font-display text-[11px] text-zinc-600 uppercase tracking-wider">
                      <span className="w-6 text-center">PTS</span>
                      <span className="w-6 text-center">REB</span>
                      <span className="w-6 text-center">AST</span>
                    </div>
                  </div>
                  {teamScorers.map((s, idx) => (
                    <div key={idx} className="flex items-center py-0.5">
                      <span className={`flex-1 text-[13px] font-600 truncate ${isSea ? "text-zinc-200" : "text-zinc-400"}`}>{s.name}</span>
                      <div className="flex gap-3 font-display text-[13px] font-700 tabular-nums">
                        <span className="w-6 text-center" style={{ color: isSea ? color : "#a1a1aa" }}>{s.pts}</span>
                        <span className="w-6 text-center text-zinc-500">{s.reb}</span>
                        <span className="w-6 text-center text-zinc-500">{s.ast}</span>
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
      <SectionHeader label="Score by Period" />
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
              <th className="pb-2 pl-4 font-display text-[13px] font-700 text-zinc-200 uppercase border-l-2 border-zinc-700 text-center">T</th>
              {shotsOnGoal.length > 0 && (
                <th className="pb-2 pl-3 font-display text-[13px] font-600 text-zinc-500 uppercase text-center">SOG</th>
              )}
            </tr>
          </thead>
          <tbody>
            {linescores.map((team) => {
              const isSea = (seattleTeamId && team.teamId === seattleTeamId) || team.abbr === "SEA"
              const isWinner = winner?.teamId === team.teamId
              return (
                <tr key={team.teamId} className="border-t border-zinc-800/60">
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
      <SectionHeader label="Score by Quarter" />
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
              <th className="pb-2 pl-4 font-display text-[13px] font-700 text-zinc-200 uppercase border-l-2 border-zinc-700 text-center">T</th>
            </tr>
          </thead>
          <tbody>
            {linescores.map((team) => {
              const isSea = (seattleTeamId && team.teamId === seattleTeamId) || team.abbr === "SEA"
              return (
                <tr key={team.teamId} className="border-t border-zinc-800/60">
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

function SoccerScoreboard({ data, seattleTeamId }: { data: BoxScoreData; seattleTeamId?: string }) {
  const { linescores, goalScorers } = data
  if (linescores.length < 2) return null

  // Away team is index 0 (homeAway="away"), home is index 1 (homeAway="home")
  const away = linescores.find(t => t.homeAway === "away") ?? linescores[0]
  const home = linescores.find(t => t.homeAway === "home") ?? linescores[1]

  const awayGoals = goalScorers.filter(g => g.teamId === away.teamId)
  const homeGoals = goalScorers.filter(g => g.teamId === home.teamId)
  const maxGoals = Math.max(awayGoals.length, homeGoals.length, 1)

  return (
    <>
      <SectionHeader label="Match Summary" />
      <div className="px-4 pb-2">
        {/* Scorers */}
        {goalScorers.length > 0 && (
          <div className="grid grid-cols-[1fr_auto_1fr] gap-x-2 mt-1">
            {Array.from({ length: maxGoals }).map((_, i) => {
              const ag = awayGoals[i]
              const hg = homeGoals[i]
              return (
                <div key={i} className="contents">
                  {/* Away scorer */}
                  <div className="text-right py-0.5">
                    {ag ? (
                      <span className={`text-[12px] font-600 ${away.teamId === (seattleTeamId ?? "") ? "text-zinc-200" : "text-zinc-400"}`}>
                        {ag.name}
                        {ag.type === "Own Goal" ? " (OG)" : ag.type === "Penalty" ? " (P)" : ""}
                        <span className="text-zinc-500 ml-1">{ag.minute}′</span>
                      </span>
                    ) : <span />}
                  </div>
                  <div className="w-4" />
                  {/* Home scorer */}
                  <div className="py-0.5">
                    {hg ? (
                      <span className={`text-[12px] font-600 ${home.teamId === (seattleTeamId ?? "") ? "text-zinc-200" : "text-zinc-400"}`}>
                        {hg.name}
                        {hg.type === "Own Goal" ? " (OG)" : hg.type === "Penalty" ? " (P)" : ""}
                        <span className="text-zinc-500 ml-1">{hg.minute}′</span>
                      </span>
                    ) : <span />}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Half-time breakdown if available */}
        {(away.linescores.length > 0 || home.linescores.length > 0) && (
          <div className="mt-3 flex items-center justify-between text-[11px] text-zinc-600 border-t border-zinc-800 pt-2">
            <span className="tabular-nums">{away.linescores[0] ?? 0} – {home.linescores[0] ?? 0}</span>
            <span>Half Time</span>
            <span className="tabular-nums">{away.linescores[1] ?? 0} – {home.linescores[1] ?? 0}</span>
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
      <SectionHeader label="Score" />
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
              <th className="pb-2 pl-4 font-display text-[13px] font-700 text-zinc-200 uppercase border-l-2 border-zinc-700 text-center">T</th>
            </tr>
          </thead>
          <tbody>
            {linescores.map((team) => {
              const isSea = (seattleTeamId && team.teamId === seattleTeamId) || team.abbr === "SEA"
              return (
                <tr key={team.teamId} className="border-t border-zinc-800/60">
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
      <div className="px-3 pb-3 space-y-2">
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
            <div key={key} className="px-2 py-1.5">
              <div className="flex justify-between mb-1.5">
                <span className="font-display text-[14px] font-700 text-white tabular-nums">{vA}</span>
                <span className="font-display text-[11px] text-zinc-500 uppercase tracking-wide">{label}</span>
                <span className="font-display text-[14px] font-700 text-zinc-400 tabular-nums">{vB}</span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden flex" style={{ background: "rgba(255,255,255,0.08)" }}>
                <div className="h-full rounded-l-full transition-all" style={{ width: `${pctA * 100}%`, background: color }} />
              </div>
            </div>
          )
        })}
      </div>
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
        <div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: color, borderTopColor: "transparent" }} />
      </div>
    )
  }

  if (error || !data || data.linescores.length === 0) return null

  const { sportType } = data
  const showStats = sportType !== "soccer" // soccer stats shown elsewhere

  return (
    <div className="mt-1 rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
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
    </div>
  )
}
