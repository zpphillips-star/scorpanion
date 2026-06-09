"use client"
import { useState, useEffect } from "react"
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

  return (
    <>
      {/* ── Compact row card ─────────────────────────────────────────────── */}
      <button className="w-full text-left group" onClick={() => setOpen(true)}>
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
              <button
                className="relative flex-shrink-0 active:scale-95 transition-transform"
                onClick={e => { e.stopPropagation(); setTeamSheet({ id: game.seattleTeam.espnId, name: game.seattleTeam.name, logo: seattleLogoUrl }) }}
              >
                <TeamLogo src={seattleLogoUrl} emoji={game.seattleTeam.emoji} abbr={game.seattleTeam.abbr} size={38} />
              </button>
              <div className="min-w-0">
                <div className={`font-display text-[16px] font-700 leading-tight truncate ${seattleLost ? "text-zinc-400" : "text-white"}`}>
                  {game.seattleTeam.shortName}
                </div>
                {game.seattleRecord && <div className="text-[11px] text-zinc-500 leading-none mt-0.5">{formatRecord(game.seattleRecord)}</div>}
              </div>
            </div>

            {/* Score / VS center */}
            <div className="flex flex-col items-center justify-center min-w-[72px] flex-shrink-0">
              {hasScore ? (
                <div className="font-display text-[22px] font-800 tabular-nums leading-none text-white">
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
                <div className={`font-display text-[16px] font-700 leading-tight truncate ${seattleWon ? "text-zinc-400" : "text-white"}`}>
                  {game.opponent.shortName || game.opponent.name}
                </div>
                {game.opponentRecord && <div className="text-[11px] text-zinc-500 leading-none mt-0.5 text-right">{formatRecord(game.opponentRecord)}</div>}
              </div>
              <button
                className="relative flex-shrink-0 active:scale-95 transition-transform"
                onClick={e => { e.stopPropagation(); setTeamSheet({ id: game.opponent.id, name: game.opponent.name, logo: game.opponent.logo }) }}
              >
                <TeamLogo src={game.opponent.logo} emoji="🏟️" abbr={game.opponent.abbr} size={38} />
              </button>
            </div>
          </div>

          {/* Bottom accent bar */}
          <div className="h-0.5 w-full" style={{ background: `linear-gradient(to right, ${seattleColor}88, ${seattleColor}22, transparent)` }} />
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
              className="rounded-t-3xl overflow-y-auto"
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
                    <span className="flex items-center gap-1.5 text-[11px] font-bold text-red-400 bg-red-500/10 border border-red-500/20 px-2.5 py-1 rounded-full uppercase tracking-wider">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />Live
                    </span>
                  )}
                  {isFt && <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full uppercase tracking-wider">Final</span>}
                  {isUp && <span className="text-[11px] text-zinc-400 bg-white/5 px-2.5 py-1 rounded-full">{formatGameDate(game.kickoff)}</span>}
                  {game.broadcast && <span className="text-[11px] text-zinc-400 bg-white/5 px-2.5 py-1 rounded-full">{game.broadcast}</span>}
                  {game.venue?.city && <span className="text-[11px] text-zinc-500 ml-auto">📍 {game.venue.city}</span>}
                </div>

                {/* Team logos + BIG score */}
                <div className="flex items-center justify-between gap-3">
                  <button
                    className="flex-1 flex flex-col items-center gap-1.5 active:scale-95 transition-transform"
                    onClick={e => { e.stopPropagation(); setOpen(false); setTeamSheet({ id: game.seattleTeam.espnId, name: game.seattleTeam.name, logo: seattleLogoUrl }) }}
                  >
                    <TeamLogo src={seattleLogoUrl} emoji={game.seattleTeam.emoji} abbr={game.seattleTeam.abbr} size={60} />
                    <span className={`font-display text-[14px] font-700 text-center leading-tight ${seattleLost ? "text-zinc-400" : "text-white"}`}>{game.seattleTeam.shortName}</span>
                    <span className="text-[10px] uppercase tracking-widest text-zinc-600">{game.isHome ? "Home" : "Away"}</span>
                  </button>

                  <div className="flex flex-col items-center gap-0.5 flex-shrink-0">
                    {hasScore ? (
                      <>
                        <div className="font-display font-800 tabular-nums text-[48px] leading-none text-white">
                          {game.seattleScore}<span className="text-zinc-600 text-[32px] mx-1.5">–</span>{game.opponentScore}
                        </div>
                        {isFt && (
                          <span className={`font-display text-[13px] font-800 uppercase tracking-widest ${seattleWon ? "text-emerald-400" : seattleLost ? "text-red-400" : "text-zinc-500"}`}>
                            {seattleWon ? "Win" : seattleLost ? "Loss" : "Tie"}
                          </span>
                        )}
                      </>
                    ) : (
                      <>
                        <span className="font-display text-[14px] font-600 text-zinc-500 uppercase tracking-widest">vs</span>
                        <span className="font-display text-[16px] font-700 text-white">{formatGameTime(game.kickoff)}</span>
                      </>
                    )}
                  </div>

                  <button
                    className="flex-1 flex flex-col items-center gap-1.5 active:scale-95 transition-transform"
                    onClick={e => { e.stopPropagation(); setOpen(false); setTeamSheet({ id: game.opponent.id, name: game.opponent.name, logo: game.opponent.logo }) }}
                  >
                    <TeamLogo src={game.opponent.logo} emoji="🏟️" abbr={game.opponent.abbr} size={60} />
                    <span className={`font-display text-[14px] font-700 text-center leading-tight ${seattleWon ? "text-zinc-400" : "text-white"}`}>{game.opponent.shortName || game.opponent.name}</span>
                    <span className="text-[10px] uppercase tracking-widest text-zinc-600">{game.isHome ? "Away" : "Home"}</span>
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
                      className="rounded-2xl px-4 py-3"
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
                    <div className="rounded-2xl px-4 py-3" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
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
                        className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl"
                        style={{
                          background: e.isSeattle ? `${seattleColor}20` : "var(--surface-2)",
                          border: `1px solid ${e.isSeattle ? seattleColor + "40" : "var(--border)"}`,
                        }}
                      >
                        <span className="font-display text-[12px] font-700 text-zinc-600 w-5 text-center flex-shrink-0">{i + 1}</span>
                        {e.logo ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={e.logo} alt={e.abbr} width={22} height={22} className="object-contain flex-shrink-0" />
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

