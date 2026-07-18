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

/** "Monday, Jul 20" */
function formatHeaderDate(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number)
  const date = new Date(y, m - 1, d)
  const weekday = date.toLocaleDateString("en-US", { weekday: "long" })        // "Monday"
  const monthDay = date.toLocaleDateString("en-US", { month: "short", day: "numeric" }) // "Jul 20"
  return { weekday, monthDay }
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

// ── DayGameCard ───────────────────────────────────────────────────────────────

function DayGameCard({ game, onTap }: { game: Game; onTap: () => void }) {
  const isFt   = game.status === "ft"
  const isLive = game.status === "live"

  const seattleLogoUrl = getTeamLogoUrl(game.seattleTeam)

  // away = left, home = right
  const awayLogo   = game.isHome ? game.opponent.logo         : seattleLogoUrl
  const awayEmoji  = game.isHome ? "🏟️"                      : game.seattleTeam.emoji
  const awayAbbr   = game.isHome ? game.opponent.abbr         : game.seattleTeam.abbr
  const awayName   = game.isHome ? (game.opponent.shortName || game.opponent.name) : game.seattleTeam.shortName
  const awayRecord = game.isHome ? game.opponentRecord        : game.seattleRecord

  const homeLogo   = game.isHome ? seattleLogoUrl             : game.opponent.logo
  const homeEmoji  = game.isHome ? game.seattleTeam.emoji     : "🏟️"
  const homeAbbr   = game.isHome ? game.seattleTeam.abbr      : game.opponent.abbr
  const homeName   = game.isHome ? game.seattleTeam.shortName : (game.opponent.shortName || game.opponent.name)
  const homeRecord = game.isHome ? game.seattleRecord         : game.opponentRecord

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

  const dimmedAway = isFt && homeWon
  const dimmedHome = isFt && awayWon

  return (
    <button
      onClick={onTap}
      className="w-full flex items-center gap-2 px-3 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] active:bg-white/[0.08] transition-all active:scale-[0.985] text-left"
    >
      {/* ── Away team ── */}
      <div className="flex-1 flex items-center justify-end gap-2 min-w-0">
        {/* Name + record stacked, right-aligned */}
        <div className="text-right min-w-0">
          <div
            className="text-[13px] font-semibold truncate leading-tight"
            style={{ color: dimmedAway ? "rgba(255,255,255,0.22)" : "#f0f0f8" }}
          >
            {awayName}
          </div>
          {awayRecord && (
            <div className="text-[10px] text-white/28 leading-tight mt-0.5 tabular-nums">
              {formatRecord(awayRecord)}
            </div>
          )}
        </div>
        <TeamLogo
          src={awayLogo}
          emoji={awayEmoji}
          abbr={awayAbbr}
          size={30}
          className={`flex-shrink-0 transition-opacity${dimmedAway ? " opacity-25" : ""}`}
        />
        {hasScore && (
          <span
            className="text-[18px] font-black tabular-nums w-7 text-right flex-shrink-0 leading-none"
            style={{ color: awayWon ? "#f0f0f8" : "rgba(255,255,255,0.32)" }}
          >
            {awayScore}
          </span>
        )}
      </div>

      {/* ── Center: status / time ── */}
      <div className="flex-shrink-0 flex flex-col items-center gap-0.5 w-[56px]">
        {isLive ? (
          <span className="px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400 text-[9px] font-bold uppercase tracking-wide flex items-center gap-1 leading-none">
            <span className="relative flex h-1.5 w-1.5 flex-shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500" />
            </span>
            Live
          </span>
        ) : isFt ? (
          <span className="text-[10px] font-semibold text-white/30 uppercase tracking-wider leading-none">Final</span>
        ) : (
          <span className="text-[11px] font-medium text-white/45 tabular-nums whitespace-nowrap leading-none">
            {formatTime(game.kickoff)}
          </span>
        )}
        {(game.period || game.clock) && isLive && (
          <span className="text-[9px] text-red-400/50 leading-tight tabular-nums mt-0.5">
            {game.period}{game.clock ? ` ${game.clock}` : ""}
          </span>
        )}
      </div>

      {/* ── Home team ── */}
      <div className="flex-1 flex items-center gap-2 min-w-0">
        {hasScore && (
          <span
            className="text-[18px] font-black tabular-nums w-7 text-left flex-shrink-0 leading-none"
            style={{ color: homeWon ? "#f0f0f8" : "rgba(255,255,255,0.32)" }}
          >
            {homeScore}
          </span>
        )}
        <TeamLogo
          src={homeLogo}
          emoji={homeEmoji}
          abbr={homeAbbr}
          size={30}
          className={`flex-shrink-0 transition-opacity${dimmedHome ? " opacity-25" : ""}`}
        />
        {/* Name + record stacked, left-aligned */}
        <div className="min-w-0">
          <div
            className="text-[13px] font-semibold truncate leading-tight"
            style={{ color: dimmedHome ? "rgba(255,255,255,0.22)" : "#f0f0f8" }}
          >
            {homeName}
          </div>
          {homeRecord && (
            <div className="text-[10px] text-white/28 leading-tight mt-0.5 tabular-nums">
              {formatRecord(homeRecord)}
            </div>
          )}
        </div>
      </div>

      {/* Chevron */}
      <svg className="w-3.5 h-3.5 text-white/15 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
      </svg>
    </button>
  )
}

