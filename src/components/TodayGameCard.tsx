"use client"
import { useState } from "react"
import { Game } from "@/lib/types"
import { getTeamLogoUrl } from "@/lib/teams"
import TeamLogo from "./TeamLogo"
import CompactBaseballLineScore from "./CompactBaseballLineScore"
import TeamDetailSheet from "./TeamDetailSheet"
import GameDetailSheet from "@/components/GameDetailSheet"

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true, timeZoneName: "short" })
}

/** Full-width featured card for today's games */
export function TodayGameCard({ game }: { game: Game }) {
  const [showDetail, setShowDetail] = useState(false)
  const [teamSheet, setTeamSheet] = useState<{ id: string; name: string; logo: string } | null>(null)

  const isLive = game.status === "live"
  const isFt   = game.status === "ft"
  const isUp   = game.status === "upcoming"
  const hasScore = isLive || isFt
  const seattleLogoUrl = getTeamLogoUrl(game.seattleTeam)
  const hasScores = game.seattleScore !== undefined && game.opponentScore !== undefined

  // Resolve away / home sides
  const awayLogo   = game.isHome ? game.opponent.logo  : seattleLogoUrl
  const awayEmoji  = game.isHome ? "🏟️"               : game.seattleTeam.emoji
  const awayAbbr   = game.isHome ? game.opponent.abbr  : game.seattleTeam.abbr
  const awayName   = game.isHome ? (game.opponent.shortName || game.opponent.name) : game.seattleTeam.shortName
  const awayScore  = game.isHome ? game.opponentScore  : game.seattleScore
  const awayId     = game.isHome ? game.opponent.id    : game.seattleTeam.espnId

  const homeLogo   = game.isHome ? seattleLogoUrl      : game.opponent.logo
  const homeEmoji  = game.isHome ? game.seattleTeam.emoji : "🏟️"
  const homeAbbr   = game.isHome ? game.seattleTeam.abbr  : game.opponent.abbr
  const homeName   = game.isHome ? game.seattleTeam.shortName : (game.opponent.shortName || game.opponent.name)
  const homeScore  = game.isHome ? game.seattleScore   : game.opponentScore
  const homeId     = game.isHome ? game.seattleTeam.espnId : game.opponent.id

  const awayWon = isFt && hasScores && (awayScore ?? 0) > (homeScore ?? 0)
  const homeWon = isFt && hasScores && (homeScore ?? 0) > (awayScore ?? 0)

  // Card container — no box background, content lives directly on the navy bg.
  // Live games get a red left accent stripe. FT games are dimmed slightly.
  const cardStyle: React.CSSProperties = isLive ? {
    borderLeft: "3px solid #ef4444",
    paddingLeft: "2px",
    opacity: 1,
  } : isFt ? {
    opacity: 0.72,
  } : {}

  return (
    <>
      <div
        className="mx-4 cursor-pointer active:opacity-80 transition-opacity"
        style={{ ...cardStyle, borderBottom: "1px solid rgba(255,255,255,0.06)", paddingTop: "16px", paddingBottom: "16px" }}
        onClick={() => setShowDetail(true)}
      >
        {/* ── Header: status badge + league pill ── */}
        <div className="flex items-center justify-between mb-3">
          {isLive ? (
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500" />
              </span>
              <span className="text-[11px] font-bold text-red-400 uppercase tracking-wider">Live</span>
            </div>
          ) : isFt ? (
            <span className="text-[11px] uppercase tracking-wide font-semibold" style={{ color: "#5f6773" }}>Final</span>
          ) : (
            <span className="text-[13px] font-semibold" style={{ color: "#f0f0f8" }}>{formatTime(game.kickoff)}</span>
          )}
          <div className="flex items-center gap-2">
            {game.broadcast && <span className="text-[10px]" style={{ color: "#3a5070" }}>{game.broadcast}</span>}
            <span className="text-[10px] font-semibold tracking-widest uppercase" style={{ color: "#3a5070" }}>{game.league}</span>
          </div>
        </div>

        {/* ── Team rows ── */}
        <div>
          {/* Away team row */}
          <div className="flex items-center gap-4 py-1.5">
            <button
              className="flex-shrink-0 active:scale-90 transition-transform"
              onClick={e => { e.stopPropagation(); setTeamSheet({ id: awayId, name: awayName, logo: awayLogo }) }}
            >
              <TeamLogo
                src={awayLogo} emoji={awayEmoji} abbr={awayAbbr} size={44}
                className={`rounded-xl transition-opacity${isFt && !awayWon && homeWon ? " opacity-40" : ""}`}
              />
            </button>
            <div className="flex-1 min-w-0">
              <div className="font-display text-[20px] font-700 leading-tight truncate"
                style={{ color: isFt && !awayWon && homeWon ? "#3a5070" : "#f0f0f8" }}
              >{awayName}</div>
              <div className="text-[11px] uppercase tracking-wide" style={{ color: "#3a5070" }}>{awayAbbr}</div>
            </div>
            {hasScore && awayScore !== undefined && (
              <div
                className="font-display font-700 tabular-nums leading-none flex-shrink-0"
                style={{ fontSize: "48px", color: isFt && !awayWon && homeWon ? "#3a5070" : "#f0f0f8" }}
              >{awayScore}</div>
            )}
          </div>

          {/* Upcoming only: vs separator */}
          {isUp && (
            <div className="flex items-center gap-3 py-2">
              <div className="flex-1 h-px" style={{ background: "#1e3050" }} />
              <span className="text-[12px] font-semibold" style={{ color: "#f0f0f8" }}>
                {formatTime(game.kickoff)}
              </span>
              <span className="text-[10px]" style={{ color: "#3a5070" }}>·</span>
              <span className="text-[11px]" style={{ color: "#5f6773" }}>{game.isHome ? "Home" : "Away"}</span>
              <div className="flex-1 h-px" style={{ background: "#1e3050" }} />
            </div>
          )}

          {/* Home team row */}
          <div className="flex items-center gap-4 py-1.5">
            <button
              className="flex-shrink-0 active:scale-90 transition-transform"
              onClick={e => { e.stopPropagation(); setTeamSheet({ id: homeId, name: homeName, logo: homeLogo }) }}
            >
              <TeamLogo
                src={homeLogo} emoji={homeEmoji} abbr={homeAbbr} size={44}
                className={`rounded-xl transition-opacity${isFt && !homeWon && awayWon ? " opacity-40" : ""}`}
              />
            </button>
            <div className="flex-1 min-w-0">
              <div className="font-display text-[20px] font-700 leading-tight truncate"
                style={{ color: isFt && !homeWon && awayWon ? "#3a5070" : "#f0f0f8" }}
              >{homeName}</div>
              <div className="text-[11px] uppercase tracking-wide" style={{ color: "#3a5070" }}>{homeAbbr}</div>
            </div>
            {hasScore && homeScore !== undefined && (
              <div
                className="font-display font-700 tabular-nums leading-none flex-shrink-0"
                style={{ fontSize: "48px", color: isFt && !homeWon && awayWon ? "#3a5070" : "#f0f0f8" }}
              >{homeScore}</div>
            )}
          </div>

          {/* Clock for live games */}
          {isLive && game.clock && (
            <div className="flex items-center gap-2 mt-2 pt-2" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
              <span className="text-[11px] font-medium text-red-400">{game.clock}</span>
            </div>
          )}
        </div>

        {/* ── Inline MLB line score ── */}
        {(isLive || isFt) && game.sport === "baseball" && game.id && (
          <div className="mt-3">
            <CompactBaseballLineScore
              gameId={game.id}
              league={game.league}
              seattleTeamId={game.seattleTeam.espnId}
              isLive={isLive}
            />
          </div>
        )}
      </div>

      {/* Detail sheet */}
      {showDetail && (
        <GameDetailSheet game={game} onClose={() => setShowDetail(false)} />
      )}

      {/* Team detail sheet */}
      {teamSheet && (
        <TeamDetailSheet teamId={teamSheet.id} teamName={teamSheet.name} teamLogo={teamSheet.logo} league={game.league} onClose={() => setTeamSheet(null)} />
      )}
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
      <div className="flex-1 h-px bg-zinc-800" />
      <span className="text-[10px] text-zinc-600 uppercase tracking-wider">{dateLabel}</span>
    </div>
  )
}
