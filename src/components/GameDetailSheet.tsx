"use client"
import { useState, useEffect } from "react"
import { Game } from "@/lib/types"
import { getTeamLogoUrl } from "@/lib/teams"
import TeamLogo from "./TeamLogo"
import BoxScore from "./BoxScore"
import TeamDetailSheet from "./TeamDetailSheet"
import UpcomingScheduleSection from "./UpcomingScheduleSection"

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatRecord(r?: { wins: number; losses: number; ties?: number }): string {
  if (!r) return ""
  return r.ties ? `${r.wins}-${r.losses}-${r.ties}` : `${r.wins}-${r.losses}`
}

function getLiveDetail(game: Game): string {
  const p = game.period ? Number(game.period) : null
  const clk = game.clock
  if (game.sport === "baseball" && p) {
    const half = p % 2 === 1 ? "Top" : "Bot"
    return `${half} ${Math.ceil(p / 2)}${clk ? " · " + clk : ""}`
  }
  if (game.sport === "basketball" && p) return clk ? `Q${p}  ${clk}` : `Q${p}`
  if (game.sport === "hockey" && p) { const l = ["1st","2nd","3rd","OT"][p-1]||`P${p}`; return clk ? `${l}  ${clk}` : l }
  if (game.sport === "football" && p) { const l = ["1st","2nd","3rd","4th","OT"][p-1]||`Q${p}`; return clk ? `${l}  ${clk}` : l }
  if (game.sport === "soccer") return clk ? `${clk}′` : "Live"
  return clk || "Live"
}

// ── Team detail shape (from /api/team-detail) ────────────────────────────────

interface TeamDetail {
  color: string
  altColor: string
  recentForm: { result: "W" | "L" | "T" }[]
  divisionRank: number | null
  divisionName: string
  wins: number
  losses: number
  ties?: number
}

// ── Sub-components ────────────────────────────────────────────────────────────

function RecentFormDots({ form }: { form: { result: "W" | "L" | "T" }[] }) {
  if (!form || form.length === 0) return null
  return (
    <div className="flex items-center gap-1">
      {form.map((f, i) => (
        <div
          key={i}
          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
          style={{ background: f.result === "W" ? "#34d399" : f.result === "L" ? "#f87171" : "#9ca3af" }}
          title={f.result}
        />
      ))}
    </div>
  )
}

