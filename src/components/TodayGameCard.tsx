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
function formatRecord(r?: { wins: number; losses: number; ties?: number }): string {
  if (!r) return ""
  return r.ties ? `${r.wins}-${r.losses}-${r.ties}` : `${r.wins}-${r.losses}`
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
  const awayRecord = game.isHome ? game.opponentRecord : game.seattleRecord
  const awayId     = game.isHome ? game.opponent.id    : game.seattleTeam.espnId

  const homeLogo   = game.isHome ? seattleLogoUrl      : game.opponent.logo
  const homeEmoji  = game.isHome ? game.seattleTeam.emoji : "🏟️"
  const homeAbbr   = game.isHome ? game.seattleTeam.abbr  : game.opponent.abbr
  const homeName   = game.isHome ? game.seattleTeam.shortName : (game.opponent.shortName || game.opponent.name)
  const homeScore  = game.isHome ? game.seattleScore   : game.opponentScore
  const homeRecord = game.isHome ? game.seattleRecord  : game.opponentRecord
  const homeId     = game.isHome ? game.seattleTeam.espnId : game.opponent.id

  const awayWon = isFt && hasScores && (awayScore ?? 0) > (homeScore ?? 0)
  const homeWon = isFt && hasScores && (homeScore ?? 0) > (awayScore ?? 0)
  const seattleWon  = isFt && hasScores && game.seattleScore! > game.opponentScore!
  const seattleLost = isFt && hasScores && game.seattleScore! < game.opponentScore!

  // Card container style
  const cardStyle: React.CSSProperties = isLive ? {
    background: "#13131e",
    border: "1px solid rgba(0,212,255,0.2)",
    borderLeftWidth: "3px",
    borderLeftColor: "#00d4ff",
    boxShadow: "0 0 0 1px rgba(0,212,255,0.1), 0 2px 20px rgba(0,212,255,0.06)",
  } : {
    background: "var(--surface)",
    border: "1px solid #1e1e2e",
  }

  return (
    <>
      <div
        className="mx-3 my-1.5 rounded-xl overflow-hidden cursor-pointer active:scale-[0.985] transition-transform"
        style={cardStyle}
        onClick={() => setShowDetail(true)}
      >
        {/* ── Header: status badge + league pill ── */}
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          {isLive ? (
            <div
              className="flex items-center gap-1.5 rounded-full px-2.5 py-1"
              style={{ background: "rgba(0,212,255,0.1)", border: "1px solid rgba(0,212,255,0.25)" }}
            >
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: "var(--accent)" }} />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ background: "var(--accent)" }} />
              </span>
              <span className="font-medium text-[11px] uppercase tracking-widest" style={{ color: "var(--accent)" }}>LIVE</span>
            </div>
          ) : isFt ? (
            <span
              className="font-medium text-[11px] uppercase tracking-widest rounded-full px-2.5 py-1"
              style={{ color: "var(--status-final)", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
            >FINAL</span>
          ) : (
            <span className="font-medium text-[11px] uppercase tracking-widest text-zinc-500">Today</span>
          )}
          <div className="flex items-center gap-2">
            {game.broadcast && <span className="text-[10px] text-zinc-600">{game.broadcast}</span>}
            <span className="text-[10px] font-medium" style={{ color: "#9090b0" }}>{game.league.toUpperCase()}</span>
          </div>
        </div>

        {/* ── Team rows ── */}
        <div className="px-4 pb-3">

          {/* Away team row */}
          <div className="flex items-center gap-3 py-1">
            <button
              className="flex-shrink-0 active:scale-90 transition-transform"
              onClick={e => { e.stopPropagation(); setTeamSheet({ id: awayId, name: awayName, logo: awayLogo }) }}
            >
              <TeamLogo
                src={awayLogo} emoji={awayEmoji} abbr={awayAbbr} size={40}
                className={`rounded-lg transition-opacity${isFt && !awayWon && homeWon ? " opacity-60" : ""}`}
              />
            </button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[12px]" style={{ color: "#9090b0" }}>{awayAbbr}</span>
                {awayRecord && <span className="text-[10px] text-zinc-700">{formatRecord(awayRecord)}</span>}
              </div>
              <div
                className="font-display text-[16px] font-700 leading-tight truncate"
                style={{ color: isFt && !awayWon && homeWon ? "#5a5a7a" : "#f0f0f8" }}
              >{awayName}</div>
            </div>
            {hasScore && awayScore !== undefined && (
              <div
                className="font-display font-700 tabular-nums leading-none flex-shrink-0"
                style={{ fontSize: "40px", color: isFt && !awayWon && homeWon ? "#5a5a7a" : "#f0f0f8" }}
              >{awayScore}</div>
            )}
          </div>

          {/* Upcoming only: time / vs separator */}
          {isUp && (
            <div className="flex items-center gap-2 py-1">
              <div className="flex-1 h-px" style={{ background: "rgba(144,144,176,0.15)" }} />
              <span className="text-[12px] font-medium" style={{ color: "#9090b0" }}>
                {formatTime(game.kickoff)} · {game.isHome ? "Home" : "Away"}
              </span>
              <div className="flex-1 h-px" style={{ background: "rgba(144,144,176,0.15)" }} />
            </div>
          )}

          {/* Home team row */}
          <div className="flex items-center gap-3 py-1">
            <button
              className="flex-shrink-0 active:scale-90 transition-transform"
              onClick={e => { e.stopPropagation(); setTeamSheet({ id: homeId, name: homeName, logo: homeLogo }) }}
            >
              <TeamLogo
                src={homeLogo} emoji={homeEmoji} abbr={homeAbbr} size={40}
                className={`rounded-lg transition-opacity${isFt && !homeWon && awayWon ? " opacity-60" : ""}`}
              />
            </button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[12px]" style={{ color: "#9090b0" }}>{homeAbbr}</span>
                {homeRecord && <span className="text-[10px] text-zinc-700">{formatRecord(homeRecord)}</span>}
              </div>
              <div
                className="font-display text-[16px] font-700 leading-tight truncate"
                style={{ color: isFt && !homeWon && awayWon ? "#5a5a7a" : "#f0f0f8" }}
              >{homeName}</div>
            </div>
            {hasScore && homeScore !== undefined && (
              <div
                className="font-display font-700 tabular-nums leading-none flex-shrink-0"
                style={{ fontSize: "40px", color: isFt && !homeWon && awayWon ? "#5a5a7a" : "#f0f0f8" }}
              >{homeScore}</div>
            )}
          </div>

          {/* Win / loss label + venue footer */}
          {(isFt || isLive) && (
            <div className="flex items-center gap-2 mt-1.5 pt-1.5" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
              {isFt && (() => {
                  const triangle = awayWon ? "▲" : homeWon ? "▼" : "—"
                  return (
                    <span className="font-display text-[16px] leading-none" style={{ color: (awayWon || homeWon) ? "#00d4ff" : "#52525b" }}>
                      {triangle}
                    </span>
                  )
                })()}
              {isLive && game.clock && (
                <span className="text-[11px] font-medium" style={{ color: "var(--accent)" }}>{game.clock}</span>
              )}
              {game.venue?.city && (
                <span className="text-[11px] text-zinc-600 ml-auto">{game.venue.city}{game.venue.state ? `, ${game.venue.state}` : ""}</span>
              )}
            </div>
          )}
        </div>

        {/* ── Inline MLB line score — baseball only, live or final ── */}
        {(isLive || isFt) && game.sport === "baseball" && game.id && (
          <CompactBaseballLineScore
            gameId={game.id}
            league={game.league}
            seattleTeamId={game.seattleTeam.espnId}
            isLive={isLive}
          />
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
    <div
      className="mx-3 mt-4 mb-1 px-4 py-3 rounded-lg flex items-center gap-3"
      style={{
        background: "linear-gradient(135deg, rgba(0,212,255,0.1) 0%, rgba(0,212,255,0.04) 100%)",
        border: "1.5px solid rgba(0,212,255,0.25)",
      }}
    >
      {hasLive ? (
        <span className="relative flex h-3 w-3 flex-shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
          <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
        </span>
      ) : (
        <span className="relative flex h-3 w-3 flex-shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60" style={{ background: "var(--accent)" }} />
          <span className="relative inline-flex rounded-full h-3 w-3" style={{ background: "var(--accent)" }} />
        </span>
      )}
      <div className="flex-1 min-w-0">
        <div className="font-display text-[20px] font-800 uppercase tracking-tight leading-none" style={{ color: "var(--accent)" }}>
          Today
        </div>
        <div className="font-display text-[12px] text-zinc-500 mt-0.5">{dateLabel}</div>
      </div>
      <div
        className="flex-shrink-0 font-display text-[13px] font-700 px-3 py-1.5 rounded-full"
        style={{ background: "rgba(0,212,255,0.12)", color: "var(--accent)", border: "1px solid rgba(0,212,255,0.2)" }}
      >
        {gameCount} Game{gameCount !== 1 ? "s" : ""}
      </div>
    </div>
  )
}
