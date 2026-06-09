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
function daysAgo(n: number) { const d = new Date(); d.setDate(d.getDate() - n); return dateStr(d) }
function daysFromNow(n: number) { const d = new Date(); d.setDate(d.getDate() + n); return dateStr(d) }
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })
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

// ── Standings (for game detail sheet) ─────────────────────────────────────
const STANDINGS_LEAGUE_MAP: Record<string, string> = {
  mlb: "mlb", nhl: "nhl", wnba: "wnba", "usa.1": "mls", nfl: "nfl",
}

interface StandingsRow { teamId: string; abbr: string; logo: string; wins: number; losses: number; winPct: number; isSeattle: boolean }
interface Division { name: string; entries: StandingsRow[] }

// ── Recent result detail bottom sheet ────────────────────────────────────
function GameDetailSheet({ game, onClose }: { game: Game; onClose: () => void }) {
  const [standings, setStandings] = useState<Division[]>([])
  const seattleWon = (game.seattleScore ?? 0) > (game.opponentScore ?? 0)
  const seattleLost = (game.seattleScore ?? 0) < (game.opponentScore ?? 0)
  const color = game.seattleTeam.primaryColor

  const leagueKey = STANDINGS_LEAGUE_MAP[game.league]
  useEffect(() => {
    if (!leagueKey) return
    fetch(`/api/standings?league=${leagueKey}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.divisions) setStandings(d.divisions) })
      .catch(() => {})
  }, [leagueKey])

  // Find the division that contains Seattle
  const seattleDivision = standings.find(div => div.entries.some(e => e.isSeattle))
  const seattleEntry = seattleDivision?.entries.find(e => e.isSeattle)

  return (
    <>
      <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50" onClick={onClose} />
      <div
        className="fixed bottom-0 left-0 right-0 z-50 lg:max-w-2xl lg:mx-auto rounded-t-3xl overflow-hidden animate-slide-up"
        style={{ background: "var(--surface)", paddingBottom: "env(safe-area-inset-bottom)", maxHeight: "85dvh", overflowY: "auto" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="w-10 h-1 rounded-full bg-white/15 mx-auto mt-3 mb-1 flex-shrink-0" />

        {/* Header gradient */}
        <div className="relative px-5 pt-3 pb-6" style={{ background: `linear-gradient(135deg, ${color}40 0%, ${game.seattleTeam.secondaryColor}18 50%, transparent 100%)` }}>
          <button onClick={onClose} className="absolute top-3 right-4 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white text-sm hover:bg-white/20">✕</button>

          {/* Status + date */}
          <div className="flex items-center gap-2 mb-4">
            <span className="font-display text-[11px] font-700 text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full uppercase tracking-wider">Final</span>
            <span className="text-[11px] text-zinc-400 bg-white/5 px-2.5 py-1 rounded-full">{fmtDate(game.kickoff)}</span>
            {game.broadcast && <span className="text-[11px] text-zinc-400 bg-white/5 px-2.5 py-1 rounded-full">{game.broadcast}</span>}
          </div>

          {/* Face-off */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 flex flex-col items-center gap-2">
              <TeamLogo src={getTeamLogoUrl(game.seattleTeam)} emoji={game.seattleTeam.emoji} abbr={game.seattleTeam.abbr} size={56} />
              <div className="font-display text-[15px] font-700 text-white text-center leading-tight">{game.seattleTeam.shortName}</div>
              {game.seattleRecord && <div className="text-[11px] text-zinc-500 text-center">{game.seattleRecord.wins}-{game.seattleRecord.losses}</div>}
            </div>
            <div className="flex flex-col items-center gap-1 min-w-[100px]">
              <div className="font-display font-800 tabular-nums leading-none text-[40px] text-white">
                <span className={seattleLost ? "text-zinc-400" : ""}>{game.seattleScore}</span>
                <span className="text-zinc-600 mx-1 text-[28px]">-</span>
                <span className={seattleWon ? "text-zinc-400" : ""}>{game.opponentScore}</span>
              </div>
              <span className={`text-[11px] font-bold uppercase tracking-wider mt-1 ${seattleWon ? "text-emerald-400" : seattleLost ? "text-red-400" : "text-zinc-500"}`}>
                {seattleWon ? "W" : seattleLost ? "L" : "T"}
              </span>
              <span className="text-[9px] uppercase tracking-widest font-bold text-zinc-600 mt-0.5">{game.isHome ? "Home" : "Away"}</span>
            </div>
            <div className="flex-1 flex flex-col items-center gap-2">
              <TeamLogo src={game.opponent.logo} emoji="🏟️" abbr={game.opponent.abbr} size={56} />
              <div className="font-display text-[15px] font-700 text-white text-center leading-tight">{game.opponent.shortName || game.opponent.name}</div>
              {game.opponentRecord && <div className="text-[11px] text-zinc-500 text-center">{game.opponentRecord.wins}-{game.opponentRecord.losses}</div>}
            </div>
          </div>
        </div>

        {/* Details */}
        <div className="px-5 py-3 border-t border-white/5 space-y-2.5">
          {game.venue?.name && (
            <div className="flex items-center gap-2.5 text-zinc-400 text-sm">
              <span>📍</span>
              <span>{game.venue.name}{game.venue.city ? `, ${game.venue.city}` : ""}</span>
            </div>
          )}
          <div className="flex items-center gap-2.5 text-zinc-400 text-sm">
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
            <span className="capitalize">{game.sport} · <span className="uppercase text-[11px] tracking-wider">{game.league}</span></span>
          </div>
        </div>

        {/* Standings */}
        {seattleDivision && (
          <div className="px-5 pb-6 border-t border-white/5">
            <div className="font-display text-[11px] font-700 uppercase tracking-widest text-zinc-500 mt-4 mb-3">{seattleDivision.name} Standings</div>
            <div className="space-y-1">
              {seattleDivision.entries.map((e, i) => (
                <div
                  key={e.teamId}
                  className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl"
                  style={{ background: e.isSeattle ? `${color}20` : "transparent", border: e.isSeattle ? `1px solid ${color}40` : "1px solid transparent" }}
                >
                  <span className="font-display text-[11px] text-zinc-600 w-4 text-right flex-shrink-0">{i + 1}</span>
                  {e.logo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={e.logo} alt={e.abbr} width={20} height={20} className="object-contain flex-shrink-0" />
                  ) : (
                    <span className="w-5 h-5 rounded-full bg-white/10 flex-shrink-0" />
                  )}
                  <span className={`font-display text-[13px] font-700 flex-1 ${e.isSeattle ? "text-white" : "text-zinc-300"}`}>{e.abbr}</span>
                  <span className="font-display text-[12px] font-600 text-zinc-400 tabular-nums">{e.wins}-{e.losses}</span>
                  <span className="font-display text-[11px] text-zinc-600 w-8 text-right tabular-nums">{(e.winPct * 100).toFixed(0)}%</span>
                </div>
              ))}
            </div>
            {seattleEntry && (
              <div className="mt-3 text-center">
                <span className="text-[10px] text-zinc-600">
                  {game.seattleTeam.shortName}: #{seattleDivision.entries.findIndex(e => e.isSeattle) + 1} in {seattleDivision.name}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}

// ── Recent game mini-card (horizontal scroll, tappable) ───────────────────
function RecentCard({ game, onClick }: { game: Game; onClick: () => void }) {
  const seattleWon = (game.seattleScore ?? 0) > (game.opponentScore ?? 0)
  const seattleLost = (game.seattleScore ?? 0) < (game.opponentScore ?? 0)
  const color = game.seattleTeam.primaryColor
  const resultColor = seattleWon ? "#34d399" : seattleLost ? "#f87171" : "#9ca3af"

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
          <span className="font-display text-[12px] font-800 uppercase tracking-wide" style={{ color: resultColor }}>
            {seattleWon ? "W" : seattleLost ? "L" : "T"}
          </span>
          <span className="text-[10px] text-zinc-600">{fmtDate(game.kickoff).replace(/,.*/, "")}</span>
        </div>
        {/* Teams + scores */}
        <div className="flex items-center justify-between gap-1.5">
          <div className="flex flex-col items-center gap-1 flex-1">
            <TeamLogo src={getTeamLogoUrl(game.seattleTeam)} emoji={game.seattleTeam.emoji} abbr={game.seattleTeam.abbr} size={26} />
            <span className={`font-display text-[14px] font-800 tabular-nums ${seattleLost ? "text-zinc-500" : "text-white"}`}>
              {game.seattleScore ?? "–"}
            </span>
          </div>
          <span className="font-display text-[10px] text-zinc-700 font-600 self-center pb-3">–</span>
          <div className="flex flex-col items-center gap-1 flex-1">
            <TeamLogo src={game.opponent.logo} emoji="🏟️" abbr={game.opponent.abbr} size={26} />
            <span className={`font-display text-[14px] font-800 tabular-nums ${seattleWon ? "text-zinc-500" : "text-white"}`}>
              {game.opponentScore ?? "–"}
            </span>
          </div>
        </div>
        {/* Opponent name + tap hint */}
        <div className="flex items-center justify-between mt-2">
          <span className="text-[10px] text-zinc-600 truncate flex-1">vs {game.opponent.shortName || game.opponent.abbr}</span>
          <span className="text-[9px] text-zinc-700 flex-shrink-0 ml-1">›</span>
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
  const { selectedTeamIds, loaded } = useSelectedTeams()
  const { counts: teamClickCounts, recordClick } = useTeamClickCounts()
  const [games, setGames] = useState<Game[]>([])
  const [liveScores, setLiveScores] = useState<Record<string, ScoreUpdate>>({})
  const [loading, setLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState<string>("all")
  const [collegePicker, setCollegePicker] = useState<string | null>(null) // groupKey "uw" | "wsu"
  const [selectedRecentGame, setSelectedRecentGame] = useState<Game | null>(null)
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
  const cutoff3 = daysAgo(3)
  const cutoff14 = daysFromNow(14)

  const recent = filtered.filter(g => {
    const d = dateStr(new Date(g.kickoff))
    return g.status === "ft" && d >= cutoff3 && d <= today
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
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/scorpion-logo.png" alt="Scorpanion" width={28} height={28} className="object-contain" />
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
              // For college: active if any sport from this group is selected
              const isActive = isCollege
                ? filterMatchIds(team.id).includes(activeFilter) && activeFilter !== "all"
                : activeFilter === team.id
              const logoUrl = getTeamLogoUrl(team)

              return (
                <div key={team.id} className="relative flex-shrink-0">
                  <button
                    onClick={() => {
                      if (isCollege) {
                        // Toggle picker
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

                  {/* College sport picker dropdown */}
                  {pickerOpen && gk && (
                    <CollegeSportPicker
                      groupKey={gk}
                      availableTeams={SEATTLE_TEAMS
                        .filter(t => getCollegeGroupKey(t.id) === gk && selectedTeamIds.includes(t.id))
                        .map(t => ({
                          team: t,
                          hasGames: allGames.some(g => g.seattleTeamId === t.id),
                        }))
                      }
                      selectedTeamIds={selectedTeamIds}
                      activeFilter={activeFilter}
                      onSelect={(id) => {
                        setActiveFilter(id)
                        recordClick(id)
                        setCollegePicker(null)
                      }}
                      onSelectAll={() => {
                        setActiveFilter(team.id) // use first variant = show all via filterMatchIds
                        setCollegePicker(null)
                      }}
                      onClose={() => setCollegePicker(null)}
                    />
                  )}
                </div>
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
          <div className="pb-2">{liveGames.map(g => <GameCard key={g.id} game={g} />)}</div>
        </div>
      )}

      {/* ── Recent results (horizontal scroll, tappable) ─────────────────── */}
      {recent.length > 0 && (
        <div className="mt-5">
          <div className="flex items-center gap-3 px-4 mb-3">
            <span className="font-display text-[13px] font-700 text-zinc-400 uppercase tracking-widest">Recent</span>
            <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
            <span className="font-display text-[10px] text-zinc-600 uppercase tracking-wider">Last 3 days</span>
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

      {/* ── Today ────────────────────────────────────────────────────────── */}
      {todayGames.filter(g => g.status !== "ft").length > 0 && (
        <div className="mt-5">
          {/* Bold "TODAY" banner */}
          <div className="mx-3 mb-2 rounded-xl px-4 py-2.5 flex items-center gap-3" style={{ background: "linear-gradient(135deg, rgba(0,212,255,0.12) 0%, rgba(0,212,255,0.04) 100%)", border: "1px solid rgba(0,212,255,0.2)" }}>
            <span className="relative flex h-2 w-2 flex-shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60" style={{ background: "var(--accent)" }} />
              <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: "var(--accent)" }} />
            </span>
            <span className="font-display text-[14px] font-800 uppercase tracking-widest" style={{ color: "var(--accent)" }}>Today</span>
            <span className="font-display text-[11px] font-600 text-zinc-500 ml-auto">
              {new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
            </span>
          </div>
          {todayGames.filter(g => g.status !== "ft").map(g => <GameCard key={g.id} game={g} />)}
        </div>
      )}

      {todayGames.length === 0 && !hasAnyLive && recent.length === 0 && (
        <div className="mt-8 text-center px-8">
          <span className="text-5xl block mb-3">🏟️</span>
          <p className="font-display text-[16px] font-700 text-zinc-400 uppercase tracking-wide">No games today</p>
        </div>
      )}

      {/* ── Next 14 days ──────────────────────────────────────────────────── */}
      {upcomingDates.length > 0 && (
        <div className="mt-5">
          <div className="px-4 mb-1 flex items-center gap-3">
            <span className="font-display text-[13px] font-700 text-zinc-300 uppercase tracking-widest">Upcoming</span>
            <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
            <span className="font-display text-[10px] text-zinc-600 uppercase tracking-wider">
              {upcomingFallback.length > 0 ? "Next scheduled" : "Next 14 days"}
            </span>
          </div>
          {upcomingDates.map(ds => (
            <div key={ds}>
              <div className="sticky z-10 px-4 py-2 flex items-center gap-3" style={{ top: "112px", background: "rgba(8,8,15,0.95)", backdropFilter: "blur(12px)" }}>
                <span className="font-display text-[11px] font-700 text-zinc-400 uppercase tracking-widest">{fmtDayHeader(ds)}</span>
                <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
                <span className="font-display text-[10px] text-zinc-600">{upcomingByDate[ds].length} game{upcomingByDate[ds].length !== 1 ? "s" : ""}</span>
              </div>
              {upcomingByDate[ds].map(g => <GameCard key={g.id} game={g} />)}
            </div>
          ))}
        </div>
      )}

      {allUpcoming.length === 0 && todayGames.length === 0 && !hasAnyLive && (
        <div className="mt-4 mx-4 p-4 rounded-2xl text-center" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
          <p className="font-display text-[13px] font-600 text-zinc-500 uppercase tracking-wider">No upcoming games scheduled</p>
        </div>
      )}

      {/* ── Recent game detail sheet ──────────────────────────────────────── */}
      {selectedRecentGame && (
        <GameDetailSheet game={selectedRecentGame} onClose={() => setSelectedRecentGame(null)} />
      )}
    </div>
  )
}
