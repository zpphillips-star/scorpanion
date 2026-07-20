"use client"
import { useState, useEffect, useRef, useCallback } from "react"
import { Game } from "@/lib/types"
import { SEATTLE_TEAMS, getTeamLogoUrl } from "@/lib/teams"
import { ALL_PRO_TEAMS } from "@/lib/allProTeams"
import { useTeamClickCounts } from "@/hooks/useTeamClickCounts"
import { useSportsData } from "@/context/SportsDataContext"
import TeamLogo from "@/components/TeamLogo"
import PageHeader from "@/components/PageHeader"
import { TodayGameCard } from "@/components/TodayGameCard"
import GameDetailSheet from "@/components/GameDetailSheet"
import { OFFSEASON_DISPLAY } from "@/lib/seasonDates"
import { TournamentCard } from "@/components/PGATournamentCard"
import type { PGATournament } from "@/app/api/pga/route"

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

/**
 * Safely parse a game kickoff string to a Date, handling both:
 *   • ISO 8601: "2026-07-19T20:10:00Z"  (works in all browsers)
 *   • Legacy MLB format: "07/19/2026 20:10:00"  (Safari rejects this → Invalid Date)
 * Converts legacy format to ISO before constructing the Date so Safari/WebKit
 * works correctly. The time component is treated as UTC to match the server.
 */
