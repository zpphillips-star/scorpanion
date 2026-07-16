"use client"
import { useState } from "react"
import { Game } from "@/lib/types"
import { SEATTLE_TEAMS, getTeamLogoUrl } from "@/lib/teams"
import { useTeamClickCounts } from "@/hooks/useTeamClickCounts"
import { useSportsData } from "@/context/SportsDataContext"
import TeamLogo from "@/components/TeamLogo"
import PageHeader from "@/components/PageHeader"
import { TodayGameCard } from "@/components/TodayGameCard"
import GameDetailSheet from "@/components/GameDetailSheet"
import { OFFSEASON_DISPLAY } from "@/lib/seasonDates"

// Use explicit timezone for all date comparisons (matches phone's local time)
function getTimezone(): string {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone } catch { return "America/Los_Angeles" }
}
function todayStr(tz?: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz ?? getTimezone() }).format(new Date())
}
function dateStr(d: Date, tz?: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz ?? getTimezone() }).format(d)
}
function daysAgo(n: number, tz?: string) {
  const d = new Date(); d.setDate(d.getDate() - n); return dateStr(d, tz)
}
function daysFromNow(n: number, tz?: string) {
  const d = new Date(); d.setDate(d.getDate() + n); return dateStr(d, tz)
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }).replace(/\s?(am|pm)/i, m => m.toUpperCase().trim()).replace(/^(\d)/, h => h)
}
function fmtDayHeader(ds: string) {
  const [y, m, day] = ds.split("-").map(Number)
  return new Date(y, m - 1, day).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })
}

// ── College group helpers ──────────────────────────────────────────────────
function getCollegeGroupKey(teamId: string): string | null {
  if (teamId.startsWith("uw-")) return "uw"
  if (teamId.startsWith("wsu-")) return "wsu"
  return null
}

const SPORT_LABELS: Record<string, string> = {
  football: "Football", baseball: "Baseball", basketball: "Basketball",
  volleyball: "Volleyball", lacrosse: "Lacrosse", softball: "Softball", soccer: "Soccer", hockey: "Hockey",
}

// Off-season display info — imported from @/lib/seasonDates (OFFSEASON_DISPLAY)
// Alias so existing code in OffSeasonCards still works as-is.
const NEXT_SEASON = OFFSEASON_DISPLAY

