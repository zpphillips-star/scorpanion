"use client"
import { useState, useEffect, useRef } from "react"
import { createPortal } from "react-dom"
import { Game, TeamRecord } from "@/lib/types"
import { getTeamLogoUrl } from "@/lib/teams"
import TeamLogo from "./TeamLogo"
import GameDetailSheet from "./GameDetailSheet"

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
      className="w-full text-left transition-all active:scale-[0.983] active:opacity-90"
    >
      <div
        className="rounded-xl overflow-hidden"
        style={{
          background: isLive
            ? "linear-gradient(135deg, rgba(255,180,0,0.06) 0%, rgba(26,45,74,0.9) 100%)"
            : "var(--surface-2)",
          border: `1px solid ${isLive ? "rgba(255,180,0,0.22)" : "var(--border-default)"}`,
          borderLeft: `3.5px solid ${isLive ? "#FFB400" : accentColor}`,
        }}
      >
        {/* ── Top bar: broadcast + status ── */}
        <div
          className="flex items-center justify-between px-3 pt-2.5 pb-1"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
        >
          {/* Broadcast network */}
          <span
            className="text-[10px] font-bold uppercase tracking-widest"
            style={{ color: "var(--text-faint)" }}
          >
            {game.broadcast || (game.isHome ? "Home" : "Away")}
          </span>

          {/* Status badge */}
          {isLive ? (
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-1.5 w-1.5 flex-shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                      style={{ backgroundColor: "#FFB400" }} />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5"
                      style={{ backgroundColor: "#FFB400" }} />
              </span>
              <span className="text-[11px] font-bold uppercase tracking-wider"
                    style={{ color: "#FFB400" }}>
                Live
              </span>
              {liveDetail && (
                <span className="text-[10px] font-semibold tabular-nums"
                      style={{ color: "rgba(255,180,0,0.55)" }}>
                  · {liveDetail}
                </span>
              )}
            </div>
          ) : isFt ? (
            <span className="text-[10px] font-bold uppercase tracking-widest"
                  style={{ color: "var(--text-faint)" }}>
              Final
            </span>
          ) : (
            <span className="text-[12px] font-semibold tabular-nums"
                  style={{ color: "var(--text)" }}>
              {formatTime(game.kickoff)}
            </span>
          )}
        </div>

        {/* ── Main matchup row ── */}
        <div className="flex items-center px-3 py-3 gap-2">
          {/* Away team */}
          <div className="flex-1 flex items-center gap-2.5 min-w-0">
            <TeamLogo
              src={awayLogo}
              emoji={awayEmoji}
              abbr={awayAbbr}
              size={38}
              className={`flex-shrink-0 transition-opacity${isFt && homeWon ? " opacity-25" : ""}`}
            />
            <div className="min-w-0">
              <div
                className="text-[14px] font-bold leading-tight truncate"
                style={{ color: isFt && homeWon ? "rgba(242,230,207,0.25)" : "var(--text)" }}
              >
                {awayName}
              </div>
              {awayRecord && (
                <div className="text-[10px] tabular-nums leading-tight mt-0.5"
                     style={{ color: "var(--text-faint)" }}>
                  {formatRecord(awayRecord)}
                </div>
              )}
            </div>
          </div>

          {/* Score / VS center */}
          <div className="flex-shrink-0 flex items-center gap-1 mx-1">
            {hasScore ? (
              <>
                <span
                  className="font-display text-[24px] font-800 tabular-nums leading-none w-8 text-right"
                  style={{ color: awayWon ? "var(--text)" : isFt ? "rgba(242,230,207,0.28)" : "var(--text)" }}
                >
                  {awayScore}
                </span>
                <span
                  className="font-display text-[14px] font-600 leading-none px-0.5"
                  style={{ color: "var(--border-strong)" }}
                >
                  –
                </span>
                <span
                  className="font-display text-[24px] font-800 tabular-nums leading-none w-8 text-left"
                  style={{ color: homeWon ? "var(--text)" : isFt ? "rgba(242,230,207,0.28)" : "var(--text)" }}
                >
                  {homeScore}
                </span>
              </>
            ) : (
              <span
                className="font-display text-[15px] font-700 uppercase tracking-wider px-1"
                style={{ color: "var(--border-strong)" }}
              >
                vs
              </span>
            )}
          </div>

          {/* Home team */}
          <div className="flex-1 flex items-center justify-end gap-2.5 min-w-0">
            <div className="min-w-0 text-right">
              <div
                className="text-[14px] font-bold leading-tight truncate"
                style={{ color: isFt && awayWon ? "rgba(242,230,207,0.25)" : "var(--text)" }}
              >
                {homeName}
              </div>
              {homeRecord && (
                <div className="text-[10px] tabular-nums leading-tight mt-0.5"
                     style={{ color: "var(--text-faint)" }}>
                  {formatRecord(homeRecord)}
                </div>
              )}
            </div>
            <TeamLogo
              src={homeLogo}
              emoji={homeEmoji}
              abbr={homeAbbr}
              size={38}
              className={`flex-shrink-0 transition-opacity${isFt && awayWon ? " opacity-25" : ""}`}
            />
          </div>
        </div>

        {/* ── Venue footer ── */}
        {game.venue?.name && (
          <div
            className="flex items-center justify-between px-3 pb-2.5"
            style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}
          >
            <span className="text-[10px] truncate" style={{ color: "var(--text-faint)" }}>
              📍 {game.venue.name}{game.venue.city ? `, ${game.venue.city}` : ""}
            </span>
            <svg className="w-3 h-3 flex-shrink-0 ml-2" fill="none" viewBox="0 0 24 24"
                 stroke="currentColor" style={{ color: "var(--border-strong)" }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        )}
        {!game.venue?.name && (
          <div className="flex justify-end px-3 pb-2">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24"
                 stroke="currentColor" style={{ color: "var(--border-strong)" }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        )}
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
          className="font-display text-[11px] font-800 uppercase tracking-[0.2em] leading-none"
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
  onClose: () => void
}

