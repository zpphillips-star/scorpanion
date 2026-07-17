"use client"
import { useState } from "react"
import { Game } from "@/lib/types"
import { getTeamLogoUrl } from "@/lib/teams"
import TeamLogo from "./TeamLogo"
import CompactBaseballLineScore from "./CompactBaseballLineScore"
import TeamDetailSheet from "./TeamDetailSheet"
import GameDetailSheet from "@/components/GameDetailSheet"

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })
}

/** Full-width WC-style featured card for today games */
export function TodayGameCard({ game, featured = false }: { game: Game; featured?: boolean }) {
  const [showDetail, setShowDetail] = useState(false)
  const [teamSheet, setTeamSheet] = useState<{ id: string; name: string; logo: string } | null>(null)

  const isLive = game.status === "live"
  const isFt   = game.status === "ft"
  const isUp   = game.status === "upcoming"
  const hasScore = (isLive || isFt) && game.seattleScore !== undefined && game.opponentScore !== undefined
  const seattleLogoUrl = getTeamLogoUrl(game.seattleTeam)

  const awayLogo  = game.isHome ? game.opponent.logo  : seattleLogoUrl
  const awayEmoji = game.isHome ? "🏟️"               : game.seattleTeam.emoji
  const awayAbbr  = game.isHome ? game.opponent.abbr  : game.seattleTeam.abbr
  const awayName  = game.isHome ? (game.opponent.shortName || game.opponent.name) : game.seattleTeam.shortName
  const awayScore = game.isHome ? game.opponentScore  : game.seattleScore
  const awayId    = game.isHome ? game.opponent.id    : game.seattleTeam.espnId

  const homeLogo  = game.isHome ? seattleLogoUrl      : game.opponent.logo
  const homeEmoji = game.isHome ? game.seattleTeam.emoji : "🏟️"
  const homeAbbr  = game.isHome ? game.seattleTeam.abbr  : game.opponent.abbr
  const homeName  = game.isHome ? game.seattleTeam.shortName : (game.opponent.shortName || game.opponent.name)
  const homeScore = game.isHome ? game.seattleScore   : game.opponentScore
  const homeId    = game.isHome ? game.seattleTeam.espnId : game.opponent.id

  const awayWon = isFt && hasScore && (awayScore ?? 0) > (homeScore ?? 0)
  const homeWon = isFt && hasScore && (homeScore ?? 0) > (awayScore ?? 0)
  const logoSize = featured ? 60 : 48
  const cardBg = isFt ? "#141418" : isLive ? "#1a1a24" : "#141820"

  return (
    <>
      <button
        className="w-full text-left active:scale-[0.98] transition-transform"
        onClick={() => setShowDetail(true)}
      >
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            background: cardBg,
            border: "1px solid rgba(255,255,255,0.07)",
            borderLeft: isLive ? "3px solid #e8003d" : "1px solid rgba(255,255,255,0.07)",
            opacity: isFt ? 0.82 : 1,
          }}
        >
          {/* Header row */}
          <div className="flex items-center justify-between px-4 pt-3 pb-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "#4b5563" }}>
                {game.league}
              </span>
              {game.broadcast && (
                <span className="text-[10px]" style={{ color: "#374151" }}>· {game.broadcast}</span>
              )}
            </div>
            {isLive ? (
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#e8003d]"
                      style={{ animation: "liveDotPulse 1.8s ease-in-out infinite" }} />
                <span className="text-[11px] font-black text-[#e8003d] uppercase tracking-wider">Live</span>
                {(game.clock || game.period) && (
                  <span className="text-[11px] font-bold tabular-nums" style={{ color: "#6b7280" }}>
                    {game.period ? `${game.period}${game.clock ? ` · ${game.clock}` : ""}` : game.clock}
                  </span>
                )}
              </div>
            ) : isFt ? (
              <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "#4b5563" }}>Final</span>
            ) : (
              <span className="text-[12px] font-semibold" style={{ color: "#00d4ff" }}>{formatTime(game.kickoff)}</span>
            )}
          </div>

          {/* Main: away | score | home */}
          <div className="flex items-center px-4 py-5 gap-2">
            {/* Away team */}
            <div className="flex-1 flex flex-col items-center gap-2">
              <button className="active:scale-90 transition-transform"
                      onClick={e => { e.stopPropagation(); setTeamSheet({ id: awayId, name: awayName, logo: awayLogo }) }}>
                <TeamLogo src={awayLogo} emoji={awayEmoji} abbr={awayAbbr} size={logoSize}
                  className={`rounded-xl${isFt && !awayWon && homeWon ? " opacity-30" : ""}`} />
              </button>
              <div className="text-center">
                <div className="text-[13px] font-bold leading-tight"
                     style={{ color: isFt && !awayWon && homeWon ? "#374151" : "#f0f0f8" }}>
                  {awayName}
                </div>
                <div className="text-[9px] uppercase tracking-widest mt-0.5" style={{ color: "#374151" }}>{awayAbbr}</div>
              </div>
            </div>

            {/* Score center */}
            <div className="flex flex-col items-center justify-center min-w-[80px] gap-1">
              {hasScore ? (
                <>
                  <div className="flex items-baseline gap-1 tabular-nums leading-none">
                    <span className="font-display font-800"
                          style={{ fontSize: featured ? "44px" : "36px", color: isFt && awayWon === false && homeWon ? "#374151" : "#f0f0f8" }}>
                      {awayScore}
                    </span>
                    <span className="font-display font-800" style={{ fontSize: featured ? "24px" : "20px", color: "#2d3748" }}>–</span>
                    <span className="font-display font-800"
                          style={{ fontSize: featured ? "44px" : "36px", color: isFt && homeWon === false && awayWon ? "#374151" : "#f0f0f8" }}>
                      {homeScore}
                    </span>
                  </div>
                  {isFt && <span className="text-[9px] uppercase tracking-widest" style={{ color: "#374151" }}>Full Time</span>}
                </>
              ) : (
                <div className="flex flex-col items-center gap-0.5">
                  <span className="text-[20px] font-black" style={{ color: "#2d3748" }}>vs</span>
                  <span className="text-[10px]" style={{ color: "#374151" }}>{game.isHome ? "Home" : "Away"}</span>
                </div>
              )}
            </div>

            {/* Home team */}
            <div className="flex-1 flex flex-col items-center gap-2">
              <button className="active:scale-90 transition-transform"
                      onClick={e => { e.stopPropagation(); setTeamSheet({ id: homeId, name: homeName, logo: homeLogo }) }}>
                <TeamLogo src={homeLogo} emoji={homeEmoji} abbr={homeAbbr} size={logoSize}
                  className={`rounded-xl${isFt && !homeWon && awayWon ? " opacity-30" : ""}`} />
              </button>
              <div className="text-center">
                <div className="text-[13px] font-bold leading-tight"
                     style={{ color: isFt && !homeWon && awayWon ? "#374151" : "#f0f0f8" }}>
                  {homeName}
                </div>
                <div className="text-[9px] uppercase tracking-widest mt-0.5" style={{ color: "#374151" }}>{homeAbbr}</div>
              </div>
            </div>
          </div>

          {/* Inline MLB line score */}
          {(isLive || isFt) && game.sport === "baseball" && game.id && (
            <div className="px-4 pb-3 -mt-1">
              <CompactBaseballLineScore gameId={game.id} league={game.league}
                seattleTeamId={game.seattleTeam.espnId} isLive={isLive} />
            </div>
          )}

          {/* Venue footer */}
          {game.venue?.name && (
            <div className="px-4 pb-3 pt-2 text-center" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
              <span className="text-[10px]" style={{ color: "#374151" }}>
                {game.venue.name}{game.venue.city ? `, ${game.venue.city}` : ""}
              </span>
            </div>
          )}
        </div>
      </button>

      {showDetail && <GameDetailSheet game={game} onClose={() => setShowDetail(false)} />}
      {teamSheet && (
        <TeamDetailSheet teamId={teamSheet.id} teamName={teamSheet.name} teamLogo={teamSheet.logo}
          league={game.league} onClose={() => setTeamSheet(null)} />
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
