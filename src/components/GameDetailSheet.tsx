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

export default function GameDetailSheet({ game, onClose }: { game: Game; onClose: () => void }) {
  const [teamSheet, setTeamSheet] = useState<{ id: string; name: string; logo: string } | null>(null)
  const seattleWon = (game.seattleScore ?? 0) > (game.opponentScore ?? 0)
  const seattleLost = (game.seattleScore ?? 0) < (game.opponentScore ?? 0)
  const color = game.seattleTeam.primaryColor
  const canShowBoxScore = !!game.id && game.league !== "whl" && game.league !== "pwhl"
  const seattleLogoUrl = getTeamLogoUrl(game.seattleTeam)

  return (
    <>
      <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50" onClick={onClose} />
      <div
        className="fixed bottom-0 left-0 right-0 z-50 lg:max-w-2xl lg:mx-auto rounded-t-3xl overflow-y-auto animate-slide-up"
        style={{ background: "var(--surface)", paddingBottom: "env(safe-area-inset-bottom)", maxHeight: "88dvh" }}
        onClick={e => e.stopPropagation()}
      >
        <div className="w-10 h-1 rounded-full bg-white/15 mx-auto mt-3 mb-2 flex-shrink-0" />

        {/* SECTION 1: SCOREBOARD */}
        <div
          className="relative px-5 pt-2 pb-5"
          style={{ background: `linear-gradient(160deg, ${color}35 0%, ${game.seattleTeam.secondaryColor}15 60%, transparent 100%)` }}
        >
          <button onClick={onClose} className="absolute top-2 right-4 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white text-sm">✕</button>

          <div className="flex items-center gap-2 mb-3">
            <span className="font-display text-[11px] font-700 text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full uppercase tracking-wider">Final</span>
            <span className="text-[11px] text-zinc-400 bg-white/5 px-2.5 py-1 rounded-full">{fmtDate(game.kickoff)}</span>
            {game.broadcast && <span className="text-[11px] text-zinc-400 bg-white/5 px-2.5 py-1 rounded-full">{game.broadcast}</span>}
            {game.venue?.city && <span className="text-[11px] text-zinc-500 ml-auto">📍 {game.venue.city}</span>}
          </div>

          <div className="flex items-center justify-between gap-3">
            <button
              className="flex-1 flex flex-col items-center gap-1.5 active:scale-95 transition-transform"
              onClick={() => { onClose(); setTeamSheet({ id: game.seattleTeam.espnId, name: game.seattleTeam.name, logo: seattleLogoUrl }) }}
            >
              <TeamLogo src={seattleLogoUrl} emoji={game.seattleTeam.emoji} abbr={game.seattleTeam.abbr} size={60} />
              <span className={`font-display text-[15px] font-700 text-center leading-tight ${seattleLost ? "text-zinc-400" : "text-white"}`}>{game.seattleTeam.shortName}</span>
              {game.seattleRecord && <span className="font-display text-[14px] font-700 text-zinc-300 tabular-nums">{formatRecord(game.seattleRecord)}</span>}
              <span className="text-[10px] uppercase tracking-widest text-zinc-600">{game.isHome ? "Home" : "Away"}</span>
            </button>

            <div className="flex flex-col items-center gap-0.5 flex-shrink-0">
              <div className="font-display font-800 tabular-nums text-[48px] leading-none text-white">
                <span className={seattleLost ? "text-zinc-400" : ""}>{game.seattleScore}</span>
                <span className="text-zinc-600 text-[32px] mx-1.5">–</span>
                <span className={seattleWon ? "text-zinc-400" : ""}>{game.opponentScore}</span>
              </div>
              <span className={`font-display text-[13px] font-800 uppercase tracking-widest ${seattleWon ? "text-emerald-400" : seattleLost ? "text-red-400" : "text-zinc-500"}`}>
                {seattleWon ? "Win" : seattleLost ? "Loss" : "Tie"}
              </span>
            </div>

            <button
              className="flex-1 flex flex-col items-center gap-1.5 active:scale-95 transition-transform"
              onClick={() => { onClose(); setTeamSheet({ id: game.opponent.id, name: game.opponent.name, logo: game.opponent.logo }) }}
            >
              <TeamLogo src={game.opponent.logo} emoji="🏟️" abbr={game.opponent.abbr} size={60} />
              <span className={`font-display text-[15px] font-700 text-center leading-tight ${seattleWon ? "text-zinc-400" : "text-white"}`}>{game.opponent.shortName || game.opponent.name}</span>
              {game.opponentRecord && <span className="font-display text-[14px] font-700 text-zinc-300 tabular-nums">{formatRecord(game.opponentRecord)}</span>}
              <span className="text-[10px] uppercase tracking-widest text-zinc-600">{game.isHome ? "Away" : "Home"}</span>
            </button>
          </div>

          {canShowBoxScore && (
            <div className="mt-4">
              <BoxScore eventId={game.id} league={game.league} seattleTeamId={game.seattleTeam.espnId} color={color} />
            </div>
          )}
        </div>

        {/* SECTION 2: TEAM RECORDS */}
        {(game.seattleRecord || game.opponentRecord) && (
          <div className="px-4 py-4 border-t border-white/5">
            <div className="font-display text-[13px] font-700 uppercase tracking-widest text-zinc-400 mb-3">Season Records</div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl px-4 py-3" style={{ background: `${color}18`, border: `1px solid ${color}35` }}>
                <div className="flex items-center gap-2 mb-2">
                  <TeamLogo src={seattleLogoUrl} emoji={game.seattleTeam.emoji} abbr={game.seattleTeam.abbr} size={22} />
                  <span className="font-display text-[12px] font-700 text-white truncate">{game.seattleTeam.shortName}</span>
                </div>
                <div className="font-display text-[28px] font-800 text-white tabular-nums leading-none">
                  {game.seattleRecord ? `${game.seattleRecord.wins}-${game.seattleRecord.losses}` : "–"}
                </div>
                {game.seattleRecord && (
                  <div className="text-[10px] text-zinc-500 mt-1">
                    {((game.seattleRecord.wins / Math.max(game.seattleRecord.wins + game.seattleRecord.losses, 1)) * 100).toFixed(1)}% win rate
                  </div>
                )}
              </div>
              <div className="rounded-2xl px-4 py-3" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
                <div className="flex items-center gap-2 mb-2">
                  <TeamLogo src={game.opponent.logo} emoji="🏟️" abbr={game.opponent.abbr} size={22} />
                  <span className="font-display text-[12px] font-700 text-zinc-300 truncate">{game.opponent.shortName || game.opponent.abbr}</span>
                </div>
                <div className="font-display text-[28px] font-800 text-zinc-300 tabular-nums leading-none">
                  {game.opponentRecord ? `${game.opponentRecord.wins}-${game.opponentRecord.losses}` : "–"}
                </div>
                {game.opponentRecord && (
                  <div className="text-[10px] text-zinc-500 mt-1">
                    {((game.opponentRecord.wins / Math.max(game.opponentRecord.wins + game.opponentRecord.losses, 1)) * 100).toFixed(1)}% win rate
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* SECTION 3: UPCOMING SCHEDULE — both teams side by side */}
        <UpcomingScheduleSection game={game} />
      </div>

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