function OffSeasonCards({ teams, nextGames }: {
  teams: typeof SEATTLE_TEAMS
  nextGames: Record<string, Game | undefined>
}) {
  if (teams.length === 0) return null

  return (
    <div className="mt-2">
      {teams.map(team => {
        const next = nextGames[team.id]
        const seasonInfo = NEXT_SEASON[team.league]
        const logoUrl = getTeamLogoUrl(team)

        return (
          <div
            key={team.id}
            className="flex items-center gap-3 px-4 py-3.5 border-b border-zinc-800/50"
          >
            {/* Team logo */}
            <TeamLogo src={logoUrl} emoji={team.emoji} abbr={team.abbr} size={32} />

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-semibold text-white leading-tight">{team.shortName}</div>

              {next ? (
                <div className="text-[11px] text-zinc-500 mt-0.5 truncate">
                  Next: {new Date(next.kickoff).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                  <span className="mx-1">·</span>
                  {next.isHome ? "vs" : "@"} {next.opponent.shortName || next.opponent.abbr}
                </div>
              ) : seasonInfo ? (
                <div className="text-[11px] text-zinc-600 mt-0.5">{seasonInfo.label} · Off-season</div>
              ) : (
                <div className="text-[11px] text-zinc-600 mt-0.5">No games scheduled</div>
              )}
            </div>

            {/* Days until */}
            {next && (() => {
              const days = Math.ceil((new Date(next.kickoff).getTime() - Date.now()) / 86400000)
              return days >= 0 ? (
                <div className="flex-shrink-0 text-right">
                  <div className="text-[18px] font-bold text-zinc-300 tabular-nums leading-none">{days}</div>
                  <div className="text-[9px] text-zinc-600 uppercase tracking-wide">{days === 1 ? "day" : "days"}</div>
                </div>
              ) : null
            })()}
          </div>
        )
      })}
    </div>
  )
}






function RecentCard({ game, onClick }: { game: Game; onClick: () => void }) {
  const hasScore = game.seattleScore !== undefined && game.opponentScore !== undefined
  const seattleWon = hasScore && game.seattleScore! > game.opponentScore!
  const seattleLost = hasScore && game.seattleScore! < game.opponentScore!
  const color = game.seattleTeam.primaryColor
  const resultColor = !hasScore ? "#52525b" : seattleWon ? "#34d399" : seattleLost ? "#f87171" : "#9ca3af"
  const resultLabel = !hasScore ? "Final" : seattleWon ? "W" : seattleLost ? "L" : "T"

  return (
    <button
      onClick={onClick}
      className="flex-shrink-0 w-[148px] rounded-2xl overflow-hidden text-left active:scale-95 transition-transform"
      style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}
    >
      {/* Color bar top */}
      <div className="h-1" style={{ background: `linear-gradient(to right, ${color}, ${color}44)` }} />
      <div className="px-3 pt-2.5 pb-3">
        {/* W/L + date */}
        <div className="flex items-center justify-between mb-2.5">
          <span className="font-display text-[11px] font-700 uppercase tracking-wide" style={{ color: resultColor }}>
            {resultLabel}
          </span>
          <span className="text-[10px] text-zinc-600">{fmtDate(game.kickoff).replace(/,.*/, "")}</span>
        </div>
        {/* Teams + scores */}
        <div className="flex items-center justify-between gap-1.5">
          <div className="flex flex-col items-center gap-1 flex-1">
            <TeamLogo src={getTeamLogoUrl(game.seattleTeam)} emoji={game.seattleTeam.emoji} abbr={game.seattleTeam.abbr} size={26} />
            <span className={`font-display text-[14px] font-800 tabular-nums ${seattleLost ? "text-zinc-500" : hasScore ? "text-white" : "text-zinc-600"}`}>
              {hasScore ? game.seattleScore : "–"}
            </span>
          </div>
          <span className="font-display text-[10px] text-zinc-700 font-600 self-center pb-3">–</span>
          <div className="flex flex-col items-center gap-1 flex-1">
            <TeamLogo src={game.opponent.logo} emoji="🏟️" abbr={game.opponent.abbr} size={26} />
            <span className={`font-display text-[14px] font-800 tabular-nums ${seattleWon ? "text-zinc-500" : hasScore ? "text-white" : "text-zinc-600"}`}>
              {hasScore ? game.opponentScore : "–"}
            </span>
          </div>
        </div>
        {/* Opponent name */}
        <div className="mt-2">
          <span className="text-[10px] text-zinc-600 truncate block">vs {game.opponent.shortName || game.opponent.abbr}</span>
        </div>
      </div>
    </button>
  )
}

