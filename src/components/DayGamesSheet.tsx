"use client"
import { useState, useEffect, useRef } from "react"
import { createPortal } from "react-dom"
import { Game, TeamRecord } from "@/lib/types"
import { getTeamLogoUrl } from "@/lib/teams"
import TeamLogo from "./TeamLogo"
import GameDetailSheet from "./GameDetailSheet"
import GolfDetailSheet from "./GolfDetailSheet"
import type { PGATournament } from "@/app/api/pga/route"

// ── helpers ───────────────────────────────────────────────────────────────────

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
}

function formatRecord(r?: TeamRecord): string {
  if (!r) return ""
  return r.ties ? `${r.wins}-${r.losses}-${r.ties}` : `${r.wins}-${r.losses}`
}

/** "Sunday, July 20" — full weekday + full month name */
function formatHeaderDate(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number)
  const date = new Date(y, m - 1, d)
  const weekday  = date.toLocaleDateString("en-US", { weekday: "long" })              // "Sunday"
  const fullDate = date.toLocaleDateString("en-US", { month: "long", day: "numeric" }) // "July 20"
  return { weekday, fullDate }
}

function getTodayStr() {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(new Date())
}

/** Normalize league string → short display label (MLB, NBA, MLS, etc.) */
function leagueLabel(league: string): string {
  return league
    .toUpperCase()
    .replace("USA.1", "MLS")
    .replace("USA.NWSL", "NWSL")
    .replace("MEN-PRO", "")
    .trim()
}

/** Sport/league → emoji icon for section headers */
function leagueEmoji(label: string): string {
  const l = label.toUpperCase()
  if (l === "MLB") return "⚾"
  if (l === "NBA") return "🏀"
  if (l === "WNBA") return "🏀"
  if (l === "NFL") return "🏈"
  if (l === "NHL") return "🏒"
  if (l === "MLS" || l === "NWSL") return "⚽"
  if (l === "PWHL") return "🏒"
  if (l === "WHL") return "🏒"
  if (l.includes("SOCCER")) return "⚽"
  if (l.includes("SOFTBALL") || l.includes("BASEBALL")) return "⚾"
  if (l.includes("BASKETBALL")) return "🏀"
  if (l.includes("HOCKEY")) return "🏒"
  if (l.includes("FOOTBALL")) return "🏈"
  return "🏟️"
}

/** Live period/clock formatted per sport */
function getLiveDetail(game: Game): string {
  const p = game.period ? Number(game.period) : null
  const clk = game.clock
  if (game.sport === "baseball" && p) {
    const half = p % 2 === 1 ? "Top" : "Bot"
    return `${half} ${Math.ceil(p / 2)}${clk ? " · " + clk : ""}`
  }
  if (game.sport === "basketball" && p) return clk ? `Q${p}  ${clk}` : `Q${p}`
  if (game.sport === "hockey" && p) {
    const l = ["1st", "2nd", "3rd", "OT"][p - 1] || `P${p}`
    return clk ? `${l}  ${clk}` : l
  }
  if (game.sport === "football" && p) {
    const l = ["1st", "2nd", "3rd", "4th", "OT"][p - 1] || `Q${p}`
    return clk ? `${l}  ${clk}` : l
  }
  if (game.sport === "soccer") return clk ? `${clk}′` : "Live"
  return clk || "Live"
}

// ── DayGameCard — ESPN-style horizontal matchup card ─────────────────────────

