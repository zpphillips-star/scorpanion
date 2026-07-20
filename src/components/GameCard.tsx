"use client"
import React, { useState, useEffect } from "react"
import { Game } from "@/lib/types"
import { getTeamLogoUrl } from "@/lib/teams"
import TeamLogo from "./TeamLogo"
import BoxScore from "./BoxScore"
import CompactBaseballLineScore from "./CompactBaseballLineScore"
import TeamDetailSheet from "./TeamDetailSheet"

const PRO_TEAM_IDS = ["seahawks","mariners","kraken","sounders","storm","reign"]

const STANDINGS_LEAGUE: Record<string, string> = {
  mlb: "mlb", nfl: "nfl", nhl: "nhl", wnba: "wnba", "usa.1": "mls", mls: "mls",
}

function formatGameTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit",hour12:true,timeZoneName:"short"})
}
function formatGameDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"}).toUpperCase()
}
function formatRecord(r?: {wins:number;losses:number;ties?:number}): string {
  if (!r) return "–"
  return r.ties ? `${r.wins}-${r.losses}-${r.ties}` : `${r.wins}-${r.losses}`
}

interface StandingsRow { teamId: string; abbr: string; logo: string; wins: number; losses: number; winPct: number; isSeattle: boolean }
interface Division { name: string; entries: StandingsRow[] }

interface GameCardProps { game: Game }

