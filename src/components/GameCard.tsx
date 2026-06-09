"use client"
import { useState } from "react"
import { Game } from "@/lib/types"
import { getTeamLogoUrl } from "@/lib/teams"
import TeamLogo from "./TeamLogo"

const PRO_TEAM_IDS = ["seahawks","mariners","kraken","sounders","storm","reign"]

function formatGameTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit",hour12:true,timeZoneName:"short"})
}
function formatGameDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"}).toUpperCase()
}
function formatRecord(r?: {wins:number;losses:number;ties?:number}): string {
  if (!r) return ""
  return r.ties ? `${r.wins}-${r.losses}-${r.ties}` : `${r.wins}-${r.losses}`
}

interface GameCardProps { game: Game }

export default function GameCard({ game }: GameCardProps) {
  const [open, setOpen] = useState(false)
  const isLive = game.status === "live"
  const isFt   = game.status === "ft"
  const isUp   = game.status === "upcoming"
  const hasScore = isLive || isFt
  const seattleLogoUrl = getTeamLogoUrl(game.seattleTeam)
  const seattleWon = isFt && game.seattleScore !== undefined && game.opponentScore !== undefined && game.seattleScore > game.opponentScore
  const seattleLost = isFt && game.seattleScore !== undefined && game.opponentScore !== undefined && game.seattleScore < game.opponentScore
  const seattleColor = game.seattleTeam.primaryColor

  return (
    <>
      {/* ── Compact row card ─────────────────────────────────────────────── */}
      <button
        className="w-full text-left group"
        onClick={() => setOpen(true)}
      >
        <div
          className="mx-3 my-1 rounded-2xl overflow-hidden transition-all duration-150 active:scale-[0.985]"
          style={{
            background: isLive
              ? "linear-gradient(135deg,rgba(239,68,68,0.08) 0%,var(--surface) 60%)"
              : "var(--surface)",
            border: `1px solid ${isLive ? "rgba(239,68,68,0.25)" : "var(--border)"}`,
          }}
        >
          {/* Status bar */}
          <div className="flex items-center justify-between px-4 pt-3 pb-1">
            {isLive ? (
              <div className="flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                </span>
                <span className="font-display text-[11px] font-700 text-red-400 uppercase tracking-widest">Live</span>
              </div>
            ) : isFt ? (
              <span className="font-display text-[11px] font-600 text-zinc-500 uppercase tracking-widest">Final</span>
            ) : (
              <span className="font-display text-[11px] font-600 text-zinc-500 uppercase tracking-widest">{formatGameDate(game.kickoff)}</span>
            )}
            <div className="flex items-center gap-2">
              {game.broadcast && (
                <span className="text-[10px] font-semibold text-zinc-500 bg-white/5 px-1.5 py-0.5 rounded">{game.broadcast}</span>
              )}
              <svg className="w-3.5 h-3.5 text-zinc-600 group-hover:text-zinc-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>

          {/* Main matchup row */}
          <div className="flex items-center px-4 pb-3 gap-3">
            {/* Seattle side */}
            <div className="flex-1 flex items-center gap-2.5 min-w-0">
              <div className="relative flex-shrink-0">
                <TeamLogo src={seattleLogoUrl} emoji={game.seattleTeam.emoji} abbr={game.seattleTeam.abbr} size={38} />
              </div>
              <div className="min-w-0">
                <div className={`font-display text-[16px] font-700 leading-tight truncate ${
                  seattleLost ? "text-zinc-400" : "text-white"
                }`}>
                  {game.seattleTeam.shortName}
                </div>
                {game.seattleRecord && (
                  <div className="text-[11px] text-zinc-500 leading-none mt-0.5">{formatRecord(game.seattleRecord)}</div>
                )}
              </div>
            </div>

            {/* Score / VS center */}
            <div className="flex flex-col items-center justify-center min-w-[72px] flex-shrink-0">
              {hasScore ? (
                <div className={`font-display text-[22px] font-800 tabular-nums leading-none ${
                  isLive ? "text-white" : isFt ? "text-white" : "text-zinc-300"
                }`}>
                  {game.seattleScore}<span className="text-zinc-500 mx-1">-</span>{game.opponentScore}
                </div>
              ) : (
                <>
                  <div className="font-display text-[13px] font-600 text-zinc-500 uppercase tracking-widest">vs</div>
                  <div className="font-display text-[13px] font-700 text-white mt-0.5">{formatGameTime(game.kickoff)}</div>
                </>
              )}
              {isFt && seattleWon && <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider mt-1">W</span>}
              {isFt && seattleLost && <span className="text-[9px] font-bold text-red-400 uppercase tracking-wider mt-1">L</span>}
            </div>

            {/* Opponent side */}
            <div className="flex-1 flex items-center justify-end gap-2.5 min-w-0">
              <div className="min-w-0 text-right">
                <div className={`font-display text-[16px] font-700 leading-tight truncate ${
                  seattleWon ? "text-zinc-400" : "text-white"
                }`}>
                  {game.opponent.shortName || game.opponent.name}
                </div>
                {game.opponentRecord && (
                  <div className="text-[11px] text-zinc-500 leading-none mt-0.5 text-right">{formatRecord(game.opponentRecord)}</div>
                )}
              </div>
              <div className="relative flex-shrink-0">
                <TeamLogo src={game.opponent.logo} emoji="🏟️" abbr={game.opponent.abbr} size={38} />
              </div>
            </div>
          </div>

          {/* Bottom accent bar for Seattle team color */}
          <div className="h-0.5 w-full" style={{ background: `linear-gradient(to right, ${seattleColor}88, ${seattleColor}22, transparent)` }} />
        </div>
      </button>

      {/* ── Detail slide-up sheet ─────────────────────────────────────────── */}
      {open && (
        <>
          <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-40" onClick={() => setOpen(false)} />
          <div
            className="fixed bottom-0 left-0 right-0 z-50 lg:max-w-2xl lg:mx-auto rounded-t-3xl overflow-hidden animate-slide-up"
            style={{ background: "var(--surface)", paddingBottom: "env(safe-area-inset-bottom)" }}
            onClick={e => e.stopPropagation()}
          >
            {/* Drag handle */}
            <div className="w-10 h-1 rounded-full bg-white/15 mx-auto mt-3 mb-1" />

            {/* Sheet header — team colors gradient */}
            <div
              className="relative px-5 pt-3 pb-6"
              style={{ background: `linear-gradient(135deg, ${seattleColor}40 0%, ${game.seattleTeam.secondaryColor}18 50%, transparent 100%)` }}
            >
              <button
                onClick={() => setOpen(false)}
                className="absolute top-3 right-4 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white text-sm hover:bg-white/20 transition-colors"
              >✕</button>

              {/* Status */}
              <div className="flex items-center gap-2 mb-4">
                {isLive && (
                  <span className="flex items-center gap-1.5 text-[11px] font-bold text-red-400 bg-red-500/10 border border-red-500/20 px-2.5 py-1 rounded-full uppercase tracking-wider">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />Live
                  </span>
                )}
                {isFt && <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full uppercase tracking-wider">Final</span>}
                {isUp && <span className="text-[11px] font-medium text-zinc-400 bg-white/5 px-2.5 py-1 rounded-full">{formatGameDate(game.kickoff)}</span>}
                {game.broadcast && (
                  <span className="text-[11px] font-semibold text-zinc-400 bg-white/5 px-2.5 py-1 rounded-full">{game.broadcast}</span>
                )}
              </div>

              {/* Big face-off */}
              <div className="flex items-center justify-between gap-4">
                {/* Seattle */}
                <div className="flex-1 flex flex-col items-center gap-2">
                  <TeamLogo src={seattleLogoUrl} emoji={game.seattleTeam.emoji} abbr={game.seattleTeam.abbr} size={56} />
                  <div>
                    <div className="font-display text-[15px] font-700 text-white text-center leading-tight">{game.seattleTeam.shortName}</div>
                    {game.seattleRecord && <div className="text-[11px] text-zinc-500 text-center">{formatRecord(game.seattleRecord)}</div>}
                  </div>
                </div>

                {/* Score center */}
                <div className="flex flex-col items-center gap-1 min-w-[100px]">
                  {hasScore ? (
                    <div className={`font-display font-800 tabular-nums leading-none text-[40px] ${isLive ? "text-white" : "text-white"}`}>
                      {game.seattleScore}<span className="text-zinc-600 mx-1 text-[28px]">-</span>{game.opponentScore}
                    </div>
                  ) : (
                    <>
                      <div className="font-display text-[28px] font-700 text-zinc-500">vs</div>
                      <div className="font-display text-[15px] font-700 text-white text-center leading-tight">{formatGameTime(game.kickoff)}</div>
                    </>
                  )}
                  {game.isHome ? (
                    <span className="text-[9px] uppercase tracking-widest font-bold text-zinc-600">Home</span>
                  ) : (
                    <span className="text-[9px] uppercase tracking-widest font-bold text-zinc-600">Away</span>
                  )}
                </div>

                {/* Opponent */}
                <div className="flex-1 flex flex-col items-center gap-2">
                  <TeamLogo src={game.opponent.logo} emoji="🏟️" abbr={game.opponent.abbr} size={56} />
                  <div>
                    <div className="font-display text-[15px] font-700 text-white text-center leading-tight">{game.opponent.shortName || game.opponent.name}</div>
                    {game.opponentRecord && <div className="text-[11px] text-zinc-500 text-center">{formatRecord(game.opponentRecord)}</div>}
                  </div>
                </div>
              </div>
            </div>

            {/* Details */}
            <div className="px-5 py-4 space-y-3 border-t border-white/5">
              {game.venue?.name && (
                <div className="flex items-center gap-2.5 text-zinc-400 text-sm">
                  <span className="text-base">📍</span>
                  <span>{game.venue.name}{game.venue.city ? `, ${game.venue.city}` : ""}{game.venue.state ? `, ${game.venue.state}` : ""}</span>
                </div>
              )}
              <div className="flex items-center gap-2.5 text-zinc-400 text-sm">
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: seattleColor }} />
                <span className="capitalize">{game.sport} · <span className="uppercase text-[11px] tracking-wider">{game.league}</span></span>
              </div>
              {isUp && (
                <div className="flex items-center gap-2.5 text-zinc-300 text-sm">
                  <span className="text-base">🕐</span>
                  <span>{formatGameTime(game.kickoff)}</span>
                </div>
              )}
              {PRO_TEAM_IDS.includes(game.seattleTeamId) && isUp && (
                <a
                  href={`https://gametime.com/search?q=${encodeURIComponent(game.seattleTeam.name)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={e => e.stopPropagation()}
                  className="flex items-center gap-2.5 text-[#00d4ff] text-sm font-semibold hover:underline"
                >
                  <span className="text-base">🎟</span>
                  <span>Buy tickets on Gametime</span>
                </a>
              )}
            </div>
          </div>
        </>
      )}
    </>
  )
}
