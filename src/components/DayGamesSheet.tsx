"use client"
import { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import { Game } from "@/lib/types"
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

/** "SATURDAY, JUL 19" */
function formatHeaderDate(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number)
  const date = new Date(y, m - 1, d)
  const weekday = date.toLocaleDateString("en-US", { weekday: "long" }).toUpperCase()
  const monthDay = date.toLocaleDateString("en-US", { month: "short", day: "numeric" }).toUpperCase()
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

// ── DayGameRow ────────────────────────────────────────────────────────────────

function DayGameRow({ game, onTap }: { game: Game; onTap: () => void }) {
  const isFt   = game.status === "ft"
  const isLive = game.status === "live"

  const seattleLogoUrl = getTeamLogoUrl(game.seattleTeam)

  // away = left, home = right
  const awayLogo  = game.isHome ? game.opponent.logo  : seattleLogoUrl
  const awayEmoji = game.isHome ? "🏟️"               : game.seattleTeam.emoji
  const awayAbbr  = game.isHome ? game.opponent.abbr  : game.seattleTeam.abbr
  const awayName  = game.isHome
    ? (game.opponent.shortName || game.opponent.name)
    : game.seattleTeam.shortName

  const homeLogo  = game.isHome ? seattleLogoUrl          : game.opponent.logo
  const homeEmoji = game.isHome ? game.seattleTeam.emoji  : "🏟️"
  const homeAbbr  = game.isHome ? game.seattleTeam.abbr   : game.opponent.abbr
  const homeName  = game.isHome
    ? game.seattleTeam.shortName
    : (game.opponent.shortName || game.opponent.name)

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

  return (
    <button
      onClick={onTap}
      className="w-full flex items-center gap-3 px-4 py-3 border-b border-white/5 active:bg-white/[0.04] transition-colors text-left"
    >
      {/* Away side */}
      <div className="flex-1 flex items-center justify-end gap-2 min-w-0">
        <span
          className="text-[13px] font-semibold truncate text-right leading-tight"
          style={{ color: isFt && homeWon ? "rgba(255,255,255,0.25)" : "#f0f0f8" }}
        >
          {awayName}
        </span>
        <TeamLogo
          src={awayLogo}
          emoji={awayEmoji}
          abbr={awayAbbr}
          size={24}
          className={`flex-shrink-0 transition-opacity${isFt && homeWon ? " opacity-30" : ""}`}
        />
        {hasScore && (
          <span
            className="text-[15px] font-black tabular-nums w-6 text-right flex-shrink-0"
            style={{ color: awayWon ? "#f0f0f8" : "rgba(255,255,255,0.4)" }}
          >
            {awayScore}
          </span>
        )}
      </div>

      {/* Status badge — center */}
      <div className="flex-shrink-0 flex flex-col items-center gap-0.5 w-[54px]">
        {isLive ? (
          <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-[10px] font-bold uppercase tracking-wide flex items-center gap-1">
            <span className="relative flex h-1.5 w-1.5 flex-shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500" />
            </span>
            Live
          </span>
        ) : isFt ? (
          <span className="text-[10px] font-semibold text-white/30 uppercase tracking-wide">Final</span>
        ) : (
          <>
            {!hasScore && <span className="text-[11px] font-medium text-white/50 tabular-nums whitespace-nowrap">{formatTime(game.kickoff)}</span>}
          </>
        )}
        {(game.period || game.clock) && isLive && (
          <span className="text-[9px] text-red-400/50 leading-tight tabular-nums">
            {game.period}{game.clock ? ` ${game.clock}` : ""}
          </span>
        )}
      </div>

      {/* Home side */}
      <div className="flex-1 flex items-center gap-2 min-w-0">
        {hasScore && (
          <span
            className="text-[15px] font-black tabular-nums w-6 text-left flex-shrink-0"
            style={{ color: homeWon ? "#f0f0f8" : "rgba(255,255,255,0.4)" }}
          >
            {homeScore}
          </span>
        )}
        <TeamLogo
          src={homeLogo}
          emoji={homeEmoji}
          abbr={homeAbbr}
          size={24}
          className={`flex-shrink-0 transition-opacity${isFt && awayWon ? " opacity-30" : ""}`}
        />
        <span
          className="text-[13px] font-semibold truncate leading-tight"
          style={{ color: isFt && awayWon ? "rgba(255,255,255,0.25)" : "#f0f0f8" }}
        >
          {homeName}
        </span>
      </div>

      {/* Chevron */}
      <svg className="w-3 h-3 text-white/20 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </button>
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

  const today   = getTodayStr()
  const isToday = date === today
  const hasLive = games.some(g => g.status === "live")

  const { weekday, monthDay } = formatHeaderDate(date)
  const countLabel = isToday && hasLive
    ? "Live Now"
    : `${games.length} Game${games.length !== 1 ? "s" : ""}`

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
      {/* Full-screen backdrop — tappable to dismiss */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998]"
        onClick={onClose}
      />

      {/* Bottom sheet — rendered at document root via portal, above ALL stacking contexts */}
      <div
        className="fixed bottom-0 left-0 right-0 z-[9999] lg:max-w-2xl lg:mx-auto animate-slide-up flex flex-col overflow-hidden"
        style={{
          background: "linear-gradient(to bottom, #0a1628, #13131a)",
          borderRadius: "24px 24px 0 0",
          maxHeight: "85dvh",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mt-3 mb-0 flex-shrink-0" />

        {/* Header */}
        <div className="flex items-start justify-between px-5 pt-4 pb-4 flex-shrink-0">
          <div>
            <div className="text-[11px] tracking-widest uppercase text-white/40 font-semibold leading-none mb-1.5">
              {weekday}, {monthDay}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[22px] font-black text-white leading-none">
                {countLabel}
              </span>
              {isToday && hasLive && (
                <span className="relative flex h-2 w-2 mt-0.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-white/40 text-sm hover:bg-white/10 transition-colors mt-1"
            style={{ background: "rgba(255,255,255,0.08)" }}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Divider */}
        <div className="h-px bg-white/[0.06] flex-shrink-0 mx-4" />

        {/* Game rows — scrollable */}
        <div className="overflow-y-auto flex-1">
          {games.length === 0 ? (
            <div className="py-16 text-center">
              <div className="text-4xl mb-3">🗓️</div>
              <div className="text-[13px] font-bold text-white/30 uppercase tracking-widest">
                No games this day
              </div>
            </div>
          ) : (
            <div className="py-2">
              {grouped.map(({ label, games: groupGames }) => (
                <div key={label}>
                  {/* Sport / league label */}
                  {grouped.length > 1 && (
                    <div className="px-4 pt-3 pb-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/25">
                        {label}
                      </span>
                    </div>
                  )}
                  {groupGames.map(g => (
                    <DayGameRow
                      key={g.id}
                      game={g}
                      onTap={() => setSelectedGame(g)}
                    />
                  ))}
                </div>
              ))}
            </div>
          )}

          {/* Bottom padding so last row isn't flush */}
          <div className="h-4" />
        </div>
      </div>

      {/* Game detail sheet — z-[10000] so it floats above the day sheet */}
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
