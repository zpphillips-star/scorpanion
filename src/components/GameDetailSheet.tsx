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

interface DivStandingRow {
  abbr: string
  logo: string
  wins: number
  losses: number
  winPct: number
  isThis: boolean
}

interface TeamDetail {
  color: string
  altColor: string
  recentForm: { result: "W" | "L" | "T" }[]
  divisionRank: number | null
  divisionName: string
  wins: number
  losses: number
  ties?: number
  divisionStandings: DivStandingRow[]
}

// ── Sub-components ────────────────────────────────────────────────────────────

/** ALL-CAPS section label flanked by hairline dividers */
function SectionHeader({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 mb-2.5">
      <div className="flex-1 h-px bg-zinc-800" />
      <span className="font-display text-[9px] font-700 uppercase tracking-[0.18em] text-zinc-500 px-0.5">
        {label}
      </span>
      <div className="flex-1 h-px bg-zinc-800" />
    </div>
  )
}

/** Form dots — up to 5, larger (11 px), green glow on wins, inset shadow on losses */
function RecentFormDots({ form }: { form: { result: "W" | "L" | "T" }[] }) {
  if (!form || form.length === 0) return null
  const dots = form.slice(0, 5)
  return (
    <div className="flex items-center gap-1.5">
      {dots.map((f, i) => (
        <div
          key={i}
          className="rounded-full flex-shrink-0"
          style={{
            width: 11,
            height: 11,
            background: f.result === "W" ? "#34d399" : f.result === "L" ? "#f87171" : "#6b7280",
            boxShadow:
              f.result === "W"
                ? "0 0 7px #34d399bb, inset 0 1px 1px rgba(255,255,255,0.25)"
                : f.result === "L"
                ? "inset 0 2px 4px rgba(0,0,0,0.55)"
                : "none",
          }}
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
  const wins      = detail?.wins   ?? record?.wins
  const losses    = detail?.losses ?? record?.losses
  const ties      = record?.ties
  const divRank   = detail?.divisionRank
  const divName   = detail?.divisionName ?? ""
  const form      = (detail?.recentForm ?? []).slice(0, 5)
  const standings = detail?.divisionStandings ?? []

  return (
    <div className="space-y-4">

      {/* Team header */}
      <div className="flex items-center gap-2">
        <TeamLogo src={logo} emoji={emoji} abbr={abbr} size={24} />
        <div className="flex-1 min-w-0">
          <div className="font-display text-[13px] font-700 text-white truncate">{name}</div>
          <div className="font-display text-[10px] uppercase tracking-widest text-zinc-600">{label}</div>
        </div>
        {wins !== undefined && losses !== undefined && (
          <div className="text-right">
            <div className="font-display text-[22px] font-800 text-white tabular-nums leading-none">
              {wins}–{losses}{ties !== undefined && ties > 0 ? `–${ties}` : ""}
            </div>
            {divRank !== null && divRank !== undefined && divName && (
              <div className="font-display text-[10px] text-zinc-500 mt-0.5 text-right">#{divRank} {divName}</div>
            )}
          </div>
        )}
      </div>

      {/* Last 5 Games form dots */}
      {form.length > 0 && (
        <div>
          <div className="font-display text-[10px] font-700 uppercase tracking-wider text-zinc-600 mb-1.5">Last 5</div>
          <RecentFormDots form={form} />
        </div>
      )}

      {/* Conference / division standings */}
      {standings.length > 0 && (
        <div>
          <div className="font-display text-[10px] font-700 uppercase tracking-wider text-zinc-600 mb-1.5">{divName || "Division"}</div>
          <div>
            {standings.map((row, i) => (
              <div
                key={i}
                className="flex items-center gap-2 py-1.5 border-b border-zinc-800/50 last:border-0"
                style={{
                  borderLeft: row.isThis ? `3px solid ${color}` : "3px solid transparent",
                  paddingLeft: "6px",
                }}
              >
                {row.logo ? (
                  <img
                    src={row.logo}
                    alt={row.abbr}
                    width={14}
                    height={14}
                    className="object-contain flex-shrink-0"
                    style={{ opacity: row.isThis ? 1 : 0.55 }}
                  />
                ) : (
                  <div className="w-3.5 h-3.5 rounded-full bg-white/10 flex-shrink-0" />
                )}
                <span className={`font-display text-[12px] flex-1 truncate ${row.isThis ? "font-700 text-white" : "text-zinc-500"}`}>
                  {row.abbr}
                </span>
                <span className={`font-display text-[12px] tabular-nums ${row.isThis ? "font-700 text-white" : "text-zinc-500"}`}>
                  {row.wins}–{row.losses}
                </span>
              </div>
            ))}
          </div>
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
          {/* Dual-color wash */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `linear-gradient(to right, ${awayColor}70 0%, ${awayColor}30 42%, transparent 50%, ${homeColor}30 58%, ${homeColor}70 100%)`,
            }}
          />
          {/* Top gradient fade behind status badges for readability */}
          <div
            className="absolute top-0 left-0 right-0 h-24 pointer-events-none"
            style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.38), transparent)" }}
          />
          {/* Bottom fade into surface */}
          <div
            className="absolute bottom-0 left-0 right-0 h-10 pointer-events-none"
            style={{ background: "linear-gradient(to bottom, transparent, var(--surface))" }}
          />

          <div className="relative px-5 pt-5 pb-7">
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white/60 hover:text-white text-sm z-10"
            >✕</button>

            {/* Status + broadcast badges — centered */}
            <div className="flex items-center justify-center gap-2 mb-6">
              {isLive ? (
                <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-red-500/15 border border-red-500/30">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                  </span>
                  <span className="font-display text-[12px] font-800 text-red-400 uppercase tracking-wider">Live</span>
                </div>
              ) : isFt ? (
                <span className="font-display text-[12px] font-700 text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3.5 py-1.5 rounded-full uppercase tracking-wider">Final</span>
              ) : (
                <span className="font-display text-[12px] font-700 text-sky-400 bg-sky-500/10 border border-sky-500/20 px-3.5 py-1.5 rounded-full uppercase tracking-wider">Upcoming</span>
              )}
              {game.broadcast && (
                <span className="font-display text-[12px] font-700 text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3.5 py-1.5 rounded-full">{game.broadcast}</span>
              )}
            </div>

            {/* Teams + score / time row */}
            <div className="flex items-center justify-between gap-3">

              {/* Away (left) */}
              <button
                className="flex-1 flex flex-col items-center gap-2 active:scale-95 transition-transform"
                onClick={() => setTeamSheet({ id: awayId, name: awayName, logo: awayLogo })}
              >
                <div style={{ opacity: hasScore && !awayWon && homeWon ? 0.35 : 1, transition: "opacity 0.2s" }}>
                  <TeamLogo src={awayLogo} emoji={awayEmoji} abbr={awayAbbr} size={80} />
                </div>
                <span className={`font-display text-[15px] font-700 text-center leading-tight max-w-[100px] ${hasScore && !awayWon && homeWon ? "text-zinc-500" : "text-white"}`}>
                  {awayName}
                </span>
                {awayRecord && (
                  <span className="font-display text-[12px] text-zinc-400 tabular-nums -mt-1">{formatRecord(awayRecord)}</span>
                )}
                <span className="font-display text-[10px] font-600 text-zinc-600 uppercase tracking-[0.18em] bg-white/5 px-2 py-0.5 rounded-full">Away</span>
              </button>

              {/* Center — score OR vs+time */}
              <div className="flex flex-col items-center gap-1.5 flex-shrink-0 min-w-[96px]">
                {hasScore ? (
                  <>
                    <div
                      className={`font-display font-800 tabular-nums leading-none ${isLive ? "text-red-300" : "text-white"}`}
                      style={{ fontSize: "76px" }}
                    >
                      <span style={{ color: isLive ? undefined : (awayWon || (!awayWon && !homeWon)) ? "#f0f0f8" : "#5a5a7a" }}>{awayScore}</span>
                      <span className="text-zinc-600 mx-1" style={{ fontSize: "30px" }}>–</span>
                      <span style={{ color: isLive ? undefined : (homeWon || (!awayWon && !homeWon)) ? "#f0f0f8" : "#5a5a7a" }}>{homeScore}</span>
                    </div>
                    {isLive && liveDetail && (
                      <div className="mt-1 px-3.5 py-1.5 rounded-full bg-red-500/15 border border-red-500/25">
                        <span className="font-display text-[13px] font-700 text-red-300">{liveDetail}</span>
                      </div>
                    )}
                    {isFt && (
                      <span className="font-display text-[22px] leading-none mt-1" style={{ color: awayWon || homeWon ? "#00d4ff" : "#52525b" }}>
                        {awayWon ? "◀" : homeWon ? "▶" : "—"}
                      </span>
                    )}
                  </>
                ) : (
                  <>
                    <span className="font-display text-[11px] font-700 text-zinc-500 uppercase tracking-[0.25em]">vs</span>
                    <span className="font-display text-[22px] font-800 text-white text-center leading-tight">
                      {new Date(game.kickoff).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}
                    </span>
                    <span className="font-display text-[11px] text-zinc-400 text-center">
                      {new Date(game.kickoff).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                    </span>
                  </>
                )}
              </div>

              {/* Home (right) */}
              <button
                className="flex-1 flex flex-col items-center gap-2 active:scale-95 transition-transform"
                onClick={() => setTeamSheet({ id: homeId, name: homeName, logo: homeLogo })}
              >
                <div style={{ opacity: hasScore && !homeWon && awayWon ? 0.35 : 1, transition: "opacity 0.2s" }}>
                  <TeamLogo src={homeLogo} emoji={homeEmoji} abbr={homeAbbr} size={80} />
                </div>
                <span className={`font-display text-[15px] font-700 text-center leading-tight max-w-[100px] ${hasScore && !homeWon && awayWon ? "text-zinc-500" : "text-white"}`}>
                  {homeName}
                </span>
                {homeRecord && (
                  <span className="font-display text-[12px] text-zinc-400 tabular-nums -mt-1">{formatRecord(homeRecord)}</span>
                )}
                <span className="font-display text-[10px] font-600 text-zinc-600 uppercase tracking-[0.18em] bg-white/5 px-2 py-0.5 rounded-full">Home</span>
              </button>
            </div>

            {/* Venue pill — always, if available */}
            {game.venue?.name && (
              <div className="flex justify-center mt-5">
                <span className="text-[12px] text-zinc-400 bg-white/5 border border-white/10 px-4 py-2 rounded-full flex items-center gap-2">
                  📍 {game.venue.name}{game.venue.city ? `, ${game.venue.city}` : ""}{game.venue.state ? `, ${game.venue.state}` : ""}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Box score for live/completed games */}
        {canShowBoxScore && (
          <div className="px-4 pb-4 -mt-1">
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
          <div className="border-t border-zinc-800/60">
            <div className="px-5 pt-5 pb-2">
              <span className="font-display text-[10px] font-700 uppercase tracking-[0.18em] text-zinc-500">Team Overview</span>
            </div>
            <div className="px-5 py-4 border-t border-zinc-800/40">
              <TeamContextCard
                name={awayName} logo={awayLogo} emoji={awayEmoji} abbr={awayAbbr}
                color={awayColor} record={awayRecord} detail={awayDetail} label="Away"
              />
            </div>
            <div className="px-5 py-4 border-t border-zinc-800/60">
              <TeamContextCard
                name={homeName} logo={homeLogo} emoji={homeEmoji} abbr={homeAbbr}
                color={homeColor} record={homeRecord} detail={homeDetail} label="Home"
              />
            </div>
          </div>
        )}

        {/* Season records — live/completed games */}
        {!isUpcoming && (game.seattleRecord || game.opponentRecord) && (
          <div className="border-t border-zinc-800/60">
            <div className="px-5 pt-5 pb-2">
              <span className="font-display text-[10px] font-700 uppercase tracking-[0.18em] text-zinc-500">Season Records</span>
            </div>
            <div className="grid grid-cols-2 divide-x divide-zinc-800/60">
              <div className="px-5 py-4">
                <div className="flex items-center gap-2 mb-3">
                  <TeamLogo src={seattleLogoUrl} emoji={game.seattleTeam.emoji} abbr={game.seattleTeam.abbr} size={22} />
                  <span className="font-display text-[12px] font-700 text-white truncate">{game.seattleTeam.shortName}</span>
                </div>
                <div className="font-display text-[30px] font-800 text-white tabular-nums leading-none">
                  {game.seattleRecord ? `${game.seattleRecord.wins}–${game.seattleRecord.losses}` : "–"}
                </div>
                {game.seattleRecord && (
                  <div className="text-[11px] text-zinc-500 mt-1.5">
                    {((game.seattleRecord.wins / Math.max(game.seattleRecord.wins + game.seattleRecord.losses, 1)) * 100).toFixed(1)}% win rate
                  </div>
                )}
              </div>
              <div className="px-5 py-4">
                <div className="flex items-center gap-2 mb-3">
                  <TeamLogo src={game.opponent.logo} emoji="🏟️" abbr={game.opponent.abbr} size={22} />
                  <span className="font-display text-[12px] font-700 text-zinc-300 truncate">{game.opponent.shortName || game.opponent.abbr}</span>
                </div>
                <div className="font-display text-[30px] font-800 text-zinc-300 tabular-nums leading-none">
                  {game.opponentRecord ? `${game.opponentRecord.wins}–${game.opponentRecord.losses}` : "–"}
                </div>
                {game.opponentRecord && (
                  <div className="text-[11px] text-zinc-500 mt-1.5">
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