// ── League section header ─────────────────────────────────────────────────────

function LeagueSectionHeader({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 px-1 pt-4 pb-2">
      <div className="flex-1 h-px bg-white/[0.07]" />
      <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/25 flex-shrink-0">
        {label}
      </span>
      <div className="flex-1 h-px bg-white/[0.07]" />
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

  const { weekday, monthDay } = formatHeaderDate(date)

  // Sub-label: "Live Now" with pulsing dot, or "N Games"
  const countText = `${games.length} Game${games.length !== 1 ? "s" : ""}`

  // Group games by league for the sport labels
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
        className="fixed inset-0 bg-black/65 backdrop-blur-[3px] z-[9998]"
        onClick={onClose}
      />

      {/* ── Bottom sheet ── */}
      <div
        className="fixed bottom-0 left-0 right-0 z-[9999] lg:max-w-2xl lg:mx-auto animate-slide-up flex flex-col overflow-hidden"
        style={{
          background: "linear-gradient(180deg, #0e1e36 0%, #0c1220 100%)",
          borderRadius: "22px 22px 0 0",
          maxHeight: "88dvh",
          paddingBottom: "env(safe-area-inset-bottom)",
          boxShadow: "0 -8px 40px rgba(0,0,0,0.6), 0 -1px 0 rgba(255,255,255,0.06)",
        }}
        onClick={e => e.stopPropagation()}
        onTouchStart={handleSheetTouchStart}
        onTouchEnd={handleSheetTouchEnd}
      >
        {/* Drag handle */}
        <div className="w-9 h-[3px] bg-white/20 rounded-full mx-auto mt-3 flex-shrink-0" />

        {/* ── Header ── */}
        <div className="flex items-start justify-between px-5 pt-4 pb-4 flex-shrink-0">
          <div>
            {/* Date — prominent */}
            <h2 className="text-[24px] font-black text-white leading-none tracking-tight">
              {weekday}, <span className="text-white/70">{monthDay}</span>
            </h2>
            {/* Sub-label: game count + optional live indicator */}
            <div className="flex items-center gap-1.5 mt-1.5">
              {isToday && hasLive ? (
                <>
                  <span className="relative flex h-2 w-2 flex-shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                  </span>
                  <span className="text-[12px] font-semibold text-red-400 uppercase tracking-widest leading-none">
                    Live Now
                  </span>
                  <span className="text-[11px] text-white/25 leading-none">· {countText}</span>
                </>
              ) : (
                <span className="text-[12px] font-semibold text-white/40 uppercase tracking-widest leading-none">
                  {games.length === 0 ? "No Games" : countText}
                </span>
              )}
            </div>
          </div>

          {/* Close button */}
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-white/40 text-[15px] hover:bg-white/10 transition-colors mt-0.5 flex-shrink-0"
            style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.08)" }}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Thin divider */}
        <div className="h-px bg-white/[0.07] flex-shrink-0 mx-4" />

        {/* ── Game cards — scrollable ── */}
        <div className="overflow-y-auto flex-1 overscroll-contain">
          {games.length === 0 ? (
            <div className="py-16 text-center flex flex-col items-center gap-3">
              {/* Calendar icon */}
              <svg className="w-10 h-10 text-white/15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <rect x="3" y="4" width="18" height="18" rx="3" />
                <path strokeLinecap="round" d="M16 2v4M8 2v4M3 10h18" />
              </svg>
              <div className="text-[12px] font-bold text-white/25 uppercase tracking-[0.18em]">
                No games scheduled
              </div>
            </div>
          ) : (
            <div className="px-3 pb-2 pt-2">
              {grouped.map(({ label, games: groupGames }, gi) => (
                <div key={label}>
                  {/* Section header — only when multiple leagues */}
                  {grouped.length > 1 && (
                    <LeagueSectionHeader label={label} />
                  )}
                  {/* Card list with spacing */}
                  <div className={`flex flex-col gap-2 ${gi > 0 && grouped.length > 1 ? "" : grouped.length === 1 ? "pt-1" : ""}`}>
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
          <div className="h-6" />
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
