"use client"
import { useState, useEffect, useCallback, useRef } from "react"
import { Game, ScoreUpdate } from "@/lib/types"
import { SEATTLE_TEAMS, getTeamLogoUrl } from "@/lib/teams"
import { useSelectedTeams } from "@/hooks/useSelectedTeams"
import { useTeamClickCounts } from "@/hooks/useTeamClickCounts"
import GameCard from "@/components/GameCard"
import TeamLogo from "@/components/TeamLogo"

function todayStr() { return new Date().toLocaleDateString("en-CA") }
function dateStr(d: Date) { return d.toLocaleDateString("en-CA") }
function daysAgo(n: number) {
  const d = new Date(); d.setDate(d.getDate() - n); return dateStr(d)
}
function daysFromNow(n: number) {
  const d = new Date(); d.setDate(d.getDate() + n); return dateStr(d)
}
function formatShortDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
}
function formatDayHeader(ds: string) {
  const [y, m, day] = ds.split("-").map(Number)
  return new Date(y, m - 1, day).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })
}

// ── Recent game mini-card (horizontal scroll) ──────────────────────────────
function RecentCard({ game }: { game: Game }) {
  const seattleWon = game.seattleScore !== undefined && game.opponentScore !== undefined && game.seattleScore > game.opponentScore
  const seattleLost = game.seattleScore !== undefined && game.opponentScore !== undefined && game.seattleScore < game.opponentScore
  const color = game.seattleTeam.primaryColor

  return (
    <div
      className="flex-shrink-0 w-[140px] rounded-2xl overflow-hidden"
      style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}
    >
      {/* Color bar top */}
      <div className="h-1" style={{ background: `linear-gradient(to right, ${color}, ${color}44)` }} />
      <div className="px-3 pt-2.5 pb-3">
        {/* Status */}
        <div className="font-display text-[10px] font-600 uppercase tracking-widest mb-2 flex items-center justify-between"
          style={{ color: seattleWon ? "#34d399" : seattleLost ? "#f87171" : "#9ca3af" }}>
          <span>{seattleWon ? "W" : seattleLost ? "L" : "T"}</span>
          <span className="text-zinc-600 font-normal normal-case tracking-normal text-[9px]">
            {formatShortDate(game.kickoff).split(",")[0]}
          </span>
        </div>
        {/* Teams */}
        <div className="flex items-center justify-between gap-1">
          <div className="flex flex-col items-center gap-1 flex-1">
            <TeamLogo src={getTeamLogoUrl(game.seattleTeam)} emoji={game.seattleTeam.emoji} abbr={game.seattleTeam.abbr} size={28} />
            <span className={`font-display text-[13px] font-700 tabular-nums ${seattleLost ? "text-zinc-400" : "text-white"}`}>
              {game.seattleScore ?? "-"}
            </span>
          </div>
          <span className="font-display text-[11px] text-zinc-600 font-600">–</span>
          <div className="flex flex-col items-center gap-1 flex-1">
            <TeamLogo src={game.opponent.logo} emoji="🏟️" abbr={game.opponent.abbr} size={28} />
            <span className={`font-display text-[13px] font-700 tabular-nums ${seattleWon ? "text-zinc-400" : "text-white"}`}>
              {game.opponentScore ?? "-"}
            </span>
          </div>
        </div>
        {/* Opponent name */}
        <div className="text-center mt-1.5">
          <span className="text-[10px] text-zinc-500 truncate block">{game.opponent.shortName || game.opponent.abbr}</span>
        </div>
      </div>
    </div>
  )
}

