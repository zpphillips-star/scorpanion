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
        className="mx-3 my-1.5 rounded-2xl overflow-hidden"
        style={{
          background: "var(--surface)",
          border: `1.5px solid ${color}40`,
        }}
      >
        {/* Thin top color bar only */}
        <div className="h-1 w-full" style={{ background: `linear-gradient(to right, ${color}, ${color}44, transparent)` }} />

        <div className="px-4 pt-3 pb-4">
          {/* Status + meta — one clean row */}
          <div className="flex items-center gap-2 mb-3">
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

          {/* Main face-off */}
          <div className="flex items-center gap-2">
            {/* Seattle */}
            <div className="flex-1 flex flex-col items-center gap-2">
              <TeamLogo src={seattleLogoUrl} emoji={game.seattleTeam.emoji} abbr={game.seattleTeam.abbr} size={68} />
              <div className={`font-display text-[16px] font-700 text-center leading-tight ${seattleLost ? "text-zinc-500" : "text-white"}`}>
                {game.seattleTeam.shortName}
              </div>
              {game.seattleRecord && (
                <div className="font-display text-[11px] text-zinc-600">{formatRecord(game.seattleRecord)}</div>
              )}
            </div>

            {/* Score / VS */}
            <div className="flex flex-col items-center gap-1 flex-shrink-0 min-w-[90px]">
              {hasScore ? (
                <>
                  <div className="font-display font-800 tabular-nums leading-none text-white" style={{ fontSize: "46px" }}>
                    {game.seattleScore}<span className="text-zinc-600 mx-1" style={{ fontSize: "32px" }}>–</span>{game.opponentScore}
                  </div>
                  {isFt && (
                    <span className={`font-display text-[13px] font-800 uppercase tracking-widest mt-0.5 ${seattleWon ? "text-emerald-400" : seattleLost ? "text-red-400" : "text-zinc-500"}`}>
                      {seattleWon ? "Win" : seattleLost ? "Loss" : "Tie"}
                    </span>
                  )}
                </>
              ) : (
                <>
                  <span className="font-display text-[13px] font-600 text-zinc-600 uppercase tracking-widest">vs</span>
                  <span className="font-display text-[20px] font-800 text-white text-center">{formatTime(game.kickoff)}</span>
                </>
              )}
            </div>

            {/* Opponent */}
            <div className="flex-1 flex flex-col items-center gap-2">
              <TeamLogo src={game.opponent.logo} emoji="🏟️" abbr={game.opponent.abbr} size={68} />
              <div className={`font-display text-[16px] font-700 text-center leading-tight ${seattleWon ? "text-zinc-500" : "text-white"}`}>
                {game.opponent.shortName || game.opponent.name}
              </div>
              {game.opponentRecord && (
                <div className="font-display text-[11px] text-zinc-600">{formatRecord(game.opponentRecord)}</div>
              )}
            </div>
          </div>

          {/* Venue — subtle, one line at bottom */}
          {game.venue?.name && (
            <div className="mt-3 pt-3 border-t border-white/5 text-[11px] text-zinc-600 text-center truncate">
              📍 {game.venue.name}{game.venue.city ? `, ${game.venue.city}` : ""}
              {PRO_TEAM_IDS.includes(game.seattleTeamId) && isUp && (
                <a
                  href={`https://gametime.com/search?q=${encodeURIComponent(game.seattleTeam.name)}`}
                  target="_blank" rel="noopener noreferrer"
                  onClick={e => e.stopPropagation()}
                  className="ml-3 font-700 underline"
                  style={{ color }}
                >
                  Tickets
                </a>
              )}
            </div>
          )}
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