function DayGameCard({ game, onTap }: { game: Game; onTap: () => void }) {
  const isFt   = game.status === "ft"
  const isLive = game.status === "live"
  const isUp   = game.status === "upcoming"

  const seattleLogoUrl = getTeamLogoUrl(game.seattleTeam)
  const accentColor    = game.seattleTeam.primaryColor ?? "#D95C17"

  // away = left, home = right
  const awayLogo   = game.isHome ? game.opponent.logo  : seattleLogoUrl
  const awayEmoji  = game.isHome ? "🏟️"               : game.seattleTeam.emoji
  const awayAbbr   = game.isHome ? game.opponent.abbr  : game.seattleTeam.abbr
  const awayName   = game.isHome ? (game.opponent.shortName || game.opponent.name) : game.seattleTeam.shortName
  const awayRecord = game.isHome ? game.opponentRecord : game.seattleRecord

  const homeLogo   = game.isHome ? seattleLogoUrl      : game.opponent.logo
  const homeEmoji  = game.isHome ? game.seattleTeam.emoji : "🏟️"
  const homeAbbr   = game.isHome ? game.seattleTeam.abbr  : game.opponent.abbr
  const homeName   = game.isHome ? game.seattleTeam.shortName : (game.opponent.shortName || game.opponent.name)
  const homeRecord = game.isHome ? game.seattleRecord  : game.opponentRecord

  const awayScoreRaw = game.isHome ? game.opponentScore : game.seattleScore
  const homeScoreRaw = game.isHome ? game.seattleScore  : game.opponentScore

  const hasScore =
    (isFt || isLive) &&
    awayScoreRaw !== undefined &&
    homeScoreRaw !== undefined

  const awayScore = hasScore ? awayScoreRaw : undefined
  const homeScore = hasScore ? homeScoreRaw : undefined

  const awayWon = isFt && hasScore && (awayScore ?? 0) > (homeScore ?? 0)
  const homeWon = isFt && hasScore && (homeScore ?? 0) > (awayScore ?? 0)

  const liveDetail = isLive ? getLiveDetail(game) : ""

  return (
    <button
      onClick={onTap}
      className="w-full text-left active:bg-white/[0.03] transition-colors"
    >
      <div className="flex items-center px-4 py-3 gap-3">

        {/* Left: time / status */}
        <div className="w-16 flex-shrink-0 flex flex-col gap-0.5">
          {isLive ? (
            <div className="flex items-center gap-1">
              <span className="relative flex h-1.5 w-1.5 flex-shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                      style={{ backgroundColor: "#FFB400" }} />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5"
                      style={{ backgroundColor: "#FFB400" }} />
              </span>
              <span className="text-[12px] font-bold uppercase tracking-wide"
                    style={{ color: "#FFB400" }}>Live</span>
            </div>
          ) : isFt ? (
            <span className="text-[12px] font-semibold uppercase tracking-wide text-zinc-500">Final</span>
          ) : (
            <span className="text-[12px] font-medium text-zinc-400 whitespace-nowrap tabular-nums">
              {formatTime(game.kickoff)}
            </span>
          )}
          {isLive && liveDetail && (
            <span className="text-[10px] tabular-nums" style={{ color: "rgba(255,180,0,0.6)" }}>{liveDetail}</span>
          )}
          {game.broadcast && !isLive && (
            <span className="text-[10px] text-zinc-600">{game.broadcast}</span>
          )}
        </div>

        {/* Matchup grid */}
        <div className="flex-1 grid items-center" style={{ gridTemplateColumns: "1fr 2.5rem 1fr" }}>
          {/* Away */}
          <div className="flex items-center justify-end gap-2 min-w-0">
            <div className="text-right min-w-0">
              <div className={`text-[14px] font-semibold leading-tight truncate ${isFt && homeWon ? "text-zinc-500" : "text-white"}`}>
                {awayName}
              </div>
              {awayRecord && (
                <div className="text-[10px] text-zinc-600 tabular-nums leading-tight">{formatRecord(awayRecord)}</div>
              )}
            </div>
            <TeamLogo src={awayLogo} emoji={awayEmoji} abbr={awayAbbr} size={32}
              className={`flex-shrink-0${isFt && homeWon ? " opacity-25" : ""}`} />
          </div>

          {/* Score / vs */}
          <div className="flex items-center justify-center">
            {hasScore ? (
              <span className="font-display text-[16px] font-800 tabular-nums text-white">
                {awayScore}<span className="text-zinc-600 mx-0.5">–</span>{homeScore}
              </span>
            ) : (
              <span className="text-zinc-600 text-[13px]">·</span>
            )}
          </div>

          {/* Home */}
          <div className="flex items-center justify-start gap-2 min-w-0">
            <TeamLogo src={homeLogo} emoji={homeEmoji} abbr={homeAbbr} size={32}
              className={`flex-shrink-0${isFt && awayWon ? " opacity-25" : ""}`} />
            <div className="min-w-0">
              <div className={`text-[14px] font-semibold leading-tight truncate ${isFt && awayWon ? "text-zinc-500" : "text-white"}`}>
                {homeName}
              </div>
              {homeRecord && (
                <div className="text-[10px] text-zinc-600 tabular-nums leading-tight">{formatRecord(homeRecord)}</div>
              )}
            </div>
          </div>
        </div>

        {/* Chevron */}
        <svg className="w-3 h-3 text-zinc-700 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>

      {/* Venue — subtle, below the row */}
      {game.venue?.name && (
        <div className="px-4 pb-2 -mt-1">
          <span className="text-[10px] text-zinc-700 truncate">
            📍 {game.venue.name}{game.venue.city ? `, ${game.venue.city}` : ""}
          </span>
        </div>
      )}
    </button>
  )
}

// ── Golf tournament card for day sheet ───────────────────────────────────────

