"use client"
import { useState } from "react"
import { Game } from "@/lib/types"
import { getTeamLogoUrl } from "@/lib/teams"
import TeamLogo from "./TeamLogo"
import CompactBaseballLineScore from "./CompactBaseballLineScore"
import CompactLineScore from "./CompactLineScore"
import GameDetailSheet from "@/components/GameDetailSheet"

function parseKickoff(kickoff: string): Date {
  if (!kickoff) return new Date(NaN)
  if (kickoff.includes("T") || kickoff.startsWith("20")) return new Date(kickoff)
  const [datePart = "", timePart = "00:00:00"] = kickoff.split(" ")
  const parts = datePart.split("/")
  if (parts.length === 3) {
    const [mm, dd, yyyy] = parts
    return new Date(`${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}T${timePart}Z`)
  }
  return new Date(kickoff)
}

function formatTime(iso: string) {
  return parseKickoff(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })
}

/** Full-width WC-style featured card for today games */
export function TodayGameCard({ game, featured = false }: { game: Game; featured?: boolean }) {
  const [showDetail, setShowDetail] = useState(false)

  const isLive = game.status === "live"
  const isFt   = game.status === "ft"
  const isUp   = game.status === "upcoming"
  // For live games, default to 0-0 if score not yet available.
  // For final games, only show scores if they are actually defined.
  const awayScoreRaw = game.isHome ? game.opponentScore : game.seattleScore
  const homeScoreRaw = game.isHome ? game.seattleScore  : game.opponentScore
  const awayScore = awayScoreRaw !== undefined ? awayScoreRaw : (isLive ? 0 : undefined)
  const homeScore = homeScoreRaw !== undefined ? homeScoreRaw : (isLive ? 0 : undefined)
  const hasDefinedScores = awayScore !== undefined && homeScore !== undefined
  const hasScore = (isLive || isFt) && hasDefinedScores
  const seattleLogoUrl = getTeamLogoUrl(game.seattleTeam)

  const awayLogo  = game.isHome ? game.opponent.logo  : seattleLogoUrl
  const awayEmoji = game.isHome ? "🏟️"               : game.seattleTeam.emoji
  const awayAbbr  = game.isHome ? game.opponent.abbr  : game.seattleTeam.abbr
  const awayName  = game.isHome ? (game.opponent.shortName || game.opponent.name) : game.seattleTeam.shortName

  const homeLogo  = game.isHome ? seattleLogoUrl      : game.opponent.logo
  const homeEmoji = game.isHome ? game.seattleTeam.emoji : "🏟️"
  const homeAbbr  = game.isHome ? game.seattleTeam.abbr  : game.opponent.abbr
  const homeName  = game.isHome ? game.seattleTeam.shortName : (game.opponent.shortName || game.opponent.name)

  const awayWon = isFt && hasDefinedScores && (awayScore ?? 0) > (homeScore ?? 0)
  const homeWon = isFt && hasDefinedScores && (homeScore ?? 0) > (awayScore ?? 0)
  const logoSize = featured ? 60 : 48

  return (
    <>
      <button
        className="w-full text-left active:opacity-70 transition-opacity"
        onClick={() => setShowDetail(true)}
      >
        <div
          style={{
            borderLeft: isLive ? "3px solid #ef4444" : "none",
            paddingLeft: isLive ? "13px" : "16px",
            opacity: isFt ? 0.82 : 1,
          }}
        >
          {/* Header row — league left · status/time centered · broadcast right */}
          <div className="grid items-center pr-4 pt-4 pb-1" style={{ gridTemplateColumns: "1fr auto 1fr" }}>
            {/* Left: league badge */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--text-faint)" }}>
                {game.league}
              </span>
            </div>
            {/* Center: time / live status / final */}
            <div className="flex items-center justify-center gap-1.5">
              {isLive ? (
                <>
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500" />
                  </span>
                  <span className="text-[11px] font-bold text-red-400 uppercase tracking-wider">Live</span>
                  {(game.clock || game.period) && (
                    <span className="text-[11px] font-semibold tabular-nums" style={{ color: "var(--text-faint)" }}>
                      {game.period ? `${game.period}${game.clock ? ` · ${game.clock}` : ""}` : game.clock}
                    </span>
                  )}
                </>
              ) : isFt ? (
                <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--text-faint)" }}>Final</span>
              ) : (
                <span className="text-[12px] font-semibold" style={{ color: "#f0f0f8" }}>{formatTime(game.kickoff)}</span>
              )}
            </div>
            {/* Right: broadcast */}
            <div className="flex justify-end">
              {game.broadcast && (
                <span className="text-[10px]" style={{ color: "#2d4a6b" }}>{game.broadcast}</span>
              )}
            </div>
          </div>

          {/* Main: away | score | home */}
          <div className="flex items-stretch pr-4 gap-2" style={{ minHeight: 110 }}>
            {/* Away team */}
            <div className="flex-1 flex flex-col items-center justify-center gap-2">
              <TeamLogo src={awayLogo} emoji={awayEmoji} abbr={awayAbbr} size={logoSize}
                className={`rounded-xl${isFt && !awayWon && homeWon ? " opacity-30" : ""}`} />
              <div className="text-center">
                <div className="text-[13px] font-bold leading-tight"
                     style={{ color: isFt && !awayWon && homeWon ? "#3a5070" : "#f0f0f8" }}>
                  {awayName}
                </div>
                <div className="text-[9px] uppercase tracking-widest mt-0.5" style={{ color: "#3a5070" }}>{awayAbbr}</div>
              </div>
            </div>

            {/* Score center */}
            <div className="flex flex-col items-center justify-center min-w-[80px] gap-1">
              {hasScore ? (
                <>
                  <div className="flex items-baseline gap-1 tabular-nums leading-none">
                    <span className="font-display font-800"
                          style={{ fontSize: featured ? "44px" : "36px", color: isFt && awayWon === false && homeWon ? "#1e3050" : "#f0f0f8" }}>
                      {awayScore}
                    </span>
                    <span className="font-display font-800" style={{ fontSize: featured ? "24px" : "20px", color: "#1e3050" }}>–</span>
                    <span className="font-display font-800"
                          style={{ fontSize: featured ? "44px" : "36px", color: isFt && homeWon === false && awayWon ? "#1e3050" : "#f0f0f8" }}>
                      {homeScore}
                    </span>
                  </div>
                  {isFt && <span className="text-[9px] uppercase tracking-widest" style={{ color: "#3a5070" }}>Full Time</span>}
                </>
              ) : (
                <div className="flex flex-col items-center gap-0.5">
                  <span className="text-[20px] font-black" style={{ color: "#1e3050" }}>vs</span>
                  <span className="text-[10px]" style={{ color: "#3a5070" }}>{game.isHome ? "Home" : "Away"}</span>
                </div>
              )}
            </div>

            {/* Home team */}
            <div className="flex-1 flex flex-col items-center justify-center gap-2">
              <TeamLogo src={homeLogo} emoji={homeEmoji} abbr={homeAbbr} size={logoSize}
                className={`rounded-xl${isFt && !homeWon && awayWon ? " opacity-30" : ""}`} />
              <div className="text-center">
                <div className="text-[13px] font-bold leading-tight"
                     style={{ color: isFt && !homeWon && awayWon ? "#3a5070" : "#f0f0f8" }}>
                  {homeName}
                </div>
                <div className="text-[9px] uppercase tracking-widest mt-0.5" style={{ color: "#3a5070" }}>{homeAbbr}</div>
              </div>
            </div>
          </div>

          {/* Inline MLB line score — live only; final games show breakdown only in the detail sheet */}
          {isLive && game.sport === "baseball" && game.id && (
            <div className="pr-4 pb-3 -mt-1">
              <CompactBaseballLineScore gameId={game.id} league={game.league}
                seattleTeamId={game.seattleTeam.espnId} isLive={isLive} />
            </div>
          )}

          {/* Inline period/quarter line score for live non-baseball games */}
          {isLive && game.sport !== "baseball" && game.sport !== "soccer" && game.id && (
            <div className="pr-4 pb-3 -mt-1">
              <CompactLineScore gameId={game.id} league={game.league}
                seattleTeamId={game.seattleTeam.espnId} />
            </div>
          )}

          {/* Venue footer */}
          {game.venue?.name && (
            <div className="pr-4 pb-3 text-center">
              <span className="text-[10px]" style={{ color: "var(--text-faint)" }}>
                {game.venue.name}{game.venue.city ? `, ${game.venue.city}` : ""}
              </span>
            </div>
          )}
        </div>
      </button>

      {showDetail && <GameDetailSheet game={game} onClose={() => setShowDetail(false)} />}
    </>
  )
}

/** Today section header banner */
export function TodayBanner({ gameCount, hasLive }: { gameCount: number; hasLive: boolean }) {
  const today = new Date()
  const dateLabel = today.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })
  return (
    <div className="flex items-center gap-3 px-4 mt-6 mb-2">
      {hasLive && (
        <span className="relative flex h-1.5 w-1.5 flex-shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500" />
        </span>
      )}
      <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: hasLive ? "#f87171" : "#71717a" }}>
        {hasLive ? "Live Now" : "Today"}
      </span>
      <div className="flex-1 h-px bg-zinc-700/50" />
      <span className="text-[10px] text-zinc-600 uppercase tracking-wider">{dateLabel}</span>
    </div>
  )
}