function parseKickoff(kickoff: string): Date {
  if (!kickoff) return new Date(NaN)
  // Already ISO 8601 — fast path (most games)
  if (kickoff.includes("T") || kickoff.startsWith("20")) return new Date(kickoff)
  // Legacy "MM/DD/YYYY HH:MM:SS" — convert to "YYYY-MM-DDTHH:MM:SSZ"
  const [datePart = "", timePart = "00:00:00"] = kickoff.split(" ")
  const parts = datePart.split("/")
  if (parts.length === 3) {
    const [mm, dd, yyyy] = parts
    return new Date(`${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}T${timePart}Z`)
  }
  return new Date(kickoff) // last-resort fallback
}
function daysAgo(n: number, tz?: string) {
  const d = new Date(); d.setDate(d.getDate() - n); return dateStr(d, tz)
}
function daysFromNow(n: number, tz?: string) {
  const d = new Date(); d.setDate(d.getDate() + n); return dateStr(d, tz)
}
function fmtDate(iso: string) {
  return parseKickoff(iso).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
}
function fmtTime(iso: string) {
  return parseKickoff(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }).replace(/\s?(am|pm)/i, m => m.toUpperCase().trim()).replace(/^(\d)/, h => h)
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
                  Next: {parseKickoff(next.kickoff).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
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
              const days = Math.ceil((parseKickoff(next.kickoff).getTime() - Date.now()) / 86400000)
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

// ── Golf tournament data hook ─────────────────────────────────────────────────
// Fetches PGA or LPGA tournament list and refreshes on an interval.
function useGolfTournaments(tourId: 'pga' | 'lpga', enabled: boolean) {
  const [tournaments, setTournaments] = useState<PGATournament[]>([])
  const [loaded, setLoaded] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const doFetch = useCallback(async () => {
    try {
      const r = await fetch(`/api/${tourId}`)
      if (!r.ok) return
      const data: PGATournament[] = await r.json()
      setTournaments(data)
      setLoaded(true)
      // Faster polling when live, slower otherwise
      const isLive = data.some(t => t.status === 'live')
      const nextMs = isLive ? 60_000 : 5 * 60_000
      if (intervalRef.current) clearInterval(intervalRef.current)
      intervalRef.current = setInterval(doFetch, nextMs)
    } catch {
      setLoaded(true)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tourId])

  useEffect(() => {
    if (!enabled) { setTournaments([]); setLoaded(true); return }
    doFetch()
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [enabled, doFetch])

  return { tournaments, loaded }
}

// ── Golf today card ───────────────────────────────────────────────────────────
// Matches TodayGameCard exactly — same layout, left border, header, body.
// Shows top 5 leaderboard rows instead of a head-to-head score.
function GolfTodayCard({ tournament, label, accentColor }: {
  tournament: PGATournament
  label: string
  accentColor: string
}) {
  const [showDetail, setShowDetail] = useState(false)
  const isLive = tournament.status === 'live'
  const isFt   = tournament.status === 'completed'

  // "Round 3" → "Day 3 of 4"
  const roundMatch = tournament.roundLabel.match(/\d+/)
  const roundNum   = roundMatch ? parseInt(roundMatch[0]) : null
  const dayLabel   = roundNum ? `Day ${roundNum} of 4` : tournament.roundLabel

  const logoUrl = label === 'LPGA'
    ? 'https://a.espncdn.com/combiner/i?img=/i/teamlogos/leagues/500/lpga.png'
    : 'https://a.espncdn.com/combiner/i?img=/i/teamlogos/leagues/500/pga.png'

  function scoreColor(s: string) {
    if (s.startsWith('-')) return '#4ade80'
    if (s.startsWith('+')) return '#f87171'
    return '#e4e4e7'
  }

  return (
    <>
      <button className="w-full text-left active:opacity-70 transition-opacity" onClick={() => setShowDetail(true)}>
        <div style={{
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          borderLeft: isLive ? "3px solid #ef4444" : "none",
          paddingLeft: isLive ? "13px" : "16px",
          opacity: isFt ? 0.82 : 1,
        }}>
          {/* Header — same as TodayGameCard */}
          <div className="flex items-center justify-between pr-4 pt-4 pb-1">
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--text-faint)" }}>
              {label}
            </span>
            {isLive ? (
              <div className="flex items-center gap-1.5">
                <span className="relative flex h-1.5 w-1.5 flex-shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500" />
                </span>
                <span className="text-[11px] font-bold text-red-400 uppercase tracking-wider">Live</span>
              </div>
            ) : isFt ? (
              <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--text-faint)" }}>Final</span>
            ) : (
              <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">{tournament.roundLabel}</span>
            )}
          </div>

          {/* Body: Day X of 4  |  Logo  |  Tournament name */}
          <div className="flex items-center pr-4 py-5">
            {/* Left: day label */}
            <div className="flex-1 flex items-center justify-center">
              <span className="text-[13px] font-bold text-center leading-tight" style={{ color: "#f0f0f8" }}>{dayLabel}</span>
            </div>

            {/* Center: tour logo */}
            <div className="flex items-center justify-center" style={{ width: 56 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={logoUrl}
                alt={label}
                style={{ width: 48, height: 48, objectFit: 'contain' }}
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
              />
            </div>

            {/* Right: tournament name */}
            <div className="flex-1 flex items-center justify-center">
              <span className="text-[13px] font-bold text-center leading-tight" style={{ color: "#f0f0f8" }}>
                {tournament.shortName || tournament.name}
              </span>
            </div>
          </div>
        </div>
      </button>

      {/* Full leaderboard detail sheet */}
      {showDetail && (
        <div className="fixed inset-0 z-50 flex flex-col" style={{ background: 'rgba(0,0,0,0.75)' }} onClick={() => setShowDetail(false)}>
          <div className="flex-1" />
          <div className="rounded-t-2xl overflow-hidden flex flex-col" style={{ background: 'var(--bg)', maxHeight: '85vh' }} onClick={e => e.stopPropagation()}>
            <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
              <div className="w-10 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.15)' }} />
            </div>
            <div className="px-5 pb-4 flex-shrink-0">
              <div className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: accentColor }}>{label} · {tournament.roundLabel}</div>
              <div className="text-[20px] font-bold text-white leading-tight">{tournament.name}</div>
              {tournament.course && <div className="text-[12px] text-zinc-500 mt-0.5">{tournament.course}{tournament.location ? ` · ${tournament.location}` : ''}</div>}
            </div>
            <div className="overflow-y-auto flex-1 pb-8">
              <div className="grid px-5 py-2 sticky top-0" style={{ gridTemplateColumns: '32px 1fr 48px 44px', background: 'var(--bg)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                <span /><span className="text-[9px] tracking-widest uppercase font-semibold text-zinc-600">Player</span>
                <span className="text-[9px] tracking-widest uppercase font-semibold text-right text-zinc-600">Total</span>
                <span className="text-[9px] tracking-widest uppercase font-semibold text-right text-zinc-600">Rd</span>
              </div>
              {tournament.leaders.map((p, i) => (
                <div key={`${p.name}-${i}`} className="grid items-center px-5 py-2.5" style={{ gridTemplateColumns: '32px 1fr 48px 44px', borderBottom: i < tournament.leaders.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                  <span className="text-[11px] tabular-nums text-zinc-500">{p.position}</span>
                  <span className="text-[13px] font-semibold text-white truncate pr-2">{p.shortName || p.name}</span>
                  <span className="text-right text-[13px] font-bold tabular-nums" style={{ color: scoreColor(p.totalScore) }}>{p.totalScore}</span>
                  <span className="text-right text-[12px] text-zinc-600 tabular-nums">{p.todayScore}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ── Golf recent card ──────────────────────────────────────────────────────────
// Matches the RecentCard style: compact horizontal scroll card
function GolfRecentCard({ tournament, label, accentColor }: {
  tournament: PGATournament
  label: string
  accentColor: string
}) {
  const [showDetail, setShowDetail] = useState(false)
  const winner = tournament.leaders[0]
  const fmtDate = (iso: string) => {
    if (!iso) return ''
    try { return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) } catch { return '' }
  }

  return (
    <>
      <button
        onClick={() => setShowDetail(true)}
        className="flex-shrink-0 w-[148px] text-left active:opacity-70 transition-opacity last:border-r-0 pr-7 mr-7 last:pr-0 last:mr-0"
        style={{ borderRight: '1px solid rgba(255,255,255,0.07)' }}
      >
        {/* Date + label */}
        <div className="flex items-center justify-between mb-4 px-1">
          <span className="text-[10px] text-zinc-600">{fmtDate(tournament.endDate)}</span>
          <span className="text-[10px] text-zinc-700 uppercase tracking-wide">{label}</span>
        </div>
        {/* Tournament name */}
        <div className="px-1 mb-2">
          <span className="text-[12px] font-semibold text-white leading-tight block truncate">
            {tournament.shortName || tournament.name}
          </span>
          <span className="text-[10px] text-zinc-600 uppercase tracking-wide mt-0.5 block">Final</span>
        </div>
        {/* Winner row */}
        {winner && (
          <div className="px-1">
            <div className="flex items-baseline justify-between gap-1">
              <span className="text-[12px] text-zinc-300 truncate flex-1">{winner.shortName || winner.name}</span>
              <span className="text-[14px] font-bold tabular-nums flex-shrink-0"
                    style={{ color: winner.totalScore.startsWith('-') ? '#4ade80' : winner.totalScore.startsWith('+') ? '#f87171' : '#e4e4e7' }}>
                {winner.totalScore}
              </span>
            </div>
          </div>
        )}
      </button>

      {showDetail && (
        <div className="fixed inset-0 z-50 flex flex-col" style={{ background: 'rgba(0,0,0,0.75)' }} onClick={() => setShowDetail(false)}>
          <div className="flex-1" />
          <div className="rounded-t-2xl overflow-hidden flex flex-col" style={{ background: '#0c1b31', maxHeight: '85vh' }} onClick={e => e.stopPropagation()}>
            <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
              <div className="w-10 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.15)' }} />
            </div>
            <div className="px-5 pb-4 flex-shrink-0">
              <div className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: accentColor }}>{label} · Final</div>
              <div className="text-[20px] font-bold text-white leading-tight">{tournament.name}</div>
              {tournament.course && <div className="text-[12px] text-zinc-500 mt-0.5">{tournament.course}{tournament.location ? ` · ${tournament.location}` : ''}</div>}
            </div>
            <div className="overflow-y-auto flex-1 pb-8">
              <div className="grid px-5 py-2 sticky top-0" style={{ gridTemplateColumns: '32px 1fr 48px 44px', background: '#0c1b31', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                <span /><span className="text-[9px] tracking-widest uppercase font-semibold text-zinc-600">Player</span>
                <span className="text-[9px] tracking-widest uppercase font-semibold text-right text-zinc-600">Total</span>
                <span className="text-[9px] tracking-widest uppercase font-semibold text-right text-zinc-600">Rd</span>
              </div>
              {tournament.leaders.map((p, i) => (
                <div key={`${p.name}-${i}`} className="grid items-center px-5 py-2.5" style={{ gridTemplateColumns: '32px 1fr 48px 44px', borderBottom: i < tournament.leaders.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                  <span className="text-[11px] font-semibold tabular-nums text-zinc-500">{p.position}</span>
                  <span className="text-[13px] font-semibold text-white truncate pr-2">{p.shortName || p.name}</span>
                  <span className="text-right text-[13px] font-bold tabular-nums" style={{ color: p.totalScore.startsWith('-') ? '#4ade80' : p.totalScore.startsWith('+') ? '#f87171' : '#e4e4e7' }}>{p.totalScore}</span>
                  <span className="text-right text-[12px] text-zinc-600 tabular-nums">{p.todayScore}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ── Golf upcoming row ─────────────────────────────────────────────────────────
// Matches the upcoming game row style: name left, date right, inside a date group
function GolfUpcomingRow({ tournament, label, accentColor }: {
  tournament: PGATournament
  label: string
  accentColor: string
}) {
  const fmtDate = (iso: string) => {
    if (!iso) return ''
    try { return new Date(iso).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) } catch { return '' }
  }
  return (
    <div className="py-3 border-b border-white/5">
      <div className="pl-6 mb-1.5 flex items-center gap-2">
        <span className="text-[11px] uppercase tracking-wide tabular-nums font-semibold" style={{ color: accentColor }}>
          {label}
        </span>
        {tournament.course && (
          <span className="text-[10px] text-zinc-600">{tournament.course}</span>
        )}
      </div>
      <div className="px-4 flex items-center justify-between gap-2">
        <span className="text-[14px] font-semibold text-white truncate flex-1 leading-tight">
          {tournament.shortName || tournament.name}
        </span>
        <span className="text-[12px] text-zinc-500 flex-shrink-0">
          {fmtDate(tournament.startDate)}
        </span>
      </div>
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
      className="flex-shrink-0 w-[148px] text-left active:opacity-70 transition-opacity last:border-r-0 pr-7 mr-7 last:pr-0 last:mr-0"
      style={{ borderRight: "1px solid rgba(255,255,255,0.07)" }}
    >
      {/* Date + league — inset so it doesn't crowd the edges */}
      <div className="flex items-center justify-between mb-4 px-1">
        <span className="text-[10px] text-zinc-600">{fmtDate(game.kickoff).replace(/,.*/, "")}</span>
        <span className="text-[10px] text-zinc-700 uppercase tracking-wide">{game.league.toUpperCase()}</span>
      </div>
      {/* Logo · Score · Logo */}
      <div className="flex items-center justify-between gap-1">
        {/* Seattle team */}
        <div className="flex flex-col items-center flex-1">
          <TeamLogo src={getTeamLogoUrl(game.seattleTeam)} emoji={game.seattleTeam.emoji} abbr={game.seattleTeam.abbr} size={26} />
          <span className="text-[10px] text-zinc-500 font-semibold tracking-wide mt-0.5">{game.seattleTeam.abbr}</span>
          <span className={`font-display text-[17px] font-800 tabular-nums leading-none mt-1.5 ${seattleLost ? "text-zinc-500" : hasScore ? "text-white" : "text-zinc-600"}`}>
            {hasScore ? game.seattleScore : "–"}
          </span>
        </div>
        <span className="text-[11px] text-zinc-700 self-center pb-2">–</span>
        {/* Opponent */}
        <div className="flex flex-col items-center flex-1">
          <TeamLogo src={game.opponent.logo} emoji="🏟️" abbr={game.opponent.abbr} size={26} />
          <span className="text-[10px] text-zinc-500 font-semibold tracking-wide mt-0.5">{game.opponent.abbr}</span>
          <span className={`font-display text-[17px] font-800 tabular-nums leading-none mt-1.5 ${seattleWon ? "text-zinc-500" : hasScore ? "text-white" : "text-zinc-600"}`}>
            {hasScore ? game.opponentScore : "–"}
          </span>
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

  // Golf follow state — always fetch if user follows, regardless of active filter
  // (The active filter only hides golf from the Today section, not from Recent/Upcoming)
  const pgaFollowed = selectedTeamIds.includes('pga')
  const lpgaFollowed = selectedTeamIds.includes('lpga')

  // Fetch golf data at the HomeClient level so we can classify into Today/Upcoming/Recent
  // Always enabled if followed — data fetches even when a sport filter is active
  const { tournaments: pgaTournaments } = useGolfTournaments('pga', pgaFollowed)
  const { tournaments: lpgaTournaments } = useGolfTournaments('lpga', lpgaFollowed)

  // Golf filter-aware visibility — controls Today section rendering when filter is active
  const pgaVisibleInFilter = pgaFollowed && (activeFilter === 'all' || activeFilter === 'pga')
  const lpgaVisibleInFilter = lpgaFollowed && (activeFilter === 'all' || activeFilter === 'lpga')

  // ── Date helpers — declared early so golf filters can reference `today` ────
  const today = todayStr()
  const cutoff7 = daysAgo(7)
  const cutoff14 = daysFromNow(14)

  // Classify PGA tournaments by section
  // Today: live OR completed-today (tournament ended during today/yesterday UTC→PT shift)
  const pgaToday = pgaTournaments.filter(t => {
    if (!pgaVisibleInFilter) return false
    if (t.status === 'live') return true
    // Show completed tournaments that ended on today's or yesterday's date (covers UTC→PT rollover)
    if (t.status === 'completed' && t.endDate) {
      const endDs = dateStr(new Date(t.endDate))
      return endDs === today || endDs === daysAgo(1)
    }
    return false
  })
  const pgaUpcoming = pgaTournaments.filter(t => pgaVisibleInFilter && t.status === 'upcoming')
  const pgaRecent = pgaTournaments.filter(t => t.status === 'completed').slice(0, 1)

  // Classify LPGA tournaments by section
  const lpgaToday = lpgaTournaments.filter(t => {
    if (!lpgaVisibleInFilter) return false
    if (t.status === 'live') return true
    if (t.status === 'completed' && t.endDate) {
      const endDs = dateStr(new Date(t.endDate))
      return endDs === today || endDs === daysAgo(1)
    }
    return false
  })
  const lpgaUpcoming = lpgaTournaments.filter(t => lpgaVisibleInFilter && t.status === 'upcoming')
  const lpgaRecent = lpgaTournaments.filter(t => t.status === 'completed').slice(0, 1)

  // Any golf happening today?
  const hasGolfToday = pgaToday.length > 0 || lpgaToday.length > 0

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

  // Include followed pro teams from ALL_PRO_TEAMS (mapped to SeattleTeam shape for uniform rendering)
  const proTeamsMapped = ALL_PRO_TEAMS
    .filter(t => selectedTeamIds.includes(t.id))
    .map(t => ({
      id: t.id,
      name: t.name,
      shortName: t.shortName,
      abbr: t.abbr,
      sport: t.sport,
      league: t.league,
      espnId: t.espnId,
      primaryColor: t.primaryColor,
      secondaryColor: '#ffffff',
      emoji: '',
      logoUrl: t.logo,
    } as typeof SEATTLE_TEAMS[0]))

  const followedTeamsSorted = [
    ...SEATTLE_TEAMS.filter(t => selectedTeamIds.includes(t.id)),
    ...proTeamsMapped,
  ].sort((a, b) => (getAggregatedClicks(b) - getAggregatedClicks(a)) || a.shortName.localeCompare(b.shortName))

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
  const recent = filtered.filter(g => {
    const d = dateStr(parseKickoff(g.kickoff))
    // Exclude today — those show in the featured section; show last 7 days
    return g.status === "ft" && d >= cutoff7 && d < today
  }).sort((a, b) => parseKickoff(b.kickoff).getTime() - parseKickoff(a.kickoff).getTime()).slice(0, 12)

  const todayGames = filtered.filter(g => dateStr(parseKickoff(g.kickoff)) === today)
  const liveGames = filtered.filter(g => g.status === "live")
  const upcoming = filtered.filter(g => {
    const d = dateStr(parseKickoff(g.kickoff))
    return g.status === "upcoming" && d > today && d <= cutoff14
  })

  // If no upcoming in 14 days, grab the next N games regardless of date
  const upcomingFallback = upcoming.length === 0
    ? filtered.filter(g => g.status === "upcoming" && dateStr(parseKickoff(g.kickoff)) > today)
        .sort((a, b) => parseKickoff(a.kickoff).getTime() - parseKickoff(b.kickoff).getTime())
        .slice(0, 6)
    : []

  const allUpcoming = [...upcoming, ...upcomingFallback]

  // For off-season cards: find next game per team across ALL games (unfiltered)
  const followedTeams = SEATTLE_TEAMS.filter(t => selectedTeamIds.includes(t.id))
  const nextGameByTeam: Record<string, Game | undefined> = {}
  for (const team of followedTeams) {
    nextGameByTeam[team.id] = allGames
      .filter(g => g.seattleTeamId === team.id && g.status === "upcoming")
      .sort((a, b) => parseKickoff(a.kickoff).getTime() - parseKickoff(b.kickoff).getTime())[0]
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
    const d = dateStr(parseKickoff(g.kickoff)); if (!upcomingByDate[d]) upcomingByDate[d] = []
    upcomingByDate[d].push(g)
  }

  // Integrate golf upcoming into the same date buckets by tournament startDate
  type GolfUpcomingItem = { tournament: PGATournament; label: string; accentColor: string }
  const golfUpcomingByDate: Record<string, GolfUpcomingItem[]> = {}
  const addGolfToDate = (t: PGATournament, label: string, accentColor: string) => {
    if (!t.startDate) return
    const ds = t.startDate.split('T')[0]
    if (!golfUpcomingByDate[ds]) golfUpcomingByDate[ds] = []
    golfUpcomingByDate[ds].push({ tournament: t, label, accentColor })
  }
  pgaUpcoming.forEach(t => addGolfToDate(t, 'PGA Tour', '#CBA135'))
  lpgaUpcoming.forEach(t => addGolfToDate(t, 'LPGA', '#C084FC'))

  // All upcoming dates — team games + golf, sorted
  const allUpcomingDates = [...new Set([...Object.keys(upcomingByDate), ...Object.keys(golfUpcomingByDate)])].sort()
  const upcomingDates = allUpcomingDates

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
    <div style={{ paddingBottom: "6rem" }}>
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
                  background: "#0c1b31",
                  border: `2.5px solid ${activeFilter === "all" ? "#D65820" : "rgba(214,88,32,0.45)"}`,
                  boxShadow: activeFilter === "all" ? "0 0 10px rgba(214,88,32,0.5)" : "none",
                }}
              >
                <span className="font-display text-[11px] font-800 uppercase" style={{ color: "#ffffff" }}>All</span>
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
                        background: isActive ? "rgba(12,27,49,0.9)" : "var(--surface-2)",
                        border: `2.5px solid ${isActive ? "#D65820" : pickerOpen ? "rgba(214,88,32,0.6)" : "rgba(255,255,255,0.1)"}`,
                        boxShadow: isActive ? "0 0 10px rgba(214,88,32,0.55)" : pickerOpen ? "0 0 8px rgba(214,88,32,0.25)" : "none",
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
      {(recent.length > 0 || pgaRecent.length > 0 || lpgaRecent.length > 0) && (
        <div className="mt-8">
          <div className="flex items-center gap-3 px-4 mb-4">
            <span className="font-display text-[13px] font-800 text-white uppercase tracking-widest">Recent</span>
            <div className="flex-1 h-px bg-zinc-800" />
            <span className="font-display text-[10px] text-zinc-500 uppercase tracking-wider">Last 7 days</span>
          </div>
          <div className="overflow-x-auto no-scrollbar px-4">
          <div className="flex min-w-max pb-1">
              {recent.map(g => (
                <RecentCard key={g.id} game={g} onClick={() => setSelectedRecentGame(g)} />
              ))}
              {pgaRecent.map(t => (
                <GolfRecentCard key={`pga-${t.id}`} tournament={t} label="PGA Tour" accentColor="#CBA135" />
              ))}
              {lpgaRecent.map(t => (
                <GolfRecentCard key={`lpga-${t.id}`} tournament={t} label="LPGA" accentColor="#C084FC" />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── FEATURED: Always-on Today section ───────────────────────────── */}
      {(() => {
        const hasGames = todayGames.length > 0
        const todayDate = new Date()
        const dateLabel = todayDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })

        return (
          <div className="mt-14">
            {/* Section header — matches Recent / Upcoming style exactly */}
            <div className="flex items-center gap-3 px-4 mb-4">
              <span className="font-display text-[13px] font-800 text-white uppercase tracking-widest">Today</span>
              <div className="flex-1 h-px bg-zinc-800" />
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider">{dateLabel}</span>
            </div>

            {/* Team sport game cards */}
            {todayGames.map(g => <TodayGameCard key={g.id} game={g} />)}

            {/* Golf — live OR completed today — same card style as team games */}
            {pgaToday.map(t => (
              <GolfTodayCard key={`pga-today-${t.id}`} tournament={t} label="PGA Tour" accentColor="#CBA135" />
            ))}
            {lpgaToday.map(t => (
              <GolfTodayCard key={`lpga-today-${t.id}`} tournament={t} label="LPGA" accentColor="#C084FC" />
            ))}

            {/* Empty state — only if no games AND no live golf */}
            {!hasGames && !hasGolfToday && (
              <div className="px-4 py-8 flex items-center justify-center">
                <span className="text-[15px] text-zinc-600 font-medium">No games today</span>
              </div>
            )}
          </div>
        )
      })()}

      {/* ── Off-season (no games anywhere) ──────────────────────────────── */}
      {todayGames.length === 0 && !hasAnyLive && recent.length === 0 && allUpcoming.length === 0 && (
        <>
          <div className="mt-14 px-4 mb-2 flex items-center gap-3">
            <span className="font-display text-[13px] font-800 text-zinc-400 uppercase tracking-widest">Off Season</span>
            <div className="flex-1 h-px bg-zinc-800" />
          </div>
          <OffSeasonCards teams={teamsWithNoGames.length > 0 ? teamsWithNoGames : followedTeams} nextGames={nextGameByTeam} />
        </>
      )}

      {/* ── Upcoming — WC compact rows ───────────────────────────────────── */}
      {upcomingDates.length > 0 && (
        <div className="mt-14">
          <div className="px-4 mb-4 flex items-center gap-3">
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
                style={{ background: "rgba(12,27,49,0.98)", backdropFilter: "blur(8px)" }}
              >
                <span className="text-[11px] uppercase tracking-wider font-normal text-zinc-500">{fmtDayHeader(ds)}</span>
                <div className="flex-1 h-px bg-zinc-800" />
              </div>
              {/* ── Team game rows ── */}
              {(upcomingByDate[ds] ?? []).map(g => {
                const seattleLogoUrl = getTeamLogoUrl(g.seattleTeam)
                const awayLogo  = g.isHome ? g.opponent.logo     : seattleLogoUrl
                const awayEmoji = g.isHome ? "🏟️"               : g.seattleTeam.emoji
                const awayAbbr  = g.isHome ? g.opponent.abbr     : g.seattleTeam.abbr
                const awayName  = g.isHome ? (g.opponent.shortName || g.opponent.name) : g.seattleTeam.shortName
                const homeLogo  = g.isHome ? seattleLogoUrl      : g.opponent.logo
                const homeEmoji = g.isHome ? g.seattleTeam.emoji : "🏟️"
                const homeAbbr  = g.isHome ? g.seattleTeam.abbr  : g.opponent.abbr
                const homeName  = g.isHome ? g.seattleTeam.shortName : (g.opponent.shortName || g.opponent.name)
                return (
                  <div
                    key={g.id}
                    className="py-3 border-b border-white/5 hover:bg-white/[0.03] active:bg-white/[0.06] transition-colors cursor-pointer"
                    onClick={() => setSelectedRecentGame(g)}
                  >
                    <div className="pl-6 mb-1.5 flex items-center gap-2">
                      <span className="text-[11px] text-zinc-500 font-normal uppercase tracking-wide tabular-nums">{fmtTime(g.kickoff)}</span>
                      {g.broadcast && <span className="text-[10px] text-zinc-600">{g.broadcast}</span>}
                    </div>
                    <div className="grid items-center px-4" style={{ gridTemplateColumns: "1fr 2rem 1fr" }}>
                      <div className="flex items-center justify-end gap-2 min-w-0">
                        <span className="text-[14px] font-semibold text-white whitespace-nowrap leading-tight truncate">{awayName}</span>
                        <TeamLogo src={awayLogo} emoji={awayEmoji} abbr={awayAbbr} size={28} className="flex-shrink-0" />
                      </div>
                      <div className="flex items-center justify-center">
                        <span className="text-zinc-600 text-[13px] font-normal select-none">·</span>
                      </div>
                      <div className="flex items-center justify-start gap-2 min-w-0">
                        <TeamLogo src={homeLogo} emoji={homeEmoji} abbr={homeAbbr} size={28} className="flex-shrink-0" />
                        <span className="text-[14px] font-semibold text-white whitespace-nowrap leading-tight truncate">{homeName}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
              {/* ── Golf tournament rows in this date bucket ── */}
              {(golfUpcomingByDate[ds] ?? []).map(({ tournament: t, label, accentColor }) => (
                <div key={`golf-${t.id}`} className="py-3 border-b border-white/5">
                  <div className="pl-6 mb-1.5 flex items-center gap-2">
                    <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: accentColor }}>{label}</span>
                    {t.course && <span className="text-[10px] text-zinc-600">{t.course}</span>}
                  </div>
                  <div className="px-4 flex items-center justify-between gap-2">
                    <span className="text-[14px] font-semibold text-white truncate flex-1 leading-tight">{t.shortName || t.name}</span>
                    {t.endDate && t.endDate !== t.startDate && (
                      <span className="text-[12px] text-zinc-500 flex-shrink-0">
                        – {new Date(t.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    )}
                  </div>
                </div>
              ))}
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
