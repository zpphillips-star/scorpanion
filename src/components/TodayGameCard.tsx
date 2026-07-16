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
  const isFt = game.status === "ft"
  const isUp = game.status === "upcoming"
  const hasScore = isLive || isFt
  const seattleLogoUrl = getTeamLogoUrl(game.seattleTeam)
  const hasScores = game.seattleScore !== undefined && game.opponentScore !== undefined
  const seattleWon = isFt && hasScores && game.seattleScore! > game.opponentScore!
  const seattleLost = isFt && hasScores && game.seattleScore! < game.opponentScore!
  const color = game.seattleTeam.primaryColor

  return (
    <>
      <div
        className="mx-3 my-1.5 rounded-lg overflow-hidden cursor-pointer active:scale-[0.985] transition-transform"
        style={{ background: "var(--surface)", border: `1.5px solid ${color}40` }}
        onClick={() => setShowDetail(true)}
      >
        <div className="h-1 w-full" style={{ background: `linear-gradient(to right, ${color}, ${color}44, transparent)` }} />
        <div className="px-4 pt-3 pb-3">
          {/* Status row */}
          <div className="flex items-center gap-2 mb-2.5">
            {isLive ? (
              <div className="flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                </span>
                <span className="font-display text-[11px] font-800 text-red-400 uppercase tracking-widest">Live</span>
              </div>
            ) : isFt ? (
              <span className="font-display text-[11px] font-700 text-emerald-400 uppercase tracking-widest">Final</span>
            ) : (
              <span className="font-display text-[11px] font-700 uppercase tracking-widest" style={{ color }}>Today</span>
            )}
            <span className="text-zinc-700">·</span>
            <span className="font-display text-[11px] text-zinc-500 uppercase tracking-wide">{game.isHome ? "Home" : "Away"}</span>
            {game.broadcast && <span className="font-display text-[11px] text-zinc-600 ml-auto">{game.broadcast}</span>}
          </div>

          {/* Face-off — AWAY on left, HOME on right */}
          <div className="flex items-center gap-2">
            {/* Left = AWAY */}
            <div className="flex-1 flex flex-col items-center gap-1.5">
              <button
                className="flex flex-col items-center gap-1.5 active:scale-90 transition-transform"
                onClick={e => { e.stopPropagation(); setTeamSheet(game.isHome ? { id: game.opponent.id, name: game.opponent.name, logo: game.opponent.logo } : { id: game.seattleTeam.espnId, name: game.seattleTeam.name, logo: seattleLogoUrl }) }}
              >
                <TeamLogo src={game.isHome ? game.opponent.logo : seattleLogoUrl} emoji={game.isHome ? "🏟️" : game.seattleTeam.emoji} abbr={game.isHome ? game.opponent.abbr : game.seattleTeam.abbr} size={56} />
                <div className={`font-display text-[14px] font-700 text-center ${game.isHome ? (seattleWon ? "text-zinc-500" : "text-white") : (seattleLost ? "text-zinc-500" : "text-white")}`}>
                  {game.isHome ? (game.opponent.shortName || game.opponent.name) : game.seattleTeam.shortName}
                </div>
              </button>
              {(game.isHome ? game.opponentRecord : game.seattleRecord) && (
                <div className="font-display text-[10px] text-zinc-600">{formatRecord(game.isHome ? game.opponentRecord : game.seattleRecord)}</div>
              )}
            </div>

            <div className="flex flex-col items-center gap-0.5 flex-shrink-0 min-w-[100px]">
              {hasScore ? (
                <>
                  <div className="font-display font-800 tabular-nums leading-none text-white flex items-baseline gap-2" style={{ fontSize: "40px" }}>
                    <span className={game.isHome ? (seattleWon ? "text-zinc-400" : "") : (seattleLost ? "text-zinc-400" : "")}>{game.isHome ? game.opponentScore : game.seattleScore}</span>
                    <span className="text-zinc-600" style={{ fontSize: "26px" }}>–</span>
                    <span className={game.isHome ? (seattleLost ? "text-zinc-400" : "") : (seattleWon ? "text-zinc-400" : "")}>{game.isHome ? game.seattleScore : game.opponentScore}</span>
                  </div>
                  {isFt && (
                    <span className={`font-display text-[12px] font-800 uppercase tracking-widest mt-0.5 ${seattleWon ? "text-emerald-400" : seattleLost ? "text-red-400" : "text-zinc-500"}`}>
                      {seattleWon ? "Win" : seattleLost ? "Loss" : "Tie"}
                    </span>
                  )}
                </>
              ) : (
                <>
                  <span className="font-display text-[13px] font-600 text-zinc-600 uppercase tracking-widest">vs</span>
                  <span className="font-display text-[18px] font-800 text-white text-center">{formatTime(game.kickoff)}</span>
                </>
              )}
            </div>

            {/* Right = HOME */}
            <div className="flex-1 flex flex-col items-center gap-1.5">
              <button
                className="flex flex-col items-center gap-1.5 active:scale-90 transition-transform"
                onClick={e => { e.stopPropagation(); setTeamSheet(game.isHome ? { id: game.seattleTeam.espnId, name: game.seattleTeam.name, logo: seattleLogoUrl } : { id: game.opponent.id, name: game.opponent.name, logo: game.opponent.logo }) }}
              >
                <TeamLogo src={game.isHome ? seattleLogoUrl : game.opponent.logo} emoji={game.isHome ? game.seattleTeam.emoji : "🏟️"} abbr={game.isHome ? game.seattleTeam.abbr : game.opponent.abbr} size={56} />
                <div className={`font-display text-[14px] font-700 text-center ${game.isHome ? (seattleLost ? "text-zinc-500" : "text-white") : (seattleWon ? "text-zinc-500" : "text-white")}`}>
                  {game.isHome ? game.seattleTeam.shortName : (game.opponent.shortName || game.opponent.name)}
                </div>
              </button>
              {(game.isHome ? game.seattleRecord : game.opponentRecord) && (
                <div className="font-display text-[10px] text-zinc-600">{formatRecord(game.isHome ? game.seattleRecord : game.opponentRecord)}</div>
              )}
            </div>
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
      </div>

      {/* Detail sheet slides up — card stays in place */}
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
