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
import PGASection from "@/components/PGATournamentCard"

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

  return (
    <button
      onClick={onClick}
      className="flex-shrink-0 flex flex-col items-center active:opacity-60 transition-opacity px-7 py-5"
    >
      {/* League label */}
      <span className="text-[8px] tracking-[0.18em] uppercase font-semibold mb-4" style={{ color: "var(--text-faint)" }}>
        {game.league}
      </span>
      {/* Two team columns */}
      <div className="flex items-end gap-6">
        {/* Seattle */}
        <div className="flex flex-col items-center gap-2">
          <TeamLogo src={getTeamLogoUrl(game.seattleTeam)} emoji={game.seattleTeam.emoji} abbr={game.seattleTeam.abbr} size={36} />
          <span className="text-[9px] font-semibold tracking-wide uppercase" style={{ color: "var(--text-faint)" }}>{game.seattleTeam.abbr}</span>
          <span className={`font-display text-[30px] font-800 tabular-nums leading-none ${seattleLost ? "opacity-30" : ""}`} style={{ color: "#f0f0f8" }}>
            {hasScore ? game.seattleScore : "—"}
          </span>
        </div>
        {/* Opponent */}
        <div className="flex flex-col items-center gap-2">
          <TeamLogo src={game.opponent.logo} emoji="🏟️" abbr={game.opponent.abbr} size={36} />
          <span className="text-[9px] font-semibold tracking-wide uppercase" style={{ color: "var(--text-faint)" }}>{game.opponent.abbr}</span>
          <span className={`font-display text-[30px] font-800 tabular-nums leading-none ${seattleWon ? "opacity-30" : ""}`} style={{ color: "#f0f0f8" }}>
            {hasScore ? game.opponentScore : "—"}
          </span>
        </div>
      </div>
    </button>
  )
}

