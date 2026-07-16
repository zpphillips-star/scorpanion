"use client"
import { useState } from "react"
import { Game } from "@/lib/types"
import { getTeamLogoUrl } from "@/lib/teams"
import TeamLogo from "./TeamLogo"
import BoxScore from "./BoxScore"
import TeamDetailSheet from "./TeamDetailSheet"
import UpcomingScheduleSection from "./UpcomingScheduleSection"

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
}
function formatRecord(r?: { wins: number; losses: number; ties?: number }): string {
  if (!r) return ""
  return r.ties ? `${r.wins}-${r.losses}-${r.ties}` : `${r.wins}-${r.losses}`
}

function getLiveDetail(game: Game): string {
  const p = game.period ? Number(game.period) : null
  const clk = game.clock
  if (game.sport === "baseball" && p) {
    const half = p % 2 === 1 ? "Top" : "Bot"
    const inn = Math.ceil(p / 2)
    return `${half} ${inn}${clk ? " · " + clk : ""}`
  }
  if (game.sport === "basketball" && p) return clk ? `Q${p}  ${clk}` : `Q${p}`
  if (game.sport === "hockey" && p) { const l = ["1st","2nd","3rd","OT"][p-1]||`P${p}`; return clk ? `${l}  ${clk}` : l }
  if (game.sport === "football" && p) { const l = ["1st","2nd","3rd","4th","OT"][p-1]||`Q${p}`; return clk ? `${l}  ${clk}` : l }
  if (game.sport === "soccer") return clk ? `${clk}′` : "Live"
  return clk || "Live"
}