function GolfDayCard({ tournament, label, accentColor, onTap }: {
  tournament: PGATournament
  label: string
  accentColor: string
  onTap: () => void
}) {
  const isLive = tournament.status === "live"
  const isCompleted = tournament.status === "completed"
  const logoUrl = label === "LPGA"
    ? "https://a.espncdn.com/combiner/i?img=/i/teamlogos/leagues/500/lpga.png"
    : "https://a.espncdn.com/combiner/i?img=/i/teamlogos/leagues/500/pgatour.png"
  const dateRange = (() => {
    const fmt = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" })
    if (tournament.endDate && tournament.endDate !== tournament.startDate)
      return `${fmt(tournament.startDate)} – ${fmt(tournament.endDate)}`
    return fmt(tournament.startDate)
  })()

  return (
    <button
      onClick={onTap}
      className="w-full text-left active:bg-white/[0.03] transition-colors"
    >
      <div className="flex items-center px-4 py-3 gap-3">
        {/* Left: status */}
        <div className="w-16 flex-shrink-0 flex flex-col gap-0.5">
          {isLive ? (
            <div className="flex items-center gap-1">
              <span className="relative flex h-1.5 w-1.5 flex-shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-yellow-400" />
              </span>
              <span className="text-[12px] font-bold uppercase tracking-wide text-yellow-400">Live</span>
            </div>
          ) : isCompleted ? (
            <span className="text-[12px] font-semibold uppercase tracking-wide text-zinc-500">Final</span>
          ) : (
            <span className="text-[12px] text-zinc-400">{dateRange}</span>
          )}
          <span className="text-[11px] text-zinc-600 uppercase tracking-wider">{label}</span>
        </div>

        {/* Logo + name */}
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoUrl} alt={label} width={28} height={28}
            style={{ objectFit: "contain", flexShrink: 0 }}
            onError={e => { (e.target as HTMLImageElement).style.display = "none" }} />
          <div className="min-w-0">
            <div className="text-[14px] font-semibold text-white leading-tight truncate">{tournament.name}</div>
            {(tournament.course || tournament.location) && (
              <div className="text-[10px] text-zinc-600 truncate">{[tournament.course, tournament.location].filter(Boolean).join(", ")}</div>
            )}
          </div>
        </div>

        <svg className="w-3 h-3 flex-shrink-0 text-zinc-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </button>
  )
}

// ── League section header with emoji ─────────────────────────────────────────

