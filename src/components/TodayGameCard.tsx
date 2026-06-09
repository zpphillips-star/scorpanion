"use client"
import { useState } from "react"
import { Game } from "@/lib/types"
import { getTeamLogoUrl } from "@/lib/teams"
import TeamLogo from "./TeamLogo"
import GameCard from "./GameCard"

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true, timeZoneName: "short" })
}
function formatRecord(r?: { wins: number; losses: number; ties?: number }): string {
  if (!r) return ""
  return r.ties ? `${r.wins}-${r.losses}-${r.ties}` : `${r.wins}-${r.losses}`
}

const PRO_TEAM_IDS = ["seahawks", "mariners", "kraken", "sounders", "storm", "reign"]

/** Full-width featured card for today's games — much larger than standard GameCard */
export function TodayGameCard({ game }: { game: Game }) {
  const [open, setOpen] = useState(false)

  const isLive = game.status === "live"
  const isFt = game.status === "ft"
  const isUp = game.status === "upcoming"
  const hasScore = isLive || isFt
  const seattleLogoUrl = getTeamLogoUrl(game.seattleTeam)
  const seattleWon = isFt && (game.seattleScore ?? 0) > (game.opponentScore ?? 0)
  const seattleLost = isFt && (game.seattleScore ?? 0) < (game.opponentScore ?? 0)
  const color = game.seattleTeam.primaryColor
  const sec = game.seattleTeam.secondaryColor

  // When detail opens, use the existing GameCard's internal sheet
  // We render a hidden GameCard to delegate opening
  if (open) {
    return (
      <div className="mx-3 mt-1 mb-2">
        {/* Render full GameCard which handles the detail sheet */}
        <GameCard game={game} />
      </div>
    )
  }

  return (
    <button
      className="w-full text-left active:scale-[0.985] transition-transform"
      onClick={() => setOpen(true)}
    >
      <div
        className="mx-3 my-1.5 rounded-3xl overflow-hidden"
        style={{
          background: `linear-gradient(145deg, ${color}30 0%, ${sec}18 45%, rgba(20,20,30,0.95) 100%)`,
          border: `1.5px solid ${color}50`,
          boxShadow: `0 4px 32px ${color}25, 0 0 0 0.5px ${color}20`,
        }}
      >
        {/* Top color bar — thicker than standard card */}
        <div className="h-1.5 w-full" style={{ background: `linear-gradient(to right, ${color}, ${sec}66, transparent)` }} />

        <div className="px-5 pt-4 pb-5">
          {/* Status row */}
          <div className="flex items-center gap-2 mb-4">
            {isLive ? (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)" }}>
                <span className="relative flex h-2 w-2 flex-shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                </span>
                <span className="font-display text-[12px] font-800 text-red-400 uppercase tracking-widest">Live Now</span>
              </div>
            ) : isFt ? (
              <span className="font-display text-[11px] font-700 text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full uppercase tracking-widest">Final</span>
            ) : (
              <span className="font-display text-[11px] font-700 uppercase tracking-widest px-3 py-1 rounded-full" style={{ background: `${color}20`, color, border: `1px solid ${color}35` }}>
                Today
              </span>
            )}
            {game.broadcast && (
              <span className="font-display text-[11px] text-zinc-500 bg-white/5 px-2.5 py-1 rounded-full">{game.broadcast}</span>
            )}
            <span className="ml-auto font-display text-[11px] text-zinc-600 uppercase tracking-wide">{game.isHome ? "Home" : "Away"}</span>
          </div>

          {/* Main face-off — LARGE */}
          <div className="flex items-center gap-2">
            {/* Seattle side */}
            <div className="flex-1 flex flex-col items-center gap-2">
              <div className="relative">
                <TeamLogo src={seattleLogoUrl} emoji={game.seattleTeam.emoji} abbr={game.seattleTeam.abbr} size={72} />
                {isLive && (
                  <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-red-500 border-2 border-[#08080f] animate-pulse" />
                )}
              </div>
              <div className="text-center">
                <div className={`font-display text-[18px] font-800 leading-tight ${seattleLost ? "text-zinc-400" : "text-white"}`}>
                  {game.seattleTeam.shortName}
                </div>
                {game.seattleRecord && (
                  <div className="font-display text-[12px] text-zinc-500">{formatRecord(game.seattleRecord)}</div>
                )}
              </div>
            </div>

            {/* Score / VS center */}
            <div className="flex flex-col items-center gap-1 flex-shrink-0 min-w-[100px]">
              {hasScore ? (
                <>
                  <div className="font-display font-800 tabular-nums leading-none text-white" style={{ fontSize: "52px" }}>
                    {game.seattleScore}<span className="text-zinc-600 mx-1" style={{ fontSize: "36px" }}>–</span>{game.opponentScore}
                  </div>
                  {isFt && (
                    <span className={`font-display text-[14px] font-800 uppercase tracking-widest ${seattleWon ? "text-emerald-400" : seattleLost ? "text-red-400" : "text-zinc-500"}`}>
                      {seattleWon ? "Win" : seattleLost ? "Loss" : "Tie"}
                    </span>
                  )}
                </>
              ) : (
                <>
                  <span className="font-display text-[16px] font-600 text-zinc-600 uppercase tracking-widest">vs</span>
                  <span className="font-display text-[22px] font-800 text-white text-center leading-tight">{formatTime(game.kickoff)}</span>
                </>
              )}
            </div>

            {/* Opponent side */}
            <div className="flex-1 flex flex-col items-center gap-2">
              <TeamLogo src={game.opponent.logo} emoji="🏟️" abbr={game.opponent.abbr} size={72} />
              <div className="text-center">
                <div className={`font-display text-[18px] font-800 leading-tight ${seattleWon ? "text-zinc-400" : "text-white"}`}>
                  {game.opponent.shortName || game.opponent.name}
                </div>
                {game.opponentRecord && (
                  <div className="font-display text-[12px] text-zinc-500">{formatRecord(game.opponentRecord)}</div>
                )}
              </div>
            </div>
          </div>

          {/* Venue + buy tickets row */}
          <div className="flex items-center gap-3 mt-4 pt-3.5" style={{ borderTop: `1px solid ${color}20` }}>
            {game.venue?.name && (
              <span className="text-[11px] text-zinc-600 truncate flex-1">
                📍 {game.venue.name}{game.venue.city ? `, ${game.venue.city}` : ""}
              </span>
            )}
            {PRO_TEAM_IDS.includes(game.seattleTeamId) && isUp && (
              <a
                href={`https://gametime.com/search?q=${encodeURIComponent(game.seattleTeam.name)}`}
                target="_blank" rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full font-display text-[11px] font-700 uppercase tracking-wide text-white transition-transform active:scale-95"
                style={{ background: `${color}35`, border: `1px solid ${color}55` }}
              >
                🎟 Tickets
              </a>
            )}
            <span className="flex-shrink-0 font-display text-[10px] text-zinc-600 uppercase tracking-wider">Tap for details ›</span>
          </div>
        </div>
      </div>
    </button>
  )
}

/** Today section header banner */
export function TodayBanner({ gameCount, hasLive }: { gameCount: number; hasLive: boolean }) {
  const today = new Date()
  const dateLabel = today.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })

  return (
    <div
      className="mx-3 mt-4 mb-1 px-4 py-3 rounded-2xl flex items-center gap-3"
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
