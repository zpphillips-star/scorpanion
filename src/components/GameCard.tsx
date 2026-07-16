"use client"
import React, { useState, useEffect } from "react"
import { Game } from "@/lib/types"
import { getTeamLogoUrl } from "@/lib/teams"
import TeamLogo from "./TeamLogo"
import BoxScore from "./BoxScore"
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
  const gcAwayRecord = game.isHome ? game.opponentRecord : game.seattleRecord
  const gcHomeLogo   = game.isHome ? seattleLogoUrl      : game.opponent.logo
  const gcHomeEmoji  = game.isHome ? game.seattleTeam.emoji : "🏟️"
  const gcHomeAbbr   = game.isHome ? game.seattleTeam.abbr  : game.opponent.abbr
  const gcHomeName   = game.isHome ? game.seattleTeam.shortName : (game.opponent.shortName || game.opponent.name)
  const gcHomeScore  = game.isHome ? game.seattleScore   : game.opponentScore
  const gcHomeRecord = game.isHome ? game.seattleRecord  : game.opponentRecord
  const gcAwayWon = isFt && game.seattleScore !== undefined && game.opponentScore !== undefined && (gcAwayScore ?? 0) > (gcHomeScore ?? 0)
  const gcHomeWon = isFt && game.seattleScore !== undefined && game.opponentScore !== undefined && (gcHomeScore ?? 0) > (gcAwayScore ?? 0)

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
      {/* ── Compact row card ─────────────────────────────────────────────── */}
      <button className="w-full text-left group" onClick={() => setOpen(true)}>
        <div
          className="mx-3 my-1 rounded-xl overflow-hidden transition-all duration-150 active:scale-[0.985]"
          style={cardStyle}
        >
          {/* ── Header: status badge + date/league pill ── */}
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
              <span className="font-medium text-[11px] text-zinc-500 uppercase tracking-widest">{formatGameDate(game.kickoff)}</span>
            )}
            <div className="flex items-center gap-2">
              {game.broadcast && (
                <span className="text-[10px] text-zinc-600">{game.broadcast}</span>
              )}
              <span className="text-[10px] font-medium" style={{ color: "#9090b0" }}>{game.league.toUpperCase()}</span>
              <svg className="w-3 h-3 text-zinc-700 group-hover:text-zinc-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>

          {/* ── Team rows ── */}
          <div className="px-4 pb-3">

            {/* Away team row */}
            <div className="flex items-center gap-3 py-1">
              <button
                className="flex-shrink-0 active:scale-95 transition-transform"
                onClick={e => { e.stopPropagation(); setTeamSheet(game.isHome ? { id: game.opponent.id, name: game.opponent.name, logo: game.opponent.logo } : { id: game.seattleTeam.espnId, name: game.seattleTeam.name, logo: seattleLogoUrl }) }}
              >
                <TeamLogo
                  src={gcAwayLogo} emoji={gcAwayEmoji} abbr={gcAwayAbbr} size={40}
                  className={`rounded-lg transition-opacity${isFt && !gcAwayWon && gcHomeWon ? " opacity-60" : ""}`}
                />
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[12px]" style={{ color: "#9090b0" }}>{gcAwayAbbr}</span>
                  {gcAwayRecord && <span className="text-[10px] text-zinc-700">{formatRecord(gcAwayRecord)}</span>}
                </div>
                <div
                  className="font-display text-[16px] font-700 leading-tight truncate"
                  style={{ color: isFt && !gcAwayWon && gcHomeWon ? "#5a5a7a" : "#f0f0f8" }}
                >{gcAwayName}</div>
              </div>
              {hasScore && gcAwayScore !== undefined && (
                <div
                  className="font-display font-700 tabular-nums leading-none flex-shrink-0"
                  style={{ fontSize: "40px", color: isFt && !gcAwayWon && gcHomeWon ? "#5a5a7a" : "#f0f0f8" }}
                >{gcAwayScore}</div>
              )}
            </div>

            {/* Upcoming only: time / vs separator */}
            {isUp && (
              <div className="flex items-center gap-2 py-1">
                <div className="flex-1 h-px" style={{ background: "rgba(144,144,176,0.15)" }} />
                <span className="text-[12px] font-medium" style={{ color: "#9090b0" }}>
                  {formatGameTime(game.kickoff)} · {game.isHome ? "Home" : "Away"}
                </span>
                <div className="flex-1 h-px" style={{ background: "rgba(144,144,176,0.15)" }} />
              </div>
            )}

            {/* Home team row */}
            <div className="flex items-center gap-3 py-1">
              <button
                className="flex-shrink-0 active:scale-95 transition-transform"
                onClick={e => { e.stopPropagation(); setTeamSheet(game.isHome ? { id: game.seattleTeam.espnId, name: game.seattleTeam.name, logo: seattleLogoUrl } : { id: game.opponent.id, name: game.opponent.name, logo: game.opponent.logo }) }}
              >
                <TeamLogo
                  src={gcHomeLogo} emoji={gcHomeEmoji} abbr={gcHomeAbbr} size={40}
                  className={`rounded-lg transition-opacity${isFt && !gcHomeWon && gcAwayWon ? " opacity-60" : ""}`}
                />
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[12px]" style={{ color: "#9090b0" }}>{gcHomeAbbr}</span>
                  {gcHomeRecord && <span className="text-[10px] text-zinc-700">{formatRecord(gcHomeRecord)}</span>}
                </div>
                <div
                  className="font-display text-[16px] font-700 leading-tight truncate"
                  style={{ color: isFt && !gcHomeWon && gcAwayWon ? "#5a5a7a" : "#f0f0f8" }}
                >{gcHomeName}</div>
              </div>
              {hasScore && gcHomeScore !== undefined && (
                <div
                  className="font-display font-700 tabular-nums leading-none flex-shrink-0"
                  style={{ fontSize: "40px", color: isFt && !gcHomeWon && gcAwayWon ? "#5a5a7a" : "#f0f0f8" }}
                >{gcHomeScore}</div>
              )}
            </div>

            {/* Win/loss label + venue footer */}
            {(isFt || isLive) && (
              <div className="flex items-center gap-2 mt-1.5 pt-1.5" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                {isFt && seattleWon && <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">W</span>}
                {isFt && seattleLost && <span className="text-[11px] font-bold text-red-400 uppercase tracking-wider">L</span>}
                {isLive && game.clock && <span className="text-[11px] font-medium" style={{ color: "var(--accent)" }}>{game.clock}</span>}
                {game.venue?.city && <span className="text-[11px] text-zinc-600 ml-auto">{game.venue.city}</span>}
              </div>
            )}
          </div>
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
              className="rounded-t-lg overflow-y-auto"
              style={{ background: "var(--surface)", paddingBottom: "env(safe-area-inset-bottom)", maxHeight: "88dvh" }}
            >
              <div className="w-10 h-1 rounded-full bg-white/15 mx-auto mt-3 mb-2 flex-shrink-0" />

              {/* ── SECTION 1: SCOREBOARD ─────────────────────────────────── */}
              <div
                className="relative px-5 pt-2 pb-5"
                style={{ background: `linear-gradient(160deg, ${seattleColor}35 0%, ${game.seattleTeam.secondaryColor}15 60%, transparent 100%)` }}
              >
                <button onClick={() => setOpen(false)} className="absolute top-2 right-4 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white text-sm">✕</button>

                {/* Status + meta */}
                <div className="flex items-center gap-2 mb-3">
                  {isLive && (
                    <span className="flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider" style={{ color: "var(--accent)", background: "var(--accent-muted)", border: "1px solid rgba(0,212,255,0.25)" }}>
                      <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "var(--accent)" }} />LIVE
                    </span>
                  )}
                  {isFt && <span className="text-[11px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider" style={{ color: "var(--status-final)", background: "var(--surface-2)", border: "1px solid var(--border-default)" }}>FINAL</span>}
                  {isUp && <span className="text-[11px] text-zinc-400 bg-white/5 px-2.5 py-1 rounded-full">{formatGameDate(game.kickoff)}</span>}
                  {game.broadcast && <span className="text-[11px] text-zinc-400 bg-white/5 px-2.5 py-1 rounded-full">{game.broadcast}</span>}
                  {game.venue?.city && <span className="text-[11px] text-zinc-500 ml-auto">📍 {game.venue.city}</span>}
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

                {/* Line score — for completed/live */}
                {canShowBoxScore && (
                  <div className="mt-4">
                    <BoxScore eventId={game.id} league={game.league} seattleTeamId={game.seattleTeam.espnId} color={seattleColor} />
                  </div>
                )}
              </div>

              {/* ── SECTION 2: TEAM RECORDS ───────────────────────────────── */}
              {(game.seattleRecord || game.opponentRecord) && (
                <div className="px-4 py-4 border-t border-white/5">
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
                <div className="px-4 pb-6 border-t border-white/5">
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
                <div className="px-5 pb-5 pt-1 border-t border-white/5">
                  <div className="flex items-center gap-2 text-zinc-600 text-[12px]">
                    <span>📍</span>
                    <span>{game.venue.name}{game.venue.city ? `, ${game.venue.city}` : ""}</span>
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