export default function DayGamesSheet({ date, games, onClose }: DayGamesSheetProps) {
  const [selectedGame, setSelectedGame] = useState<Game | null>(null)
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
  const hasLive = games.some(g => g.status === "live")

  const { weekday, fullDate } = formatHeaderDate(date)
  const countText = `${games.length} Game${games.length !== 1 ? "s" : ""}`

  // Group games by league — preserve encounter order
  const grouped: { label: string; games: Game[] }[] = []
  for (const g of games) {
    const lbl = leagueLabel(g.league)
    const existing = grouped.find(grp => grp.label === lbl)
    if (existing) existing.games.push(g)
    else grouped.push({ label: lbl, games: [g] })
  }

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
          background: "linear-gradient(180deg, var(--surface-2) 0%, var(--surface) 40%, #0a1525 100%)",
          borderRadius: "24px 24px 0 0",
          maxHeight: "90dvh",
          paddingBottom: "env(safe-area-inset-bottom)",
          boxShadow: "0 -12px 60px rgba(0,0,0,0.75), 0 -1px 0 rgba(255,255,255,0.07), inset 0 1px 0 rgba(255,255,255,0.05)",
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
                    className="text-[10px] font-bold uppercase tracking-widest leading-none"
                    style={{ color: hasLive ? "#FFB400" : "var(--accent)" }}
                  >
                    {hasLive ? "Live Now" : "Today"}
                  </span>
                </div>
              </div>
            )}

            {/* Date headline */}
            <h2 className="font-display leading-none tracking-tight"
                style={{ fontSize: "28px", fontWeight: 800, color: "var(--text)" }}>
              {weekday},
            </h2>
            <h2 className="font-display leading-none tracking-tight mt-0.5"
                style={{ fontSize: "28px", fontWeight: 800, color: "var(--text-muted)" }}>
              {fullDate}
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

        {/* Divider */}
        <div className="flex-shrink-0 mx-5 h-px" style={{ background: "var(--border)" }} />

        {/* ── Game list — scrollable ── */}
        <div className="overflow-y-auto flex-1 overscroll-contain">
          {games.length === 0 ? (
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
                  No games scheduled
                </p>
                <p className="text-center text-[12px] mt-1" style={{ color: "var(--text-faint)", opacity: 0.6 }}>
                  {weekday}, {fullDate}
                </p>
              </div>
            </div>
          ) : (
            <div className="px-4 pt-1 pb-2">
              {grouped.map(({ label, games: groupGames }) => (
                <div key={label}>
                  {grouped.length > 1 && <LeagueSectionHeader label={label} />}
                  {grouped.length === 1 && <div className="pt-3" />}
                  <div className="flex flex-col gap-2.5">
                    {groupGames.map(g => (
                      <DayGameCard
                        key={g.id}
                        game={g}
                        onTap={() => setSelectedGame(g)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Bottom breathing room */}
          <div className="h-8" />
        </div>
      </div>

      {/* Game detail sheet — z-[10000] floats above the day sheet */}
      {selectedGame && (
        <GameDetailSheet
          game={selectedGame}
          onClose={() => setSelectedGame(null)}
        />
      )}
    </>
  )

  if (!mounted) return null
  return createPortal(sheet, document.body)
}