function LeagueSectionHeader({ label }: { label: string }) {
  const emoji = leagueEmoji(label)
  return (
    <div className="flex items-center gap-2.5 px-1 pt-5 pb-2.5">
      <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <span className="text-[13px] leading-none">{emoji}</span>
        <span
          className="font-display text-[12px] font-800 uppercase tracking-[0.2em] leading-none"
          style={{ color: "var(--text-faint)" }}
        >
          {label}
        </span>
      </div>
      <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
    </div>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────

interface DayGamesSheetProps {
  date: string      // "YYYY-MM-DD"
  games: Game[]     // pre-filtered + live-score-merged games for this date
  golfTournaments?: { tournament: PGATournament; label: string; accentColor: string }[]
  onClose: () => void
}

export default function DayGamesSheet({ date, games, golfTournaments = [], onClose }: DayGamesSheetProps) {
  const [selectedGame, setSelectedGame] = useState<Game | null>(null)
  const [selectedGolf, setSelectedGolf] = useState<{ tournament: PGATournament; label: string; accentColor: string } | null>(null)
  // Portal requires document — wait for mount so SSR doesn't break
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  // Swipe-down-to-close
  const swipeTouchStartY = useRef(0)
  function handleSheetTouchStart(e: React.TouchEvent) {
    swipeTouchStartY.current = e.touches[0].clientY
  }
  function handleSheetTouchEnd(e: React.TouchEvent) {
    const dy = e.changedTouches[0].clientY - swipeTouchStartY.current
    if (dy > 72) onClose()
  }

  const today   = getTodayStr()
  const isToday = date === today
  const hasLive = games.some(g => g.status === "live") || golfTournaments.some(g => g.tournament.status === "live")
  const totalCount = games.length + golfTournaments.length

  const { weekday, fullDate } = formatHeaderDate(date)
  const countText = totalCount === 0 ? "No events" : `${totalCount} Event${totalCount !== 1 ? "s" : ""}`

  const sheet = (
    <>
      {/* ── Backdrop ── */}
      <div
        className="fixed inset-0 z-[9998]"
        style={{ background: "rgba(4,10,20,0.75)", backdropFilter: "blur(4px)" }}
        onClick={onClose}
      />

      {/* ── Bottom sheet ── */}
      <div
        className="fixed bottom-0 left-0 right-0 z-[9999] lg:max-w-2xl lg:mx-auto animate-slide-up flex flex-col overflow-hidden"
        style={{
          background: "var(--bg)",
          borderRadius: "24px 24px 0 0",
          minHeight: "82dvh",
          maxHeight: "96dvh",
          paddingBottom: "env(safe-area-inset-bottom)",
          boxShadow: "0 -12px 60px rgba(0,0,0,0.75), 0 -1px 0 rgba(255,255,255,0.15)",
        }}
        onClick={e => e.stopPropagation()}
        onTouchStart={handleSheetTouchStart}
        onTouchEnd={handleSheetTouchEnd}
      >
        {/* Drag handle */}
        <div className="w-10 h-[3.5px] rounded-full mx-auto mt-3 flex-shrink-0"
             style={{ background: "rgba(242,230,207,0.18)" }} />

        {/* ── Header ── */}
        <div className="flex items-start justify-between px-5 pt-4 pb-4 flex-shrink-0">
          <div className="min-w-0 flex-1">
            {/* TODAY badge */}
            {isToday && (
              <div className="inline-flex items-center gap-1.5 mb-2">
                <div
                  className="flex items-center gap-1.5 px-2 py-0.5 rounded-full"
                  style={{
                    background: hasLive ? "rgba(255,180,0,0.15)" : "rgba(217,92,23,0.15)",
                    border: `1px solid ${hasLive ? "rgba(255,180,0,0.3)" : "rgba(217,92,23,0.3)"}`,
                  }}
                >
                  {hasLive && (
                    <span className="relative flex h-1.5 w-1.5 flex-shrink-0">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                            style={{ backgroundColor: "#FFB400" }} />
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5"
                            style={{ backgroundColor: "#FFB400" }} />
                    </span>
                  )}
                  <span
                    className="text-[11px] font-bold uppercase tracking-widest leading-none"
                    style={{ color: hasLive ? "#FFB400" : "var(--accent)" }}
                  >
                    {hasLive ? "Live Now" : "Today"}
                  </span>
                </div>
              </div>
            )}

            {/* Date headline — single line */}
            <h2 className="font-display leading-none tracking-tight"
                style={{ fontSize: "28px", fontWeight: 800, color: "var(--text)" }}>
              {weekday}, <span style={{ color: "var(--text-muted)" }}>{fullDate}</span>
            </h2>

            {/* Game count */}
            <p className="mt-2 text-[12px] font-semibold uppercase tracking-widest"
               style={{ color: "var(--text-faint)" }}>
              {games.length === 0 ? "No games" : countText}
            </p>
          </div>

          {/* Close button */}
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors active:scale-95"
            style={{
              background: "rgba(242,230,207,0.07)",
              border: "1px solid rgba(242,230,207,0.1)",
              color: "var(--text-muted)",
            }}
            aria-label="Close"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ── Game list — scrollable ── */}
        <div className="overflow-y-auto flex-1 overscroll-contain">
          {totalCount === 0 ? (
            <div className="py-20 flex flex-col items-center gap-4">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}
              >
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"
                     style={{ color: "var(--text-faint)" }} strokeWidth={1.5}>
                  <rect x="3" y="4" width="18" height="18" rx="3" />
                  <path strokeLinecap="round" d="M16 2v4M8 2v4M3 10h18" />
                </svg>
              </div>
              <div>
                <p className="text-center font-display text-[15px] font-700 uppercase tracking-widest"
                   style={{ color: "var(--text-faint)" }}>
                  No events scheduled
                </p>
                <p className="text-center text-[12px] mt-1" style={{ color: "var(--text-faint)", opacity: 0.6 }}>
                  {weekday}, {fullDate}
                </p>
              </div>
            </div>
          ) : (
          <div className="divide-y divide-white/[0.13]">
              {games.map(g => (
                <DayGameCard
                  key={g.id}
                  game={g}
                  onTap={() => setSelectedGame(g)}
                />
              ))}
              {golfTournaments.length > 0 && (
                <>
                  {games.length > 0 && (
                    <div className="px-4 py-2 flex items-center gap-3">
                      <span className="font-display text-[12px] font-700 uppercase tracking-widest text-zinc-500">Golf</span>
                      <div className="flex-1 h-px bg-zinc-700/50" />
                    </div>
                  )}
                  <div className="divide-y divide-white/[0.13]">
                    {golfTournaments.map(({ tournament, label, accentColor }) => (
                      <GolfDayCard
                        key={tournament.id}
                        tournament={tournament}
                        label={label}
                        accentColor={accentColor}
                        onTap={() => setSelectedGolf({ tournament, label, accentColor })}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Bottom breathing room */}
          <div className="h-16" />
        </div>
      </div>

      {/* Game detail sheet — z-[10000] floats above the day sheet */}
      {selectedGame && (
        <GameDetailSheet
          game={selectedGame}
          onClose={() => setSelectedGame(null)}
        />
      )}
      {/* Golf detail sheet */}
      {selectedGolf && (
        <GolfDetailSheet
          tournament={selectedGolf.tournament}
          label={selectedGolf.label}
          accentColor={selectedGolf.accentColor}
          onClose={() => setSelectedGolf(null)}
        />
      )}
    </>
  )

  if (!mounted) return null
  return createPortal(sheet, document.body)
}