function RecentSeparator() {
  // buffer | line | buffer — mx-4 gives 16px on each side of the 1px line
  return <div className="self-stretch w-px mx-4 my-4 flex-shrink-0" style={{ background: "#1e3050" }} />
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
      <div className="flex flex-col items-center justify-center h-[calc(100dvh-8rem)] px-8 text-center gap-6">
        {/* Big + button */}
        <a
          href="/teams"
          className="flex flex-col items-center gap-4 active:opacity-70 transition-opacity"
        >
          <div className="w-20 h-20 rounded-full border-2 border-dashed border-zinc-600 flex items-center justify-center">
            <span className="text-4xl text-zinc-500 leading-none" style={{ marginTop: "-2px" }}>+</span>
          </div>
          <div>
            <p className="text-white text-[16px] font-semibold mb-1">Add your teams</p>
            <p className="text-zinc-500 text-[13px]">Tap to follow teams and see their scores here</p>
          </div>
          <div className="flex items-center gap-2 px-5 py-2.5 border border-zinc-700 text-zinc-300 text-[13px] font-semibold">
            Browse Teams →
          </div>
        </a>
      </div>
    )
  }

  return (
    <div style={{ paddingBottom: "1rem" }}>
      {/* ── Sticky header ───────────────────────────────────────────────── */}
      <PageHeader title="Home">
        {/* ── Team logo filter bar ─────────────────────────────────── */}
        <div className="relative overflow-x-auto no-scrollbar px-4 pb-6">
          <div className="flex gap-3 min-w-max">
            {/* ALL */}
            <button onClick={() => { setActiveFilter("all"); setCollegePicker(null) }} className="flex-shrink-0">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center transition-all"
                style={{
                  background: "#0c1b31",
                  border: `2px solid ${activeFilter === "all" ? "#D65820" : "rgba(255,255,255,0.15)"}`,
                  boxShadow: activeFilter === "all" ? "0 0 10px rgba(214,88,32,0.35)" : "none",
                }}
              >
                <span className="font-display text-[11px] font-800 uppercase" style={{ color: activeFilter === "all" ? "#f0f0f8" : "#6b7280" }}>All</span>
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

      {/* ── Recent results (horizontal scroll) ───────────────────────────── */}
      {recent.length > 0 && (
        <div className="mt-16">
          <div className="flex items-center gap-3 px-4 mb-6">
            <span className="text-[10px] tracking-[0.12em] font-semibold uppercase" style={{ color: "var(--text-faint)" }}>Recent</span>
            <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
          </div>
          <div className="overflow-x-auto no-scrollbar px-4">
            <div className="flex items-stretch min-w-max">
              {recent.map((g, i) => (
                <>
                  {i > 0 && <RecentSeparator key={`sep-${g.id}`} />}
                  <RecentCard key={g.id} game={g} onClick={() => setSelectedRecentGame(g)} />
                </>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── FEATURED: Always-on Today section ────────────────────────────── */}
      {(() => {
        const hasLive = liveGames.length > 0
        const hasGames = liveGames.length > 0 || todayGames.length > 0
        const dateLabel = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })

        return (
          <div className="mt-10">
            {/* Section header — Scorpanion branded */}
            <div className="flex items-center gap-2.5 px-4 mb-4">
              <span className={`w-2.5 h-2.5 rounded-sm flex-shrink-0 ${hasLive ? "bg-red-500 animate-pulse" : ""}`}
                    style={hasLive ? {} : { background: "#D65820" }} />
              <span className="text-[13px] font-black uppercase tracking-widest text-white">
                {hasLive ? "Live Now" : "Today"}
              </span>
              {todayGames.length > 0 && (
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${hasLive ? "bg-red-500/15 text-red-400" : "bg-white/5 text-zinc-400"}`}>
                  {todayGames.length}
                </span>
              )}
              <div className="flex-1 h-px" style={{ background: hasLive ? "rgba(239,68,68,0.2)" : "rgba(255,255,255,0.05)" }} />
              <span className="text-[10px] tracking-[0.1em] uppercase font-medium" style={{ color: "var(--text-faint)" }}>{dateLabel}</span>
            </div>

            {hasGames ? (
              <div className={`px-4 space-y-4 ${hasLive ? "-mx-1" : ""}`}>
                {todayGames.map(g => (
                  <TodayGameCard key={g.id} game={g} featured={g.status === "live"} />
                ))}
              </div>
            ) : (
              <div className="px-4 py-6 flex items-center justify-center">
                <span className="text-[13px] font-medium tracking-wide" style={{ color: "var(--text-faint)" }}>No games today</span>
              </div>
            )}
          </div>
        )
      })()}

      {/* ── PGA Tour section (when followed) ─────────────────────────────── */}
      {selectedTeamIds.includes("pga") && (activeFilter === "all" || activeFilter === "pga") && (
        <div className="mt-10">
          <div className="flex items-center gap-3 px-4 mb-4">
            <span className="text-[10px] tracking-[0.12em] font-semibold uppercase" style={{ color: "var(--text-faint)" }}>⛳ PGA Tour</span>
            <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
          </div>
          <PGASection tourId="pga" />
        </div>
      )}

      {/* ── LPGA Tour section (when followed) ────────────────────────────── */}
      {selectedTeamIds.includes("lpga") && (activeFilter === "all" || activeFilter === "lpga") && (
        <div className="mt-10">
          <div className="flex items-center gap-3 px-4 mb-4">
            <span className="text-[10px] tracking-[0.12em] font-semibold uppercase" style={{ color: "var(--text-faint)" }}>⛳ LPGA Tour</span>
            <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
          </div>
          <PGASection tourId="lpga" />
        </div>
      )}

      {/* ── Off-season (no games anywhere) ──────────────────────────────── */}
      {todayGames.length === 0 && !hasAnyLive && recent.length === 0 && allUpcoming.length === 0 && (
        <>
          <div className="mt-10 px-4 mb-4 flex items-center gap-3">
            <span className="text-[10px] tracking-[0.12em] font-semibold uppercase" style={{ color: "var(--text-faint)" }}>Off Season</span>
            <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
          </div>
          <OffSeasonCards teams={teamsWithNoGames.length > 0 ? teamsWithNoGames : followedTeams} nextGames={nextGameByTeam} />
        </>
      )}

      {/* ── Upcoming ─────────────────────────────────────────────────────── */}
      {upcomingDates.length > 0 && (
        <div className="mt-12">
          <div className="px-4 mb-5 flex items-center gap-3">
            <span className="text-[10px] tracking-[0.12em] font-semibold uppercase" style={{ color: "var(--text-faint)" }}>Upcoming</span>
            <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
            <span className="text-[10px] tracking-[0.1em] uppercase font-medium" style={{ color: "var(--text-faint)" }}>
              {upcomingFallback.length > 0 ? "Next scheduled" : "Next 14 days"}
            </span>
          </div>

          {upcomingDates.map((ds, idx) => (
            <div key={ds}>
              {idx > 0 && <div className="h-4" />}
              {/* Date header — whisper, no heavy backdrop */}
              <div className="px-4 py-2 flex items-center gap-3">
                <span className="text-[10px] tracking-[0.12em] font-semibold uppercase" style={{ color: "var(--text-faint)" }}>{fmtDayHeader(ds)}</span>
                <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
              </div>
              {/* Compact rows */}
              {upcomingByDate[ds].map(g => {
                const seattleLogoUrl = getTeamLogoUrl(g.seattleTeam)
                return (
                  <div
                    key={g.id}
                    className="grid border-b hover:bg-white/[0.02] active:bg-white/[0.03] transition-colors cursor-pointer px-4 py-4"
                    style={{ gridTemplateColumns: "80px 1fr auto 1fr", borderColor: "var(--border)" }}
                    onClick={() => setSelectedRecentGame(g)}
                  >
                    {/* Time */}
                    <span className="text-[13px] font-semibold self-center whitespace-nowrap" style={{ color: "#f0f0f8" }}>{fmtTime(g.kickoff)}</span>
                    {/* Seattle (right-aligned) */}
                    <div className="flex items-center justify-end gap-2.5 overflow-hidden">
                      <span className="text-[14px] font-semibold truncate" style={{ color: "#f0f0f8" }}>{g.seattleTeam.shortName}</span>
                      <TeamLogo src={seattleLogoUrl} emoji={g.seattleTeam.emoji} abbr={g.seattleTeam.abbr} size={26} />
                    </div>
                    {/* vs */}
                    <span className="text-[11px] self-center px-3 font-medium" style={{ color: "#3a5070" }}>vs</span>
                    {/* Opponent (left-aligned) */}
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      {g.opponent.logo
                        ? <img src={g.opponent.logo} alt={g.opponent.abbr} width={26} height={26} className="object-contain flex-shrink-0" />
                        : <div className="w-6 h-6 rounded-full bg-white/10 flex-shrink-0" />
                      }
                      <span className="text-[14px] font-semibold truncate" style={{ color: "#f0f0f8" }}>{g.opponent.shortName || g.opponent.name}</span>
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