// ── College sport picker dropdown ─────────────────────────────────────────
function CollegeSportPicker({
  groupKey, availableTeams, selectedTeamIds, activeFilter,
  onSelect, onSelectAll, onClose,
}: {
  groupKey: string
  availableTeams: { team: typeof SEATTLE_TEAMS[0]; hasGames: boolean }[]
  selectedTeamIds: string[]
  activeFilter: string
  onSelect: (id: string) => void
  onSelectAll: () => void
  onClose: () => void
}) {
  const representative = availableTeams[0]?.team
  const school = groupKey === "uw" ? "Washington Huskies" : groupKey === "wsu" ? "WSU Cougars" : groupKey

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        className="absolute left-0 right-0 z-50 mx-3 mt-1 rounded-2xl overflow-hidden shadow-2xl animate-slide-down"
        style={{ background: "var(--surface)", border: "1px solid var(--border)", top: "100%" }}
      >
        <div className="px-4 py-3 border-b border-white/5 flex items-center gap-2.5">
          {representative && (
            <TeamLogo src={getTeamLogoUrl(representative)} emoji={representative.emoji} abbr={representative.abbr} size={24} />
          )}
          <span className="font-display text-[13px] font-800 text-white uppercase tracking-wide">{school}</span>
          <span className="font-display text-[10px] text-zinc-500 ml-1">· Choose sport</span>
        </div>
        <div className="p-3 flex flex-wrap gap-2">
          <button
            onClick={onSelectAll}
            className="px-3.5 py-1.5 rounded-full text-[12px] font-700 font-display uppercase tracking-wide transition-all"
            style={{
              background: availableTeams.every(t => activeFilter !== t.team.id) && activeFilter.startsWith(groupKey) === false
                ? "var(--accent)" : "var(--surface-2)",
              color: availableTeams.every(t => activeFilter !== t.team.id) ? "#08080f" : "#9ca3af",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            All Sports
          </button>
          {availableTeams.map(({ team, hasGames }) => (
            <button
              key={team.id}
              onClick={() => onSelect(team.id)}
              disabled={!hasGames}
              className="px-3.5 py-1.5 rounded-full text-[12px] font-700 font-display uppercase tracking-wide transition-all disabled:opacity-30"
              style={{
                background: activeFilter === team.id ? team.primaryColor : "var(--surface-2)",
                color: activeFilter === team.id ? "#fff" : "#9ca3af",
                border: `1px solid ${activeFilter === team.id ? team.primaryColor : "rgba(255,255,255,0.1)"}`,
              }}
            >
              {SPORT_LABELS[team.sport] || team.sport}
            </button>
          ))}
        </div>
      </div>
    </>
  )
}

export default function HomeClient() {
  const { selectedTeamIds, loaded, allGames, loading } = useSportsData()
  const { counts: teamClickCounts, recordClick } = useTeamClickCounts()
  const [activeFilter, setActiveFilter] = useState<string>("all")
  const [collegePicker, setCollegePicker] = useState<string | null>(null) // groupKey "uw" | "wsu"
  const [selectedRecentGame, setSelectedRecentGame] = useState<Game | null>(null)

  // Build filter items — one per unique logo, sorted by aggregated click count
  // College schools get click counts summed across all their sport variants
  const getAggregatedClicks = (team: typeof SEATTLE_TEAMS[0]): number => {
    const gk = getCollegeGroupKey(team.id)
    if (!gk) return teamClickCounts[team.id] || 0
    // Sum all clicks for this school
    return SEATTLE_TEAMS
      .filter(t => getCollegeGroupKey(t.id) === gk && selectedTeamIds.includes(t.id))
      .reduce((sum, t) => sum + (teamClickCounts[t.id] || 0), 0)
  }

  const followedTeamsSorted = SEATTLE_TEAMS
    .filter(t => selectedTeamIds.includes(t.id))
    .sort((a, b) => (getAggregatedClicks(b) - getAggregatedClicks(a)) || a.shortName.localeCompare(b.shortName))

  // Deduplicate: one entry per unique logo (college schools collapse into one icon)
  const filterItems = (() => {
    const seen = new Set<string>()
    return followedTeamsSorted.filter(t => {
      const key = getCollegeGroupKey(t.id) ?? (getTeamLogoUrl(t) || t.id)
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  })()

  // Get all team IDs matching a filter item (handles college group expansion)
  const filterMatchIds = (filterId: string): string[] => {
    const item = SEATTLE_TEAMS.find(t => t.id === filterId)
    if (!item) return [filterId]
    const gk = getCollegeGroupKey(filterId)
    if (gk) return SEATTLE_TEAMS.filter(t => getCollegeGroupKey(t.id) === gk).map(t => t.id)
    const logoKey = getTeamLogoUrl(item) || filterId
    return SEATTLE_TEAMS.filter(t => (getTeamLogoUrl(t) || t.id) === logoKey).map(t => t.id)
  }

  // Filter games
  const filtered = activeFilter === "all"
    ? allGames
    : allGames.filter(g => filterMatchIds(activeFilter).includes(g.seattleTeamId))

  // Categorize
  const today = todayStr()
  const cutoff7 = daysAgo(7)
  const cutoff14 = daysFromNow(14)

  const recent = filtered.filter(g => {
    const d = dateStr(new Date(g.kickoff))
    // Exclude today — those show in the featured section; show last 7 days
    return g.status === "ft" && d >= cutoff7 && d < today
  }).sort((a, b) => new Date(b.kickoff).getTime() - new Date(a.kickoff).getTime()).slice(0, 12)

  const todayGames = filtered.filter(g => dateStr(new Date(g.kickoff)) === today)
  const liveGames = filtered.filter(g => g.status === "live")
  const upcoming = filtered.filter(g => {
    const d = dateStr(new Date(g.kickoff))
    return g.status === "upcoming" && d > today && d <= cutoff14
  })

  // If no upcoming in 14 days, grab the next N games regardless of date
  const upcomingFallback = upcoming.length === 0
    ? filtered.filter(g => g.status === "upcoming" && dateStr(new Date(g.kickoff)) > today)
        .sort((a, b) => new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime())
        .slice(0, 6)
    : []

  const allUpcoming = [...upcoming, ...upcomingFallback]

  // For off-season cards: find next game per team across ALL games (unfiltered)
  const followedTeams = SEATTLE_TEAMS.filter(t => selectedTeamIds.includes(t.id))
  const nextGameByTeam: Record<string, Game | undefined> = {}
  for (const team of followedTeams) {
    nextGameByTeam[team.id] = allGames
      .filter(g => g.seattleTeamId === team.id && g.status === "upcoming")
      .sort((a, b) => new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime())[0]
  }

  // Teams that have NO upcoming games at all in the current filtered view
  const teamsWithNoGames = (() => {
    const activeTeamIds = activeFilter === "all"
      ? selectedTeamIds
      : filterMatchIds(activeFilter)
    return followedTeams.filter(t =>
      activeTeamIds.includes(t.id) &&
      !allGames.some(g => g.seattleTeamId === t.id && g.status !== "ft")
    )
  })()

  const upcomingByDate: Record<string, Game[]> = {}
  for (const g of allUpcoming) {
    const d = dateStr(new Date(g.kickoff)); if (!upcomingByDate[d]) upcomingByDate[d] = []
    upcomingByDate[d].push(g)
  }
  const upcomingDates = Object.keys(upcomingByDate).sort()

  const hasAnyLive = liveGames.length > 0
  const liveCount = liveGames.length

  if (!loaded || loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100dvh-8rem)]">
        <div className="w-9 h-9 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }} />
      </div>
    )
  }

  if (selectedTeamIds.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100dvh-8rem)] px-8 text-center gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/scorpion-logo.png" alt="Scorpanion" width={72} height={72} className="object-contain" />
        <h2 className="font-display text-[28px] font-800 text-white uppercase tracking-tight">No teams yet</h2>
        <p className="text-zinc-500 text-sm">Follow your teams to see their scores here.</p>
      </div>
    )
  }

  return (
    <div style={{ paddingBottom: "1rem" }}>
      {/* ── Sticky header ───────────────────────────────────────────────── */}
      <PageHeader title="Home">
        {/* ── Team logo filter bar ─────────────────────────────────── */}
        <div className="relative overflow-x-auto no-scrollbar px-4 pb-3">
          <div className="flex gap-3 min-w-max">
            {/* ALL */}
            <button onClick={() => { setActiveFilter("all"); setCollegePicker(null) }} className="flex-shrink-0">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center transition-all"
                style={{
                  background: activeFilter === "all" ? "var(--accent)" : "var(--surface-2)",
                  border: `2px solid ${activeFilter === "all" ? "var(--accent)" : "rgba(255,255,255,0.1)"}`,
                  boxShadow: activeFilter === "all" ? "0 0 14px rgba(0,212,255,0.4)" : "none",
                }}
              >
                <span className="font-display text-[11px] font-800 uppercase" style={{ color: activeFilter === "all" ? "#08080f" : "#6b7280" }}>All</span>
              </div>
            </button>

            {filterItems.map(team => {
              const gk = getCollegeGroupKey(team.id)
              const isCollege = !!gk
              const pickerOpen = isCollege && collegePicker === gk
              const isActive = isCollege
                ? filterMatchIds(team.id).includes(activeFilter) && activeFilter !== "all"
                : activeFilter === team.id
              const logoUrl = getTeamLogoUrl(team)

              return (
                <div key={team.id} className="relative flex-shrink-0">
                  <button
                    onClick={() => {
                      if (isCollege) {
                        setCollegePicker(pickerOpen ? null : gk)
                      } else {
                        setCollegePicker(null)
                        setActiveFilter(isActive ? "all" : team.id)
                        recordClick(team.id)
                      }
                    }}
                    className="flex-shrink-0"
                  >
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center transition-all overflow-hidden p-1 relative"
                      style={{
                        background: isActive ? `${team.primaryColor}30` : "var(--surface-2)",
                        border: `2px solid ${isActive ? team.primaryColor : pickerOpen ? "var(--accent)" : "rgba(255,255,255,0.1)"}`,
                        boxShadow: isActive ? `0 0 14px ${team.primaryColor}55` : pickerOpen ? "0 0 10px rgba(0,212,255,0.3)" : "none",
                        opacity: !isActive && !pickerOpen && activeFilter !== "all" ? 0.4 : 1,
                      }}
                    >
                      <TeamLogo src={logoUrl} emoji={team.emoji} abbr={team.abbr} size={32} />
                      {isCollege && <span className="absolute bottom-0.5 right-0.5 text-[8px]">▾</span>}
                    </div>
                  </button>

                  {pickerOpen && gk && (
                    <CollegeSportPicker
                      groupKey={gk}
                      availableTeams={SEATTLE_TEAMS
                        .filter(t => getCollegeGroupKey(t.id) === gk && selectedTeamIds.includes(t.id))
                        .map(t => ({ team: t, hasGames: allGames.some(g => g.seattleTeamId === t.id) }))
                      }
                      selectedTeamIds={selectedTeamIds}
                      activeFilter={activeFilter}
                      onSelect={(id) => { setActiveFilter(id); recordClick(id); setCollegePicker(null) }}
                      onSelectAll={() => { setActiveFilter(team.id); setCollegePicker(null) }}
                      onClose={() => setCollegePicker(null)}
                    />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </PageHeader>

      {/* ── Recent results (horizontal scroll, tappable) ─────────────────── */}
      {recent.length > 0 && (
        <div className="mt-5">
          <div className="flex items-center gap-3 px-4 mb-3">
            <span className="font-display text-[13px] font-800 text-white uppercase tracking-widest">Recent</span>
            <div className="flex-1 h-px bg-zinc-800" />
            <span className="font-display text-[10px] text-zinc-500 uppercase tracking-wider">Last 7 days</span>
          </div>
          <div className="overflow-x-auto no-scrollbar px-4">
            <div className="flex gap-3 min-w-max pb-1">
              {recent.map(g => (
                <RecentCard key={g.id} game={g} onClick={() => setSelectedRecentGame(g)} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── FEATURED: Live + Today ───────────────────────────────────────── */}
      {(liveGames.length > 0 || todayGames.length > 0) && (() => {
        const hasLive = liveGames.length > 0
        const todayDate = new Date()
        const dateLabel = todayDate.toLocaleDateString("en-US", { month: "long", day: "numeric" })

        return (
          <div className="mt-8">
            {/* Section header — same style as Recent/Upcoming */}
            <div className="flex items-center gap-3 px-4 mb-2">
              {hasLive && (
                <span className="relative flex h-1.5 w-1.5 flex-shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500" />
                </span>
              )}
              <span
                className={`text-[10px] font-bold uppercase tracking-widest ${hasLive ? "text-red-400" : "text-zinc-500"}`}
              >
                {hasLive ? "Live Now" : "Today"}
              </span>
              <div className="flex-1 h-px bg-zinc-800" />
              <span className="text-[10px] text-zinc-600 uppercase tracking-wider">{dateLabel}</span>
            </div>

            {/* Featured cards */}
            {todayGames.map(g => <TodayGameCard key={g.id} game={g} />)}
          </div>
        )
      })()}

      {/* ── Off-season (no games anywhere) ──────────────────────────────── */}
      {todayGames.length === 0 && !hasAnyLive && recent.length === 0 && allUpcoming.length === 0 && (
        <>
          <div className="mt-5 px-4 mb-2 flex items-center gap-3">
            <span className="font-display text-[13px] font-800 text-zinc-400 uppercase tracking-widest">Off Season</span>
            <div className="flex-1 h-px bg-zinc-800" />
          </div>
          <OffSeasonCards teams={teamsWithNoGames.length > 0 ? teamsWithNoGames : followedTeams} nextGames={nextGameByTeam} />
        </>
      )}

      {/* ── Rest Day card — teams exist, but nothing today ─────────────────── */}
      {selectedTeamIds.length > 0 && todayGames.length === 0 && !hasAnyLive && (recent.length > 0 || allUpcoming.length > 0) && (
        <div className="flex items-center gap-3 px-4 mt-6 mb-1">
          <div className="flex-1 h-px bg-zinc-800/60" />
          <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Rest day</span>
          <div className="flex-1 h-px bg-zinc-800/60" />
        </div>
      )}

      {/* ── Upcoming — WC compact rows ───────────────────────────────────── */}
      {upcomingDates.length > 0 && (
        <div className="mt-8">
          <div className="px-4 mb-1 flex items-center gap-3">
            <span className="font-display text-[13px] font-800 text-white uppercase tracking-widest">Upcoming</span>
            <div className="flex-1 h-px bg-zinc-800" />
            <span className="font-display text-[10px] text-zinc-500 uppercase tracking-wider">
              {upcomingFallback.length > 0 ? "Next scheduled" : "Next 14 days"}
            </span>
          </div>

          {upcomingDates.map((ds, idx) => (
            <div key={ds}>
              {idx > 0 && <div className="h-3" />}
              {/* Date header */}
              <div
                className="px-4 py-2 flex items-center gap-3"
                style={{ background: "rgba(8,8,15,0.95)", backdropFilter: "blur(8px)" }}
              >
                <span className="text-[12px] uppercase tracking-widest font-bold text-white">{fmtDayHeader(ds)}</span>
                <div className="flex-1 h-px bg-zinc-800" />
              </div>
              {/* Compact rows */}
              {upcomingByDate[ds].map(g => {
                const seattleLogoUrl = getTeamLogoUrl(g.seattleTeam)
                return (
                  <div
                    key={g.id}
                    className="flex items-center px-4 py-3 border-b border-zinc-800/50 hover:bg-zinc-800/20 active:bg-zinc-800/30 transition-colors cursor-pointer"
                    onClick={() => setSelectedRecentGame(g)}
                  >
                    {/* Time */}
                    <div className="w-[72px] flex-shrink-0">
                      <span className="text-[12px] font-medium text-zinc-300 whitespace-nowrap">{fmtTime(g.kickoff)}</span>
                    </div>
                    {/* Seattle (right-aligned) */}
                    <div className="flex-1 flex items-center justify-end gap-2 min-w-0">
                      <span className="text-[13px] font-semibold text-white truncate text-right">{g.seattleTeam.shortName}</span>
                      <TeamLogo src={seattleLogoUrl} emoji={g.seattleTeam.emoji} abbr={g.seattleTeam.abbr} size={24} />
                    </div>
                    {/* vs */}
                    <div className="w-10 flex-shrink-0 text-center">
                      <span className="text-[12px] font-medium text-zinc-500">vs</span>
                    </div>
                    {/* Opponent (left-aligned) */}
                    <div className="flex-1 flex items-center gap-2 min-w-0">
                      {g.opponent.logo
                        ? <img src={g.opponent.logo} alt={g.opponent.abbr} width={28} height={28} className="object-contain flex-shrink-0" />
                        : <div className="w-6 h-6 rounded-full bg-white/10 flex-shrink-0" />
                      }
                      <span className="text-[13px] font-semibold text-white truncate">{g.opponent.shortName || g.opponent.name}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      )}

      {allUpcoming.length === 0 && todayGames.length > 0 && !hasAnyLive && (
        <OffSeasonCards teams={teamsWithNoGames} nextGames={nextGameByTeam} />
      )}

      {/* ── Recent game detail sheet ──────────────────────────────────────── */}
      {selectedRecentGame && (
        <GameDetailSheet game={selectedRecentGame} onClose={() => setSelectedRecentGame(null)} />
      )}
    </div>
  )
}