export default function GameCard({ game }: GameCardProps) {
  const [open, setOpen] = useState(false)
  const [teamSheet, setTeamSheet] = useState<{ id: string; name: string; logo: string } | null>(null)
  const [standings, setStandings] = useState<Division[]>([])

  const isLive = game.status === "live"
  const isFt   = game.status === "ft"
  const isUp   = game.status === "upcoming"
  const hasScore = isLive || isFt
  const seattleLogoUrl = getTeamLogoUrl(game.seattleTeam)
  const seattleWon = isFt && game.seattleScore !== undefined && game.opponentScore !== undefined && game.seattleScore > game.opponentScore
  const seattleLost = isFt && game.seattleScore !== undefined && game.opponentScore !== undefined && game.seattleScore < game.opponentScore
  const seattleColor = game.seattleTeam.primaryColor
  const canShowBoxScore = (isLive || isFt) && !!game.id && game.league !== "whl" && game.league !== "pwhl"

  // Fetch standings when sheet opens
  useEffect(() => {
    if (!open) return
    const leagueKey = STANDINGS_LEAGUE[game.league]
    if (!leagueKey) return
    fetch(`/api/standings?league=${leagueKey}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.divisions) setStandings(d.divisions) })
      .catch(() => {})
  }, [open, game.league])

  const seattleDivision = standings.find(div => div.entries.some(e => e.isSeattle))

  // Resolve away / home sides for compact card
  const gcAwayLogo   = game.isHome ? game.opponent.logo  : seattleLogoUrl
  const gcAwayEmoji  = game.isHome ? "🏟️"               : game.seattleTeam.emoji
  const gcAwayAbbr   = game.isHome ? game.opponent.abbr  : game.seattleTeam.abbr
  const gcAwayName   = game.isHome ? (game.opponent.shortName || game.opponent.name) : game.seattleTeam.shortName
  const gcAwayScore  = game.isHome ? game.opponentScore  : game.seattleScore
  const gcHomeLogo   = game.isHome ? seattleLogoUrl      : game.opponent.logo
  const gcHomeEmoji  = game.isHome ? game.seattleTeam.emoji : "🏟️"
  const gcHomeAbbr   = game.isHome ? game.seattleTeam.abbr  : game.opponent.abbr
  const gcHomeName   = game.isHome ? game.seattleTeam.shortName : (game.opponent.shortName || game.opponent.name)
  const gcHomeScore  = game.isHome ? game.seattleScore   : game.opponentScore
  const gcAwayWon = isFt && game.seattleScore !== undefined && game.opponentScore !== undefined && (gcAwayScore ?? 0) > (gcHomeScore ?? 0)
  const gcHomeWon = isFt && game.seattleScore !== undefined && game.opponentScore !== undefined && (gcHomeScore ?? 0) > (gcAwayScore ?? 0)

  const cardStyle: React.CSSProperties = isLive ? {
    background: "rgba(239,68,68,0.04)",
    borderLeft: "2px solid #ef4444",
  } : {}

  return (
    <>
      {/* ── Compact flat row ─────────────────────────────────────────────── */}
      <button className="w-full text-left group" onClick={() => setOpen(true)}>
        <div
          className="flex items-center px-4 py-3 border-b border-zinc-500/60 hover:bg-white/[0.02] active:bg-white/[0.03] transition-colors"
          style={cardStyle}
        >
          {/* Left: status/time — fixed 64px */}
          <div className="w-16 flex-shrink-0 flex flex-col gap-0.5">
            {isLive ? (
              <div className="flex items-center gap-1">
                <span className="relative flex h-1.5 w-1.5 flex-shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500" />
                </span>
                <span className="text-[11px] font-bold text-red-400 uppercase tracking-wide">Live</span>
              </div>
            ) : isFt ? (
              <span className="text-[11px] text-zinc-500 uppercase tracking-wide">Final</span>
            ) : (
              <span className="text-[11px] font-medium text-zinc-400 whitespace-nowrap">{formatGameTime(game.kickoff)}</span>
            )}
            <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-wider">{game.league}</span>
          </div>

          {/* Away team (right-aligned) */}
          <div className="flex-1 flex items-center justify-end gap-2 min-w-0">
            <span className={`text-[13px] font-semibold truncate text-right leading-tight ${isFt && gcHomeWon ? "text-zinc-500" : "text-white"}`}>
              {gcAwayName}
            </span>
            <TeamLogo src={gcAwayLogo} emoji={gcAwayEmoji} abbr={gcAwayAbbr} size={26}
              className={`flex-shrink-0 transition-opacity${isFt && gcHomeWon ? " opacity-40" : ""}`} />
          </div>

          {/* Score / vs — center */}
          <div className="w-14 flex-shrink-0 text-center">
            {hasScore && gcAwayScore !== undefined && gcHomeScore !== undefined ? (
              <span className={`text-[14px] font-bold tabular-nums ${isLive ? "text-red-300" : "text-white"}`}>
                {gcAwayScore}–{gcHomeScore}
              </span>
            ) : (
              <span className="text-[12px] text-zinc-600">vs</span>
            )}
          </div>

          {/* Home team (left-aligned) */}
          <div className="flex-1 flex items-center gap-2 min-w-0">
            <TeamLogo src={gcHomeLogo} emoji={gcHomeEmoji} abbr={gcHomeAbbr} size={26}
              className={`flex-shrink-0 transition-opacity${isFt && gcAwayWon ? " opacity-40" : ""}`} />
            <span className={`text-[13px] font-semibold truncate leading-tight ${isFt && gcAwayWon ? "text-zinc-500" : "text-white"}`}>
              {gcHomeName}
            </span>
          </div>

          {/* Chevron */}
          <svg className="w-3 h-3 text-zinc-700 group-hover:text-zinc-500 flex-shrink-0 ml-2 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </button>

      {/* ── Detail slide-up sheet ─────────────────────────────────────────── */}
      {open && (
        <>
          <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-40" onClick={() => setOpen(false)} />
          {/* Outer wrapper: overflow-visible so Buy Tickets button can float above */}
          <div
            className="fixed bottom-0 left-0 right-0 z-50 lg:max-w-2xl lg:mx-auto animate-slide-up"
            style={{ overflow: "visible" }}
            onClick={e => e.stopPropagation()}
          >
            {/* Floating Buy Tickets badge */}
            {PRO_TEAM_IDS.includes(game.seattleTeamId) && isUp && (
              <a
                href={`https://gametime.com/search?q=${encodeURIComponent(game.seattleTeam.name)}`}
                target="_blank" rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                className="absolute left-1/2 -translate-x-1/2 -top-7 z-10 flex flex-col items-center justify-center w-[72px] h-[72px] rounded-full font-display text-[10px] font-800 uppercase tracking-wide text-white text-center leading-tight transition-transform active:scale-95 hover:scale-105"
                style={{
                  background: `radial-gradient(circle at 40% 35%, ${seattleColor}, ${seattleColor}bb)`,
                  boxShadow: `0 0 28px ${seattleColor}77, 0 6px 20px rgba(0,0,0,0.6)`,
                  border: "2.5px solid rgba(255,255,255,0.25)",
                }}
              >
                <span className="text-[20px] leading-none mb-0.5">🎟</span>
                <span>Buy<br />Tickets</span>
              </a>
            )}

            {/* Inner sheet */}
            <div
              className="overflow-y-auto"
              style={{ background: "#0c1b31", paddingBottom: "env(safe-area-inset-bottom)", maxHeight: "88dvh" }}
            >

              {/* ── SECTION 1: SCOREBOARD ─────────────────────────────────── */}
              <div className="relative bg-gradient-to-b from-[#0c1b31] to-[#142236] px-5 pt-4 pb-5">
                <button onClick={() => setOpen(false)} className="absolute top-2 right-4 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white text-sm">✕</button>

                {/* Status + meta */}
                <div className="flex items-center gap-2 mb-3">
                  {isLive && (
                    <span className="flex items-center gap-1.5 text-[11px] font-bold text-red-400 uppercase tracking-wider">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse inline-block" />LIVE
                    </span>
                  )}
                  {isFt && <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">FINAL</span>}
                  {isUp && <span className="text-[11px] text-zinc-500">{formatGameDate(game.kickoff)}</span>}
                  {game.broadcast && <span className="text-[11px] text-zinc-600">{game.broadcast}</span>}
                  {game.venue?.city && <span className="text-[11px] text-zinc-500 ml-auto">📍 {game.venue.city}{game.venue.state ? `, ${game.venue.state}` : ""}</span>}
                </div>

                {/* Team logos + BIG score — AWAY (left) vs HOME (right) */}
                <div className="flex items-center justify-between gap-3">
                  {/* Left = AWAY */}
                  <button
                    className="flex-1 flex flex-col items-center gap-1.5 active:scale-95 transition-transform"
                    onClick={e => { e.stopPropagation(); setTeamSheet(game.isHome ? { id: game.opponent.id, name: game.opponent.name, logo: game.opponent.logo } : { id: game.seattleTeam.espnId, name: game.seattleTeam.name, logo: seattleLogoUrl }) }}
                  >
                    <TeamLogo src={game.isHome ? game.opponent.logo : seattleLogoUrl} emoji={game.isHome ? "🏟️" : game.seattleTeam.emoji} abbr={game.isHome ? game.opponent.abbr : game.seattleTeam.abbr} size={60} />
                    <span className={`font-display text-[14px] font-700 text-center leading-tight ${game.isHome ? (seattleWon ? "text-zinc-400" : "text-white") : (seattleLost ? "text-zinc-400" : "text-white")}`}>
                      {game.isHome ? (game.opponent.shortName || game.opponent.name) : game.seattleTeam.shortName}
                    </span>
                    <span className="text-[10px] uppercase tracking-widest text-zinc-600">Away</span>
                  </button>

                  <div className="flex flex-col items-center gap-0.5 flex-shrink-0">
                    {hasScore ? (
                      <>
                        <div className="font-display font-800 tabular-nums text-[48px] leading-none text-white">
                          {game.isHome ? game.opponentScore : game.seattleScore}<span className="text-zinc-600 text-[32px] mx-1.5">–</span>{game.isHome ? game.seattleScore : game.opponentScore}
                        </div>
                        {isFt && (() => {
                          const leftWon  = game.isHome ? seattleLost : seattleWon  // away = left
                          const rightWon = game.isHome ? seattleWon  : seattleLost // home = right
                          return (
                            <span className="font-display text-[20px] leading-none" style={{ color: (leftWon || rightWon) ? "#00d4ff" : "#52525b" }}>
                              {leftWon ? "◀" : rightWon ? "▶" : "—"}
                            </span>
                          )
                        })()}
                      </>
                    ) : (
                      <>
                        <span className="font-display text-[14px] font-600 text-zinc-500 uppercase tracking-widest">vs</span>
                        <span className="font-display text-[16px] font-700 text-white">{formatGameTime(game.kickoff)}</span>
                      </>
                    )}
                  </div>

                  {/* Right = HOME */}
                  <button
                    className="flex-1 flex flex-col items-center gap-1.5 active:scale-95 transition-transform"
                    onClick={e => { e.stopPropagation(); setTeamSheet(game.isHome ? { id: game.seattleTeam.espnId, name: game.seattleTeam.name, logo: seattleLogoUrl } : { id: game.opponent.id, name: game.opponent.name, logo: game.opponent.logo }) }}
                  >
                    <TeamLogo src={game.isHome ? seattleLogoUrl : game.opponent.logo} emoji={game.isHome ? game.seattleTeam.emoji : "🏟️"} abbr={game.isHome ? game.seattleTeam.abbr : game.opponent.abbr} size={60} />
                    <span className={`font-display text-[14px] font-700 text-center leading-tight ${game.isHome ? (seattleLost ? "text-zinc-400" : "text-white") : (seattleWon ? "text-zinc-400" : "text-white")}`}>
                      {game.isHome ? game.seattleTeam.shortName : (game.opponent.shortName || game.opponent.name)}
                    </span>
                    <span className="text-[10px] uppercase tracking-widest text-zinc-600">Home</span>
                  </button>
                </div>

                {/* Line score — baseball uses compact line score, others use full BoxScore */}
                {canShowBoxScore && game.sport === "baseball" && (
                  <div className="mt-4">
                    <CompactBaseballLineScore gameId={game.id} league={game.league} seattleTeamId={game.seattleTeam.espnId || game.seattleTeam.id} isLive={isLive} />
                  </div>
                )}
                {canShowBoxScore && game.sport !== "baseball" && (
                  <div className="mt-4">
                    <BoxScore eventId={game.id} league={game.league} seattleTeamId={game.seattleTeam.espnId} color={seattleColor} />
                  </div>
                )}
              </div>

              {/* ── SECTION 2: TEAM RECORDS — always shown for live/final ─── */}
              {(isLive || isFt) && (
                <div className="px-4 py-4 border-t border-white/[0.15]">
                  <div className="font-display text-[10px] font-700 uppercase tracking-widest text-zinc-600 mb-3">Season Records</div>
                  <div className="grid grid-cols-2 gap-3">
                    {/* Seattle record */}
                    <div
                      className="rounded-lg px-4 py-3"
                      style={{ background: `${seattleColor}18`, border: `1px solid ${seattleColor}35` }}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <TeamLogo src={seattleLogoUrl} emoji={game.seattleTeam.emoji} abbr={game.seattleTeam.abbr} size={22} />
                        <span className="font-display text-[12px] font-700 text-white truncate">{game.seattleTeam.shortName}</span>
                      </div>
                      <div className="font-display text-[28px] font-800 text-white tabular-nums leading-none">
                        {formatRecord(game.seattleRecord)}
                      </div>
                      {game.seattleRecord && (
                        <div className="text-[10px] text-zinc-500 mt-1">
                          {((game.seattleRecord.wins / Math.max(game.seattleRecord.wins + game.seattleRecord.losses, 1)) * 100).toFixed(1)}% win rate
                        </div>
                      )}
                    </div>

                    {/* Opponent record */}
                    <div className="rounded-lg px-4 py-3" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
                      <div className="flex items-center gap-2 mb-2">
                        <TeamLogo src={game.opponent.logo} emoji="🏟️" abbr={game.opponent.abbr} size={22} />
                        <span className="font-display text-[12px] font-700 text-zinc-300 truncate">{game.opponent.shortName || game.opponent.abbr}</span>
                      </div>
                      <div className="font-display text-[28px] font-800 text-zinc-300 tabular-nums leading-none">
                        {formatRecord(game.opponentRecord)}
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

              {/* ── SECTION 3: DIVISION STANDINGS ─────────────────────────── */}
              {seattleDivision && (
                <div className="px-4 pb-6 border-t border-white/[0.15]">
                  <div className="font-display text-[10px] font-700 uppercase tracking-widest text-zinc-600 mt-4 mb-3">{seattleDivision.name} Standings</div>
                  <div className="space-y-1">
                    {seattleDivision.entries.map((e, i) => (
                      <div
                        key={e.teamId}
                        className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg"
                        style={{
                          background: e.isSeattle ? `${seattleColor}20` : "var(--surface-2)",
                          border: `1px solid ${e.isSeattle ? seattleColor + "40" : "var(--border)"}`,
                        }}
                      >
                        <span className="font-display text-[12px] font-700 text-zinc-600 w-5 text-center flex-shrink-0">{i + 1}</span>
                        {e.logo ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={e.logo} alt={e.abbr} width={28} height={28} className="object-contain flex-shrink-0" />
                        ) : (
                          <span className="w-5 h-5 rounded-full bg-white/10 flex-shrink-0" />
                        )}
                        <span className={`font-display text-[13px] font-700 flex-1 ${e.isSeattle ? "text-white" : "text-zinc-300"}`}>{e.abbr}</span>
                        <span className="font-display text-[13px] font-700 text-zinc-300 tabular-nums">{e.wins}–{e.losses}</span>
                        <span className="font-display text-[11px] text-zinc-600 w-10 text-right tabular-nums">.{String(Math.round(e.winPct * 1000)).padStart(3, "0")}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Venue footer */}
              {game.venue?.name && (
                <div className="px-5 pb-5 pt-1 border-t border-white/[0.15]">
                  <div className="flex items-center gap-2 text-zinc-600 text-[12px]">
                    <span>📍</span>
                    <span>{game.venue.name}{game.venue.city ? `, ${game.venue.city}` : ""}{game.venue.state ? `, ${game.venue.state}` : ""}</span>
                  </div>
                </div>
              )}
            </div>{/* end inner sheet */}
          </div>{/* end outer wrapper */}
        </>
      )}

      {/* Team detail sheet */}
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

