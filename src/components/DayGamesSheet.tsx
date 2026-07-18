"use client"
import { useState } from "react"
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

function formatHeaderDate(dateStr: string) {
  // dateStr is "YYYY-MM-DD"
  const [y, m, d] = dateStr.split("-").map(Number)
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  })
}

function getTodayStr() {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(new Date())
}

// ── DayGameRow ────────────────────────────────────────────────────────────────

function DayGameRow({ game, onTap }: { game: Game; onTap: () => void }) {
  const isFt   = game.status === "ft"
  const isLive = game.status === "live"
  const isUp   = game.status === "upcoming"

  const seattleLogoUrl = getTeamLogoUrl(game.seattleTeam)

  // away = left, home = right (convention throughout the app)
  const awayLogo  = game.isHome ? game.opponent.logo  : seattleLogoUrl
  const awayEmoji = game.isHome ? "🏟️"               : game.seattleTeam.emoji
  const awayAbbr  = game.isHome ? game.opponent.abbr  : game.seattleTeam.abbr
  const awayName  = game.isHome
    ? (game.opponent.shortName || game.opponent.name)
    : game.seattleTeam.shortName

  const homeLogo  = game.isHome ? seattleLogoUrl     : game.opponent.logo
  const homeEmoji = game.isHome ? game.seattleTeam.emoji : "🏟️"
  const homeAbbr  = game.isHome ? game.seattleTeam.abbr  : game.opponent.abbr
  const homeName  = game.isHome
    ? game.seattleTeam.shortName
    : (game.opponent.shortName || game.opponent.name)

  const awayScoreRaw = game.isHome ? game.opponentScore : game.seattleScore
  const homeScoreRaw = game.isHome ? game.seattleScore  : game.opponentScore

  // Only treat scores as defined if they're not undefined
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
      className="w-full flex items-center px-4 py-3.5 border-b active:bg-white/[0.03] transition-colors text-left"
      style={{
        borderColor: "var(--border)",
        borderLeft: isLive ? "3px solid #ef4444" : "3px solid transparent",
        paddingLeft: isLive ? "13px" : "16px",
      }}
    >
      {/* Status column — 60px */}
      <div className="w-[60px] flex-shrink-0 flex flex-col gap-0.5">
        {isLive ? (
          <>
            <div className="flex items-center gap-1">
              <span className="relative flex h-1.5 w-1.5 flex-shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500" />
              </span>
              <span className="text-[11px] font-bold text-red-400 uppercase leading-tight">Live</span>
            </div>
            {(game.period || game.clock) && (
              <span className="text-[9px] text-red-400/60 leading-tight">
                {game.period}{game.clock ? ` ${game.clock}` : ""}
              </span>
            )}
          </>
        ) : isFt ? (
          <span className="text-[11px] text-zinc-500 uppercase tracking-wide">Final</span>
        ) : (
          <span className="text-[12px] font-medium text-zinc-300 whitespace-nowrap tabular-nums">
            {formatTime(game.kickoff)}
          </span>
        )}
        <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-700">
          {game.league.toUpperCase().replace("USA.1", "MLS").replace("USA.NWSL", "NWSL")}
        </span>
      </div>

      {/* Away team */}
      <div className="flex-1 flex items-center justify-end gap-2 min-w-0">
        <span
          className="text-[13px] font-semibold truncate text-right leading-tight"
          style={{ color: isFt && homeWon ? "#52525b" : "#f0f0f8" }}
        >
          {awayName}
        </span>
        <TeamLogo
          src={awayLogo}
          emoji={awayEmoji}
          abbr={awayAbbr}
          size={26}
          className={`flex-shrink-0 transition-opacity${isFt && homeWon ? " opacity-35" : ""}`}
        />
      </div>

      {/* Score / vs */}
      <div className="w-[52px] flex-shrink-0 text-center">
        {hasScore ? (
          <span
            className="text-[15px] font-bold tabular-nums"
            style={{ color: isLive ? "#f87171" : "#f0f0f8" }}
          >
            {awayScore}
            <span className="text-zinc-600 mx-0.5">–</span>
            {homeScore}
          </span>
        ) : (
          <span className="text-[12px] font-medium text-zinc-600">vs</span>
        )}
      </div>

      {/* Home team */}
      <div className="flex-1 flex items-center gap-2 min-w-0">
        <TeamLogo
          src={homeLogo}
          emoji={homeEmoji}
          abbr={homeAbbr}
          size={26}
          className={`flex-shrink-0 transition-opacity${isFt && awayWon ? " opacity-35" : ""}`}
        />
        <span
          className="text-[13px] font-semibold truncate leading-tight"
          style={{ color: isFt && awayWon ? "#52525b" : "#f0f0f8" }}
        >
          {homeName}
        </span>
      </div>

      {/* Chevron */}
      <svg className="w-3 h-3 text-zinc-700 flex-shrink-0 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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

  const today   = getTodayStr()
  const isToday = date === today
  const hasLive = games.some(g => g.status === "live")

  const headerDate = formatHeaderDate(date)
  const subLabel   = isToday
    ? (hasLive ? "Live Now" : "Today")
    : `${games.length} Game${games.length !== 1 ? "s" : ""}`

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40"
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className="fixed bottom-0 left-0 right-0 z-40 lg:max-w-2xl lg:mx-auto animate-slide-up overflow-hidden flex flex-col"
        style={{
          background: "var(--surface)",
          borderTop: "1px solid var(--border)",
          borderRadius: "20px 20px 0 0",
          maxHeight: "80dvh",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-3 flex-shrink-0 sticky top-0"
          style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)" }}
        >
          <div>
            <div className="font-display text-[17px] font-800 text-white uppercase tracking-tight leading-none">
              {headerDate}
            </div>
            <div
              className="font-display text-[10px] font-600 uppercase tracking-widest mt-1"
              style={{ color: hasLive && isToday ? "#f87171" : "#52525b" }}
            >
              {hasLive && isToday && (
                <span className="inline-flex items-center gap-1 mr-1">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500" />
                  </span>
                </span>
              )}
              {subLabel}
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 text-sm hover:bg-white/10 transition-colors"
            style={{ background: "rgba(255,255,255,0.08)" }}
          >
            ✕
          </button>
        </div>

        {/* Game rows — scrollable */}
        <div className="overflow-y-auto flex-1">
          {games.length === 0 ? (
            <div className="py-12 text-center">
              <div className="text-3xl mb-2">🗓️</div>
              <div className="font-display text-[13px] font-700 text-zinc-400 uppercase tracking-wide">
                No games this day
              </div>
            </div>
          ) : (
            <div className="py-1">
              {games.map(g => (
                <DayGameRow
                  key={g.id}
                  game={g}
                  onTap={() => setSelectedGame(g)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Game detail sheet — z-50 so it floats above the day sheet (z-40) */}
      {selectedGame && (
        <GameDetailSheet
          game={selectedGame}
          onClose={() => setSelectedGame(null)}
        />
      )}
    </>
  )
}