export default function GameDetailSheet({ game, onClose }: { game: Game; onClose: () => void }) {
  const [teamSheet, setTeamSheet] = useState<{ id: string; name: string; logo: string } | null>(null)
  const isLive = game.status === "live"
  const isFt = game.status === "ft"
  const hasScore = (isLive || isFt) && game.seattleScore !== undefined && game.opponentScore !== undefined
  const seattleWon = hasScore && (game.seattleScore ?? 0) > (game.opponentScore ?? 0)
  const seattleLost = hasScore && (game.seattleScore ?? 0) < (game.opponentScore ?? 0)
  const color = game.seattleTeam.primaryColor
  const canShowBoxScore = (isLive || isFt) && !!game.id && game.league !== "whl" && game.league !== "pwhl"
  const seattleLogoUrl = getTeamLogoUrl(game.seattleTeam)
  const liveDetail = isLive ? getLiveDetail(game) : ""

  return (
    <>
      <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50" onClick={onClose} />
      <div
        className="fixed bottom-0 left-0 right-0 z-50 lg:max-w-3xl lg:mx-auto rounded-t-2xl overflow-hidden flex flex-col animate-slide-up"
        style={{ background: "#0f0f18", paddingBottom: "env(safe-area-inset-bottom)", maxHeight: "94dvh" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Fixed header */}
        <div className="relative bg-gradient-to-b from-[#0a1628] to-[#0f0f18] px-5 pt-4 pb-6 flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mb-4" />
          <button onClick={onClose} className="absolute top-4 right-5 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white text-sm hover:bg-white/20 transition-colors">✕</button>

          {/* Status + date row */}
          <div className="flex items-center gap-2 mb-4">
            {isLive ? (
              <span className="text-[11px] font-bold text-red-400 bg-red-500/10 px-2.5 py-0.5 rounded-full animate-pulse">● LIVE</span>
            ) : isFt ? (
              <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full">FINAL</span>
            ) : (
              <span className="text-[11px] text-zinc-400 bg-white/5 px-2.5 py-0.5 rounded-full">Upcoming</span>
            )}
            <span className="text-[11px] text-zinc-400 bg-white/5 px-2.5 py-0.5 rounded-full">{fmtDate(game.kickoff)}</span>
            {game.broadcast && <span className="text-[11px] text-zinc-500 bg-white/5 px-2.5 py-0.5 rounded-full">{game.broadcast}</span>}
          </div>

          {/* Live clock */}
          {isLive && liveDetail && (
            <div className="flex items-center justify-center mb-4">
              <span className="text-[14px] font-bold text-red-400 tracking-wide">{liveDetail}</span>
            </div>
          )}

          {/* Team logos + score */}
          <div className="flex items-center justify-between gap-4 mt-2">
            {/* Left = AWAY */}
            <button
              className="flex-1 flex flex-col items-center gap-2 active:scale-95 transition-transform"
              onClick={() => setTeamSheet(game.isHome ? { id: game.opponent.id, name: game.opponent.name, logo: game.opponent.logo } : { id: game.seattleTeam.espnId, name: game.seattleTeam.name, logo: seattleLogoUrl })}
            >
              <TeamLogo src={game.isHome ? game.opponent.logo : seattleLogoUrl} emoji={game.isHome ? "🏟️" : game.seattleTeam.emoji} abbr={game.isHome ? game.opponent.abbr : game.seattleTeam.abbr} size={64} />
              <span className="font-display text-[14px] font-semibold text-white text-center leading-tight">
                {game.isHome ? (game.opponent.shortName || game.opponent.name) : game.seattleTeam.shortName}
              </span>
            </button>

            {/* Score */}
            <div className="flex flex-col items-center gap-1 flex-shrink-0">
              {hasScore ? (
                <span className={`text-[44px] font-black tabular-nums leading-none ${isLive ? "text-red-400" : "text-white"}`}>
                  {game.isHome ? game.opponentScore : game.seattleScore}
                  <span className="text-zinc-500 text-[28px] mx-2">–</span>
                  {game.isHome ? game.seattleScore : game.opponentScore}
                </span>
              ) : (
                <div className="flex flex-col items-center gap-1">
                  <span className="text-[22px] font-bold text-zinc-500">vs</span>
                  <span className="text-[12px] text-zinc-500">{new Date(game.kickoff).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</span>
                </div>
              )}
            </div>

            {/* Right = HOME */}
            <button
              className="flex-1 flex flex-col items-center gap-2 active:scale-95 transition-transform"
              onClick={() => setTeamSheet(game.isHome ? { id: game.seattleTeam.espnId, name: game.seattleTeam.name, logo: seattleLogoUrl } : { id: game.opponent.id, name: game.opponent.name, logo: game.opponent.logo })}
            >
              <TeamLogo src={game.isHome ? seattleLogoUrl : game.opponent.logo} emoji={game.isHome ? game.seattleTeam.emoji : "🏟️"} abbr={game.isHome ? game.seattleTeam.abbr : game.opponent.abbr} size={64} />
              <span className="font-display text-[14px] font-semibold text-white text-center leading-tight">
                {game.isHome ? game.seattleTeam.shortName : (game.opponent.shortName || game.opponent.name)}
              </span>
            </button>
          </div>

          {/* Venue */}
          {game.venue?.city && (
            <div className="flex items-center justify-center gap-1.5 mt-4">
              <span className="text-sm">📍</span>
              <span className="text-[11px] text-zinc-500">{game.venue.name ? `${game.venue.name}, ` : ""}{game.venue.city}{game.venue.state ? `, ${game.venue.state}` : ""}</span>
            </div>
          )}
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-4 pt-5 pb-8">
          {canShowBoxScore && (
            <BoxScore
              eventId={game.id.includes("|") ? game.id.split("|")[1] : game.id}
              league={game.league}
              seattleTeamId={game.seattleTeam.espnId}
              color={isLive ? "#ef4444" : color}
            />
          )}

          {/* Season Records — flat, no card boxes */}
          {(game.seattleRecord || game.opponentRecord) && (
            <div className="mt-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="flex-1 h-px bg-zinc-800" />
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Season Records</span>
                <div className="flex-1 h-px bg-zinc-800" />
              </div>
              <div className="flex gap-4 items-start">
                {/* Away team record */}
                <div className="flex-1 flex flex-col items-center gap-1">
                  <div className="flex items-center gap-2 mb-1">
                    <TeamLogo src={game.isHome ? game.opponent.logo : seattleLogoUrl} emoji={game.isHome ? "🏟️" : game.seattleTeam.emoji} abbr={game.isHome ? game.opponent.abbr : game.seattleTeam.abbr} size={18} />
                    <span className="text-[12px] font-semibold text-white">{game.isHome ? (game.opponent.shortName || game.opponent.abbr) : game.seattleTeam.shortName}</span>
                  </div>
                  <span className="text-[28px] font-black text-white tabular-nums leading-none">
                    {(game.isHome ? game.opponentRecord : game.seattleRecord) ? `${(game.isHome ? game.opponentRecord : game.seattleRecord)!.wins}-${(game.isHome ? game.opponentRecord : game.seattleRecord)!.losses}` : "–"}
                  </span>
                </div>
                <div className="w-px bg-zinc-800 self-stretch" />
                {/* Home team record */}
                <div className="flex-1 flex flex-col items-center gap-1">
                  <div className="flex items-center gap-2 mb-1">
                    <TeamLogo src={game.isHome ? seattleLogoUrl : game.opponent.logo} emoji={game.isHome ? game.seattleTeam.emoji : "🏟️"} abbr={game.isHome ? game.seattleTeam.abbr : game.opponent.abbr} size={18} />
                    <span className="text-[12px] font-semibold text-white">{game.isHome ? game.seattleTeam.shortName : (game.opponent.shortName || game.opponent.abbr)}</span>
                  </div>
                  <span className="text-[28px] font-black text-white tabular-nums leading-none">
                    {(game.isHome ? game.seattleRecord : game.opponentRecord) ? `${(game.isHome ? game.seattleRecord : game.opponentRecord)!.wins}-${(game.isHome ? game.seattleRecord : game.opponentRecord)!.losses}` : "–"}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Upcoming Schedule */}
          <UpcomingScheduleSection game={game} />
        </div>{/* end scrollable body */}
      </div>{/* end sheet container */}

      {teamSheet && (
        <TeamDetailSheet
          teamId={teamSheet.id}
          teamName={teamSheet.name}
          teamLogo={teamSheet.logo}
          league={game.league}
          onClose={() => setTeamSheet(null)}
        />
      )}
    </>
  )
}