function TeamContextCard({
  name, logo, emoji, abbr, color, record, detail, label,
}: {
  name: string; logo: string; emoji: string; abbr: string
  color: string
  record?: { wins: number; losses: number; ties?: number }
  detail: TeamDetail | null
  label: "Away" | "Home"
}) {
  const wins   = detail?.wins   ?? record?.wins
  const losses = detail?.losses ?? record?.losses
  const ties   = record?.ties
  const divRank = detail?.divisionRank
  const divName = detail?.divisionName
  const form = detail?.recentForm ?? []

  return (
    <div className="rounded-xl px-3 py-3" style={{ background: `${color}18`, border: `1px solid ${color}35` }}>
      <div className="flex items-center gap-2 mb-2">
        <TeamLogo src={logo} emoji={emoji} abbr={abbr} size={22} />
        <div className="flex-1 min-w-0">
          <div className="font-display text-[12px] font-700 text-white truncate">{name}</div>
          <div className="font-display text-[9px] uppercase tracking-widest text-zinc-600">{label}</div>
        </div>
      </div>

      {wins !== undefined && losses !== undefined && (
        <div className="font-display text-[24px] font-800 text-white tabular-nums leading-none mb-1">
          {wins}–{losses}{ties !== undefined && ties > 0 ? `–${ties}` : ""}
        </div>
      )}

      {divRank !== null && divRank !== undefined && divName && (
        <div className="font-display text-[10px] text-zinc-500 mb-2">
          #{divRank} {divName}
        </div>
      )}

      {form.length > 0 && (
        <div className="mt-1.5">
          <div className="font-display text-[9px] text-zinc-600 uppercase tracking-widest mb-1.5">Last {form.length}</div>
          <RecentFormDots form={form} />
        </div>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function GameDetailSheet({ game, onClose }: { game: Game; onClose: () => void }) {
  const [teamSheet, setTeamSheet] = useState<{ id: string; name: string; logo: string } | null>(null)
  const [seaDetail, setSeaDetail] = useState<TeamDetail | null>(null)
  const [oppDetail, setOppDetail] = useState<TeamDetail | null>(null)

  const isLive     = game.status === "live"
  const isFt       = game.status === "ft"
  const isUpcoming = game.status === "upcoming"
  // GUARD: only show scores for live/completed games with defined scores
  const hasScore   = (isLive || isFt) && game.seattleScore !== undefined && game.opponentScore !== undefined
  const seattleColor   = game.seattleTeam.primaryColor
  const seattleLogoUrl = getTeamLogoUrl(game.seattleTeam)
  const liveDetail     = isLive ? getLiveDetail(game) : ""
  const canShowBoxScore = (isLive || isFt) && !!game.id && game.league !== "whl" && game.league !== "pwhl"

  const league = game.league
  const seaId  = game.seattleTeam.espnId
  const oppId  = game.opponent.id

  useEffect(() => {
    if (!seaId || !oppId || league === "whl" || league === "pwhl") return
    Promise.all([
      fetch(`/api/team-detail?teamId=${encodeURIComponent(seaId)}&league=${encodeURIComponent(league)}`).then(r => r.ok ? r.json() : null),
      fetch(`/api/team-detail?teamId=${encodeURIComponent(oppId)}&league=${encodeURIComponent(league)}`).then(r => r.ok ? r.json() : null),
    ]).then(([sea, opp]) => {
      if (sea) setSeaDetail(sea)
      if (opp) setOppDetail(opp)
    }).catch(() => {})
  }, [seaId, oppId, league])

  // Resolve away/home side (away = left, home = right)
  const oppColor   = oppDetail?.color ?? "#374151"
  const awayColor  = game.isHome ? oppColor      : seattleColor
  const homeColor  = game.isHome ? seattleColor  : oppColor

  const awayLogo   = game.isHome ? game.opponent.logo  : seattleLogoUrl
  const awayEmoji  = game.isHome ? "🏟️"                : game.seattleTeam.emoji
  const awayAbbr   = game.isHome ? game.opponent.abbr  : game.seattleTeam.abbr
  const awayName   = game.isHome ? (game.opponent.shortName || game.opponent.name) : game.seattleTeam.shortName
  const awayId     = game.isHome ? game.opponent.id    : game.seattleTeam.espnId
  const awayRecord = game.isHome ? game.opponentRecord : game.seattleRecord
  const awayDetail = game.isHome ? oppDetail           : seaDetail

  const homeLogo   = game.isHome ? seattleLogoUrl      : game.opponent.logo
  const homeEmoji  = game.isHome ? game.seattleTeam.emoji : "🏟️"
  const homeAbbr   = game.isHome ? game.seattleTeam.abbr  : game.opponent.abbr
  const homeName   = game.isHome ? game.seattleTeam.shortName : (game.opponent.shortName || game.opponent.name)
  const homeId     = game.isHome ? game.seattleTeam.espnId    : game.opponent.id
  const homeRecord = game.isHome ? game.seattleRecord   : game.opponentRecord
  const homeDetail = game.isHome ? seaDetail             : oppDetail

  const awayScore = game.isHome ? game.opponentScore : game.seattleScore
  const homeScore = game.isHome ? game.seattleScore  : game.opponentScore
  const awayWon   = hasScore && (awayScore ?? 0) > (homeScore ?? 0)
  const homeWon   = hasScore && (homeScore ?? 0) > (awayScore ?? 0)

  const seattleWon  = hasScore && (game.seattleScore ?? 0) > (game.opponentScore ?? 0)
  const seattleLost = hasScore && (game.seattleScore ?? 0) < (game.opponentScore ?? 0)

  return (
    <>
      <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50" onClick={onClose} />
      <div
        className="fixed bottom-0 left-0 right-0 z-50 lg:max-w-2xl lg:mx-auto rounded-t-2xl overflow-y-auto animate-slide-up"
        style={{ background: "var(--surface)", paddingBottom: "env(safe-area-inset-bottom)", maxHeight: "88dvh" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="w-10 h-1 rounded-full bg-white/15 mx-auto mt-3 mb-0 flex-shrink-0" />

        {/* ═══ HERO — dual-color split gradient ═══ */}
        <div className="relative overflow-hidden">
          {/* Left panel (away color) */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `linear-gradient(to right, ${awayColor}70 0%, ${awayColor}30 42%, transparent 50%, ${homeColor}30 58%, ${homeColor}70 100%)`,
            }}
          />
          {/* Bottom fade into surface */}
          <div
            className="absolute bottom-0 left-0 right-0 h-10 pointer-events-none"
            style={{ background: "linear-gradient(to bottom, transparent, var(--surface))" }}
          />

          <div className="relative px-4 pt-4 pb-5">
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-3 right-4 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/60 hover:text-white text-sm z-10"
            >✕</button>

            {/* Status + broadcast badges — centered */}
            <div className="flex items-center justify-center gap-2 mb-5">
              {isLive ? (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/15 border border-red-500/30">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500" />
                  </span>
                  <span className="font-display text-[11px] font-800 text-red-400 uppercase tracking-wider">Live</span>
                </div>
              ) : isFt ? (
                <span className="font-display text-[11px] font-700 text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full uppercase tracking-wider">Final</span>
              ) : (
                <span className="font-display text-[11px] font-700 text-sky-400 bg-sky-500/10 border border-sky-500/20 px-3 py-1 rounded-full uppercase tracking-wider">Upcoming</span>
              )}
              {game.broadcast && (
                <span className="font-display text-[11px] font-700 text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full">{game.broadcast}</span>
              )}
            </div>

            {/* Teams + score / time row */}
            <div className="flex items-center justify-between gap-2">

              {/* Away (left) */}
              <button
                className="flex-1 flex flex-col items-center gap-1.5 active:scale-95 transition-transform"
                onClick={() => setTeamSheet({ id: awayId, name: awayName, logo: awayLogo })}
              >
                <div style={{ opacity: hasScore && !awayWon && homeWon ? 0.35 : 1, transition: "opacity 0.2s" }}>
                  <TeamLogo src={awayLogo} emoji={awayEmoji} abbr={awayAbbr} size={72} />
                </div>
                <span className={`font-display text-[14px] font-700 text-center leading-tight max-w-[95px] ${hasScore && !awayWon && homeWon ? "text-zinc-500" : "text-white"}`}>
                  {awayName}
                </span>
                {awayRecord && (
                  <span className="font-display text-[11px] text-zinc-400 tabular-nums">{formatRecord(awayRecord)}</span>
                )}
                <span className="font-display text-[9px] text-zinc-600 uppercase tracking-widest">Away</span>
              </button>

              {/* Center — score OR vs+time */}
              <div className="flex flex-col items-center gap-1 flex-shrink-0 min-w-[88px]">
                {hasScore ? (
                  <>
                    <div
                      className={`font-display font-800 tabular-nums leading-none ${isLive ? "text-red-300" : "text-white"}`}
                      style={{ fontSize: "50px" }}
                    >
                      <span style={{ opacity: !awayWon && homeWon ? 0.35 : 1 }}>{awayScore}</span>
                      <span className="text-zinc-600 mx-0.5" style={{ fontSize: "28px" }}>–</span>
                      <span style={{ opacity: !homeWon && awayWon ? 0.35 : 1 }}>{homeScore}</span>
                    </div>
                    {isLive && liveDetail && (
                      <div className="mt-1 px-3 py-1 rounded-full bg-red-500/15 border border-red-500/25">
                        <span className="font-display text-[12px] font-700 text-red-300">{liveDetail}</span>
                      </div>
                    )}
                    {isFt && (
                      <span className={`font-display text-[12px] font-800 uppercase tracking-widest mt-0.5 ${seattleWon ? "text-emerald-400" : seattleLost ? "text-red-400" : "text-zinc-500"}`}>
                        {seattleWon ? "Win" : seattleLost ? "Loss" : "Tie"}
                      </span>
                    )}
                  </>
                ) : (
                  <>
                    <span className="font-display text-[11px] font-700 text-zinc-500 uppercase tracking-[0.25em]">vs</span>
                    <span className="font-display text-[19px] font-800 text-white text-center leading-tight">
                      {new Date(game.kickoff).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}
                    </span>
                    <span className="font-display text-[10px] text-zinc-400 text-center">
                      {new Date(game.kickoff).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                    </span>
                  </>
                )}
              </div>

              {/* Home (right) */}
              <button
                className="flex-1 flex flex-col items-center gap-1.5 active:scale-95 transition-transform"
                onClick={() => setTeamSheet({ id: homeId, name: homeName, logo: homeLogo })}
              >
                <div style={{ opacity: hasScore && !homeWon && awayWon ? 0.35 : 1, transition: "opacity 0.2s" }}>
                  <TeamLogo src={homeLogo} emoji={homeEmoji} abbr={homeAbbr} size={72} />
                </div>
                <span className={`font-display text-[14px] font-700 text-center leading-tight max-w-[95px] ${hasScore && !homeWon && awayWon ? "text-zinc-500" : "text-white"}`}>
                  {homeName}
                </span>
                {homeRecord && (
                  <span className="font-display text-[11px] text-zinc-400 tabular-nums">{formatRecord(homeRecord)}</span>
                )}
                <span className="font-display text-[9px] text-zinc-600 uppercase tracking-widest">Home</span>
              </button>
            </div>

            {/* Venue pill — always, if available */}
            {game.venue?.name && (
              <div className="flex justify-center mt-4">
                <span className="text-[11px] text-zinc-400 bg-white/5 border border-white/10 px-3 py-1.5 rounded-full flex items-center gap-1.5">
                  📍 {game.venue.name}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Box score for live/completed games */}
        {canShowBoxScore && (
          <div className="px-4 pb-3 -mt-1">
            <BoxScore
              eventId={game.id.includes("|") ? game.id.split("|")[1] : game.id}
              league={game.league}
              seattleTeamId={game.seattleTeam.espnId}
              color={isLive ? "#ef4444" : seattleColor}
            />
          </div>
        )}

        {/* Team context cards — upcoming games only */}
        {isUpcoming && (
          <div className="px-4 pt-2 pb-4 border-t border-white/5">
            <div className="font-display text-[10px] font-700 uppercase tracking-widest text-zinc-600 mb-3">Team Overview</div>
            <div className="grid grid-cols-2 gap-3">
              <TeamContextCard
                name={awayName} logo={awayLogo} emoji={awayEmoji} abbr={awayAbbr}
                color={awayColor} record={awayRecord} detail={awayDetail} label="Away"
              />
              <TeamContextCard
                name={homeName} logo={homeLogo} emoji={homeEmoji} abbr={homeAbbr}
                color={homeColor} record={homeRecord} detail={homeDetail} label="Home"
              />
            </div>
          </div>
        )}

        {/* Season records — live/completed games */}
        {!isUpcoming && (game.seattleRecord || game.opponentRecord) && (
          <div className="px-4 py-4 border-t border-white/5">
            <div className="font-display text-[10px] font-700 uppercase tracking-widest text-zinc-600 mb-3">Season Records</div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl px-4 py-3" style={{ background: `${seattleColor}15`, border: `1px solid ${seattleColor}30` }}>
                <div className="flex items-center gap-2 mb-2">
                  <TeamLogo src={seattleLogoUrl} emoji={game.seattleTeam.emoji} abbr={game.seattleTeam.abbr} size={22} />
                  <span className="font-display text-[12px] font-700 text-white truncate">{game.seattleTeam.shortName}</span>
                </div>
                <div className="font-display text-[26px] font-800 text-white tabular-nums leading-none">
                  {game.seattleRecord ? `${game.seattleRecord.wins}–${game.seattleRecord.losses}` : "–"}
                </div>
                {game.seattleRecord && (
                  <div className="text-[10px] text-zinc-500 mt-1">
                    {((game.seattleRecord.wins / Math.max(game.seattleRecord.wins + game.seattleRecord.losses, 1)) * 100).toFixed(1)}% win rate
                  </div>
                )}
              </div>
              <div className="rounded-xl px-4 py-3" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
                <div className="flex items-center gap-2 mb-2">
                  <TeamLogo src={game.opponent.logo} emoji="🏟️" abbr={game.opponent.abbr} size={22} />
                  <span className="font-display text-[12px] font-700 text-zinc-300 truncate">{game.opponent.shortName || game.opponent.abbr}</span>
                </div>
                <div className="font-display text-[26px] font-800 text-zinc-300 tabular-nums leading-none">
                  {game.opponentRecord ? `${game.opponentRecord.wins}–${game.opponentRecord.losses}` : "–"}
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

        {/* Schedule for both teams */}
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