export default function HomeClient() {
  const { selectedTeamIds, loaded } = useSelectedTeams()
  const { counts: teamClickCounts, recordClick } = useTeamClickCounts()
  const [games, setGames] = useState<Game[]>([])
  const [liveScores, setLiveScores] = useState<Record<string, ScoreUpdate>>({})
  const [loading, setLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState<string>("all")
  const liveScoresRef = useRef(liveScores)
  useEffect(() => { liveScoresRef.current = liveScores }, [liveScores])

  const fetchGames = useCallback(async () => {
    if (!loaded || selectedTeamIds.length === 0) return
    try {
      const WHL = ["thunderbirds", "silvertips"]
      const NCAA = ["uw-softball", "uw-soccer"]
      const espnIds = selectedTeamIds.filter(id => id !== "torrent" && !WHL.includes(id) && !NCAA.includes(id))
      const fetches: Promise<Game[]>[] = []
      if (espnIds.length > 0) fetches.push(fetch(`/api/schedule?teams=${espnIds.join(",")}`).then(r => r.ok ? r.json() : []))
      if (selectedTeamIds.includes("torrent")) fetches.push(fetch("/api/pwhl").then(r => r.ok ? r.json() : []))
      if (WHL.some(id => selectedTeamIds.includes(id))) {
        fetches.push(fetch("/api/whl").then(r => r.ok ? r.json() as Promise<Game[]> : []).then(gs => gs.filter(g => selectedTeamIds.includes(g.seattleTeamId))))
      }
      if (NCAA.some(id => selectedTeamIds.includes(id))) {
        fetches.push(fetch("/api/ncaa", { signal: AbortSignal.timeout(8000) }).then(r => r.ok ? r.json() as Promise<Game[]> : []).then(gs => gs.filter(g => selectedTeamIds.includes(g.seattleTeamId))).catch(() => []))
      }
      const results = await Promise.all(fetches)
      setGames(results.flat().sort((a, b) => new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime()))
    } catch { /* silent */ }
    finally { setLoading(false) }
  }, [loaded, selectedTeamIds])

  const fetchLive = useCallback(async () => {
    try {
      const r = await fetch("/api/live-scores"); if (!r.ok) return
      setLiveScores(await r.json())
    } catch { /* silent */ }
  }, [])

  useEffect(() => { if (loaded) { setLoading(true); fetchGames() } }, [loaded, fetchGames])

  useEffect(() => {
    fetchLive()
    let interval = setInterval(fetchLive, 30_000)
    const adaptive = setInterval(() => {
      const hasLive = Object.values(liveScoresRef.current).some(s => s.status === "live")
      clearInterval(interval); interval = setInterval(fetchLive, hasLive ? 2_000 : 30_000)
    }, 5_000)
    return () => { clearInterval(interval); clearInterval(adaptive) }
  }, [fetchLive])

  // Merge live scores
  const allGames = games.map(g => {
    const u = liveScores[g.id]; return u ? { ...g, status: u.status, seattleScore: u.seattleScore, opponentScore: u.opponentScore } : g
  })

  // Deduplicate filter bar: UW-football + UW-basketball + ... → one UW circle
  // Key by logo URL so same-logo variants collapse into one entry
  const followedTeamsSorted = SEATTLE_TEAMS
    .filter(t => selectedTeamIds.includes(t.id))
    .sort((a, b) => ((teamClickCounts[b.id] || 0) - (teamClickCounts[a.id] || 0)) || a.shortName.localeCompare(b.shortName))

  const filterItems = (() => {
    const seen = new Set<string>()
    return followedTeamsSorted.filter(t => {
      const key = getTeamLogoUrl(t) || t.id
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  })()

  // When a deduplicated filter item is clicked, match ALL teams with same logo
  const filterMatchIds = (filterId: string): string[] => {
    const item = SEATTLE_TEAMS.find(t => t.id === filterId)
    if (!item) return [filterId]
    const logoKey = getTeamLogoUrl(item) || filterId
    return SEATTLE_TEAMS.filter(t => (getTeamLogoUrl(t) || t.id) === logoKey).map(t => t.id)
  }

  // Filter by active team — groups same-logo variants (e.g. all UW sports)
  const filtered = activeFilter === "all"
    ? allGames
    : allGames.filter(g => filterMatchIds(activeFilter).includes(g.seattleTeamId))

  // Categorize
  const today = todayStr()
  const cutoff3 = daysAgo(3)
  const cutoff7 = daysFromNow(7)

  const recent = filtered.filter(g => {
    const d = dateStr(new Date(g.kickoff))
    return g.status === "ft" && d >= cutoff3 && d < today
  }).slice(-12)

  const todayGames = filtered.filter(g => dateStr(new Date(g.kickoff)) === today)

  const liveGames = filtered.filter(g => g.status === "live")

  const upcoming = filtered.filter(g => {
    const d = dateStr(new Date(g.kickoff))
    return g.status === "upcoming" && d > today && d <= cutoff7
  })

  // Group upcoming by date
  const upcomingByDate: Record<string, Game[]> = {}
  for (const g of upcoming) {
    const d = dateStr(new Date(g.kickoff))
    if (!upcomingByDate[d]) upcomingByDate[d] = []
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
        <span className="text-6xl">🦂</span>
        <h2 className="font-display text-[28px] font-800 text-white uppercase tracking-tight">No teams selected</h2>
        <p className="text-zinc-500 text-sm">Go to the Teams tab and follow the teams you want to track.</p>
      </div>
    )
  }

  return (
    <div style={{ paddingBottom: "1rem" }}>
      {/* ── Sticky header ───────────────────────────────────────────────── */}
      <div className="sticky top-0 z-30 glass-header">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-[22px] leading-none">🦂</span>
            <h1 className="font-display text-[26px] font-800 text-white leading-none uppercase tracking-tight">Scorpanion</h1>
          </div>
          {hasAnyLive && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full" style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.25)" }}>
              <span className="relative flex h-2 w-2 flex-shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
              </span>
              <span className="font-display text-[11px] font-700 text-red-400 uppercase tracking-widest">{liveCount} Live</span>
            </div>
          )}
        </div>

        {/* ── Team logo filter bar ─────────────────────────────────────── */}
        <div className="overflow-x-auto no-scrollbar px-4 pb-3">
          <div className="flex gap-3 min-w-max">
            {/* "All" button — circular like the others */}
            <button
              onClick={() => setActiveFilter("all")}
              className="flex flex-col items-center gap-1.5 flex-shrink-0"
            >
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
              const active = activeFilter === team.id
              const logoUrl = getTeamLogoUrl(team)
              return (
                <button
                  key={team.id}
                  onClick={() => { setActiveFilter(active ? "all" : team.id); recordClick(team.id) }}
                  className="flex flex-col items-center gap-1.5 flex-shrink-0"
                >
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center transition-all overflow-hidden p-1"
                    style={{
                      background: active ? `${team.primaryColor}30` : "var(--surface-2)",
                      border: `2px solid ${active ? team.primaryColor : "rgba(255,255,255,0.1)"}`,
                      boxShadow: active ? `0 0 14px ${team.primaryColor}55` : "none",
                      opacity: !active && activeFilter !== "all" ? 0.4 : 1,
                    }}
                  >
                    <TeamLogo src={logoUrl} emoji={team.emoji} abbr={team.abbr} size={32} />
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── Live now banner ──────────────────────────────────────────────── */}
      {hasAnyLive && (
        <div className="relative overflow-hidden mx-3 mt-3 rounded-2xl" style={{ border: "1px solid rgba(239,68,68,0.2)" }}>
          <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, rgba(239,68,68,0.1) 0%, transparent 60%)" }} />
          <div className="relative px-4 py-2.5 flex items-center gap-3">
            <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
            </span>
            <span className="font-display text-[13px] font-700 text-white uppercase tracking-wider">
              {liveCount === 1 ? "1 game live" : `${liveCount} games live`}
            </span>
            <span className="text-[10px] text-red-400/70 ml-auto">Updating every 2s</span>
          </div>
          <div className="pb-2">
            {liveGames.map(g => <GameCard key={g.id} game={g} />)}
          </div>
        </div>
      )}

      {/* ── Recent results (horizontal scroll) ───────────────────────────── */}
      {recent.length > 0 && (
        <div className="mt-5">
          <div className="flex items-center gap-3 px-4 mb-3">
            <span className="font-display text-[13px] font-700 text-zinc-400 uppercase tracking-widest">Recent</span>
            <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
            <span className="font-display text-[10px] text-zinc-600 uppercase tracking-wider">Last 3 days</span>
          </div>
          <div className="overflow-x-auto no-scrollbar px-4">
            <div className="flex gap-3 min-w-max pb-1">
              {recent.map(g => <RecentCard key={g.id} game={g} />)}
            </div>
          </div>
        </div>
      )}

      {/* ── Today ────────────────────────────────────────────────────────── */}
      {todayGames.length > 0 && (
        <div className="mt-5">
          <div className="px-4 mb-2 flex items-center gap-3">
            <span className="font-display text-[13px] font-700 uppercase tracking-widest" style={{ color: "var(--accent)" }}>Today</span>
            <span
              className="font-display text-[9px] font-700 uppercase tracking-wider px-2 py-0.5 rounded-full"
              style={{ background: "var(--accent-dim)", color: "var(--accent)" }}
            >
              {new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
            </span>
            <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
          </div>
          {todayGames.map(g => <GameCard key={g.id} game={g} />)}
        </div>
      )}

      {/* No games today */}
      {todayGames.length === 0 && !hasAnyLive && recent.length === 0 && (
        <div className="mt-8 text-center px-8">
          <span className="text-5xl block mb-3">🏟️</span>
          <p className="font-display text-[16px] font-700 text-zinc-400 uppercase tracking-wide">No games today</p>
        </div>
      )}

      {/* ── Next 7 days ──────────────────────────────────────────────────── */}
      {upcomingDates.length > 0 && (
        <div className="mt-5">
          <div className="px-4 mb-1 flex items-center gap-3">
            <span className="font-display text-[13px] font-700 text-zinc-400 uppercase tracking-widest">Upcoming</span>
            <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
            <span className="font-display text-[10px] text-zinc-600 uppercase tracking-wider">Next 7 days</span>
          </div>
          {upcomingDates.map(ds => (
            <div key={ds}>
              <div
                className="sticky z-10 px-4 py-2 flex items-center gap-3"
                style={{ top: "112px", background: "rgba(8,8,15,0.95)", backdropFilter: "blur(12px)" }}
              >
                <span className="font-display text-[11px] font-700 text-zinc-400 uppercase tracking-widest">{formatDayHeader(ds)}</span>
                <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
                <span className="font-display text-[10px] text-zinc-600">{upcomingByDate[ds].length} game{upcomingByDate[ds].length !== 1 ? "s" : ""}</span>
              </div>
              {upcomingByDate[ds].map(g => <GameCard key={g.id} game={g} />)}
            </div>
          ))}
        </div>
      )}

      {upcoming.length === 0 && upcomingDates.length === 0 && todayGames.length === 0 && !hasAnyLive && (
        <div className="mt-4 mx-4 p-4 rounded-2xl text-center" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
          <p className="font-display text-[13px] font-600 text-zinc-500 uppercase tracking-wider">No games in the next 7 days</p>
        </div>
      )}
    </div>
  )
}
