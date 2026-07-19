"use client"
import { useState, useEffect, useCallback } from "react"
import { Game } from "@/lib/types"
import { getTeamLogoUrl } from "@/lib/teams"
import TeamLogo from "./TeamLogo"
import BoxScore from "./BoxScore"
import CompactBaseballLineScore from "./CompactBaseballLineScore"
import TeamDetailSheet from "./TeamDetailSheet"
import UpcomingScheduleSection from "./UpcomingScheduleSection"

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatRecord(r?: { wins: number; losses: number; ties?: number }): string {
  if (!r) return ""
  return r.ties ? `${r.wins}-${r.losses}-${r.ties}` : `${r.wins}-${r.losses}`
}

function parseKickoff(kickoff: string): Date {
  if (!kickoff) return new Date(NaN)
  if (kickoff.includes("T") || kickoff.startsWith("20")) return new Date(kickoff)
  const [datePart = "", timePart = "00:00:00"] = kickoff.split(" ")
  const parts = datePart.split("/")
  if (parts.length === 3) {
    const [mm, dd, yyyy] = parts
    return new Date(`${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}T${timePart}Z`)
  }
  return new Date(kickoff)
}

function fmtDate(iso: string) {
  return parseKickoff(iso).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
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

/** Convert a hex color to RGB components for use in rgba() */
function hexToRgb(hex: string): string {
  const clean = hex.replace("#", "")
  const full = clean.length === 3
    ? clean.split("").map(c => c + c).join("")
    : clean
  const r = parseInt(full.slice(0,2), 16)
  const g = parseInt(full.slice(2,4), 16)
  const b = parseInt(full.slice(4,6), 16)
  if (isNaN(r) || isNaN(g) || isNaN(b)) return "55,65,81"
  return `${r},${g},${b}`
}

// ── Team detail shape (from /api/team-detail) ─────────────────────────────────

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
function SectionLabel({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 mb-3">
      <div className="flex-1 h-px bg-zinc-800" />
      <span className="font-display text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500 flex-shrink-0">
        {label}
      </span>
      <div className="flex-1 h-px bg-zinc-800" />
    </div>
  )
}

/** W/L/T form dots */
function RecentFormDots({ form }: { form: { result: "W" | "L" | "T" }[] }) {
  if (!form || form.length === 0) return null
  return (
    <div className="flex items-center gap-1.5">
      {form.slice(0, 5).map((f, i) => (
        <div
          key={i}
          className="rounded-full flex-shrink-0"
          style={{
            width: 10,
            height: 10,
            background: f.result === "W" ? "#34d399" : f.result === "L" ? "#f87171" : "#52525b",
            boxShadow: f.result === "W" ? "0 0 6px #34d399aa" : "none",
          }}
          title={f.result}
        />
      ))}
    </div>
  )
}

/** Compact team context card — record, form dots, division rank */
function TeamContextCard({
  name, logo, emoji, abbr, color, record, detail, label,
}: {
  name: string; logo: string; emoji: string; abbr: string
  color: string
  record?: { wins: number; losses: number; ties?: number }
  detail: TeamDetail | null
  label: "Away" | "Home"
}) {
  const wins    = detail?.wins   ?? record?.wins
  const losses  = detail?.losses ?? record?.losses
  const ties    = record?.ties
  const divRank = detail?.divisionRank
  const divName = detail?.divisionName ?? ""
  const form    = (detail?.recentForm ?? []).slice(0, 5)
  const standings = detail?.divisionStandings ?? []

  return (
    <div className="space-y-3.5">
      {/* Team header row */}
      <div className="flex items-center gap-2.5">
        <TeamLogo src={logo} emoji={emoji} abbr={abbr} size={26} />
        <div className="flex-1 min-w-0">
          <div className="font-display text-[13px] font-bold text-white truncate leading-tight">{name}</div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="font-display text-[9px] uppercase tracking-[0.14em] text-zinc-600">{label}</span>
            {wins !== undefined && losses !== undefined && (
              <span className="text-[11px] text-zinc-500">
                · {wins}–{losses}{ties !== undefined && ties > 0 ? `–${ties}` : ""}
              </span>
            )}
            {divRank !== null && divRank !== undefined && divName && (
              <span className="text-[11px] text-zinc-600">· #{divRank} {divName}</span>
            )}
          </div>
        </div>
      </div>

      {/* Last 5 form */}
      {form.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="font-display text-[10px] uppercase tracking-wider text-zinc-600 w-12 flex-shrink-0">Last 5</span>
          <RecentFormDots form={form} />
        </div>
      )}

      {/* Division standings mini-table */}
      {standings.length > 0 && (
        <div>
          <div className="font-display text-[10px] uppercase tracking-wider text-zinc-600 mb-1.5">{divName || "Division"}</div>
          <div className="space-y-0.5">
            {standings.map((row, i) => (
              <div
                key={i}
                className="flex items-center gap-2 py-1"
                style={{
                  borderLeft: row.isThis ? `2px solid ${color}` : "2px solid transparent",
                  paddingLeft: 6,
                }}
              >
                {row.logo
                  ? <img src={row.logo} alt={row.abbr} width={13} height={13} className="object-contain flex-shrink-0" style={{ opacity: row.isThis ? 1 : 0.5 }} />
                  : <div className="w-3 h-3 rounded-full bg-white/10 flex-shrink-0" />
                }
                <span className={`font-display text-[12px] flex-1 truncate ${row.isThis ? "font-bold text-white" : "text-zinc-500"}`}>{row.abbr}</span>
                <span className={`font-display text-[12px] tabular-nums ${row.isThis ? "font-bold text-white" : "text-zinc-500"}`}>{row.wins}–{row.losses}</span>
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
  const hasScore   = (isLive || isFt) && game.seattleScore !== undefined && game.opponentScore !== undefined
  const seattleColor   = game.seattleTeam.primaryColor || "#1a56db"
  const seattleLogoUrl = getTeamLogoUrl(game.seattleTeam)
  const liveDetail     = isLive ? getLiveDetail(game) : ""
  const canShowBoxScore = (isLive || isFt) && !!game.id

  const league = game.league
  const seaId  = game.seattleTeam.espnId || game.seattleTeam.id
  const oppId  = game.opponent.id

  useEffect(() => {
    if (!seaId || !oppId) return
    Promise.all([
      fetch(`/api/team-detail?teamId=${encodeURIComponent(seaId)}&league=${encodeURIComponent(league)}`).then(r => r.ok ? r.json() : null),
      fetch(`/api/team-detail?teamId=${encodeURIComponent(oppId)}&league=${encodeURIComponent(league)}`).then(r => r.ok ? r.json() : null),
    ]).then(([sea, opp]) => {
      if (sea) setSeaDetail(sea)
      if (opp) setOppDetail(opp)
    }).catch(() => {})
  }, [seaId, oppId, league])

  // Dismiss on Escape key
  const handleKey = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") onClose()
  }, [onClose])
  useEffect(() => {
    document.addEventListener("keydown", handleKey)
    return () => document.removeEventListener("keydown", handleKey)
  }, [handleKey])

  // Away = left, Home = right
  const oppColor   = oppDetail?.color || "#374151"
  const awayColor  = game.isHome ? oppColor     : seattleColor
  const homeColor  = game.isHome ? seattleColor : oppColor

  const awayLogo   = game.isHome ? game.opponent.logo  : seattleLogoUrl
  const awayEmoji  = game.isHome ? "🏟️"                : game.seattleTeam.emoji
  const awayAbbr   = game.isHome ? game.opponent.abbr  : game.seattleTeam.abbr
  const awayName   = game.isHome ? (game.opponent.shortName || game.opponent.name) : game.seattleTeam.shortName
  const awayRecord = game.isHome ? game.opponentRecord : game.seattleRecord
  const awayDetail = game.isHome ? oppDetail           : seaDetail

  const homeLogo   = game.isHome ? seattleLogoUrl      : game.opponent.logo
  const homeEmoji  = game.isHome ? game.seattleTeam.emoji : "🏟️"
  const homeAbbr   = game.isHome ? game.seattleTeam.abbr  : game.opponent.abbr
  const homeName   = game.isHome ? game.seattleTeam.shortName : (game.opponent.shortName || game.opponent.name)
  const homeRecord = game.isHome ? game.seattleRecord   : game.opponentRecord
  const homeDetail = game.isHome ? seaDetail             : oppDetail

  const awayScore = game.isHome ? game.opponentScore : game.seattleScore
  const homeScore = game.isHome ? game.seattleScore  : game.opponentScore
  const awayWon   = hasScore && (awayScore ?? 0) > (homeScore ?? 0)
  const homeWon   = hasScore && (homeScore ?? 0) > (awayScore ?? 0)

  // Build gradient: team-color blobs on left/right, deep navy in center
  const awayRgb = hexToRgb(awayColor)
  const homeRgb = hexToRgb(homeColor)
  const headerGradient = `
    radial-gradient(ellipse 55% 100% at 0% 50%, rgba(${awayRgb},0.22) 0%, transparent 70%),
    radial-gradient(ellipse 55% 100% at 100% 50%, rgba(${homeRgb},0.22) 0%, transparent 70%),
    linear-gradient(180deg, #0d1f38 0%, #0c1b31 100%)
  `

  const showTeamContext = (awayDetail || awayRecord) && (homeDetail || homeRecord)

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-[3px] z-[9999]"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${awayName} vs ${homeName} game detail`}
        className="fixed bottom-0 left-0 right-0 z-[10000] lg:max-w-2xl lg:mx-auto flex flex-col rounded-t-[20px] overflow-hidden animate-slide-up"
        style={{
          background: "#0c1b31",
          paddingBottom: "env(safe-area-inset-bottom)",
          maxHeight: "94dvh",
          boxShadow: "0 -4px 40px rgba(0,0,0,0.7)",
        }}
        onClick={e => e.stopPropagation()}
      >

        {/* ── HEADER ── */}
        <div
          className="relative flex-shrink-0 px-5 pt-3 pb-6"
          style={{ background: headerGradient }}
        >
          {/* Drag handle */}
          <div className="flex justify-center mb-3">
            <div className="w-9 h-1 rounded-full bg-white/20" />
          </div>

          {/* Close + league row */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <span className="font-display text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500">
                {game.league}
              </span>
              {game.weekLabel && (
                <span className="text-[11px] text-zinc-600">· {game.weekLabel}</span>
              )}
            </div>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-full bg-white/[0.08] flex items-center justify-center text-zinc-400 text-[13px] hover:bg-white/[0.14] hover:text-white transition-colors"
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          {/* ── SCOREBOARD HERO ── */}
          <div className="flex items-center gap-3">

            {/* Away team */}
            <button
              className="flex-1 flex flex-col items-center gap-2 active:scale-95 transition-transform min-w-0"
              onClick={() => setTeamSheet(game.isHome
                ? { id: game.opponent.id, name: game.opponent.name, logo: game.opponent.logo }
                : { id: game.seattleTeam.espnId, name: game.seattleTeam.name, logo: seattleLogoUrl }
              )}
            >
              <div
                className="rounded-2xl p-2 flex items-center justify-center"
                style={{ background: `rgba(${awayRgb},0.12)`, border: `1px solid rgba(${awayRgb},0.2)` }}
              >
                <TeamLogo src={awayLogo} emoji={awayEmoji} abbr={awayAbbr} size={52}
                  className={hasScore && homeWon ? "opacity-40" : ""} />
              </div>
              <div className="text-center min-w-0 w-full px-1">
                <div className={`font-display text-[15px] font-bold leading-tight truncate ${hasScore && homeWon ? "text-zinc-600" : "text-white"}`}>
                  {awayName}
                </div>
                <div className="font-display text-[9px] uppercase tracking-[0.14em] text-zinc-600 mt-0.5">{awayAbbr}</div>
                {(awayRecord || awayDetail?.wins !== undefined) && (
                  <div className="text-[11px] text-zinc-500 mt-0.5">
                    {awayRecord ? formatRecord(awayRecord) : `${awayDetail!.wins}-${awayDetail!.losses}`}
                  </div>
                )}
              </div>
            </button>

            {/* Score / vs center */}
            <div className="flex flex-col items-center justify-center flex-shrink-0 gap-1.5">
              {hasScore ? (
                <>
                  <div className="flex items-center gap-0 tabular-nums leading-none">
                    <span
                      className="font-display font-black"
                      style={{
                        fontSize: 62,
                        lineHeight: 1,
                        color: hasScore && homeWon ? "#3f4f62" : "#f2e6cf",
                        letterSpacing: "-1px",
                      }}
                    >
                      {awayScore}
                    </span>
                    <span className="font-display font-black text-zinc-700 mx-2" style={{ fontSize: 28, lineHeight: 1 }}>–</span>
                    <span
                      className="font-display font-black"
                      style={{
                        fontSize: 62,
                        lineHeight: 1,
                        color: hasScore && awayWon ? "#3f4f62" : "#f2e6cf",
                        letterSpacing: "-1px",
                      }}
                    >
                      {homeScore}
                    </span>
                  </div>

                  {/* Status badge */}
                  <div className="flex items-center gap-1.5 mt-1">
                    {isLive ? (
                      <>
                        <span className="relative flex h-1.5 w-1.5 flex-shrink-0">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500" />
                        </span>
                        <span className="font-display text-[11px] font-bold uppercase tracking-[0.14em] text-red-400">Live</span>
                        {liveDetail && (
                          <span className="font-display text-[11px] text-zinc-400">· {liveDetail}</span>
                        )}
                      </>
                    ) : (
                      <span className="font-display text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500">Final</span>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <span className="font-display text-[28px] font-black text-zinc-700 leading-none">vs</span>
                  <div className="flex flex-col items-center gap-0.5 mt-1">
                    <span className="font-display text-[15px] font-bold text-zinc-200 tabular-nums">
                      {parseKickoff(game.kickoff).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                    </span>
                    <span className="font-display text-[10px] uppercase tracking-wider text-zinc-600">
                      {fmtDate(game.kickoff)}
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* Home team */}
            <button
              className="flex-1 flex flex-col items-center gap-2 active:scale-95 transition-transform min-w-0"
              onClick={() => setTeamSheet(game.isHome
                ? { id: game.seattleTeam.espnId, name: game.seattleTeam.name, logo: seattleLogoUrl }
                : { id: game.opponent.id, name: game.opponent.name, logo: game.opponent.logo }
              )}
            >
              <div
                className="rounded-2xl p-2 flex items-center justify-center"
                style={{ background: `rgba(${homeRgb},0.12)`, border: `1px solid rgba(${homeRgb},0.2)` }}
              >
                <TeamLogo src={homeLogo} emoji={homeEmoji} abbr={homeAbbr} size={52}
                  className={hasScore && awayWon ? "opacity-40" : ""} />
              </div>
              <div className="text-center min-w-0 w-full px-1">
                <div className={`font-display text-[15px] font-bold leading-tight truncate ${hasScore && awayWon ? "text-zinc-600" : "text-white"}`}>
                  {homeName}
                </div>
                <div className="font-display text-[9px] uppercase tracking-[0.14em] text-zinc-600 mt-0.5">{homeAbbr}</div>
                {(homeRecord || homeDetail?.wins !== undefined) && (
                  <div className="text-[11px] text-zinc-500 mt-0.5">
                    {homeRecord ? formatRecord(homeRecord) : `${homeDetail!.wins}-${homeDetail!.losses}`}
                  </div>
                )}
              </div>
            </button>

          </div>{/* end scoreboard hero */}

          {/* Venue + broadcast footer — inside header */}
          <div className="flex items-center justify-center flex-wrap gap-x-3 gap-y-0.5 mt-5">
            {game.venue?.city && (
              <span className="text-[11px] text-zinc-600">
                📍 {game.venue.name ? `${game.venue.name}, ` : ""}{game.venue.city}{game.venue.state ? `, ${game.venue.state}` : ""}
              </span>
            )}
            {game.broadcast && (
              <span className="text-[11px] text-zinc-600">📺 {game.broadcast}</span>
            )}
          </div>

          {/* Hairline divider at bottom of header */}
          <div className="absolute bottom-0 left-5 right-5 h-px bg-zinc-800/60" />
        </div>

        {/* ── SCROLLABLE BODY ── */}
        <div className="overflow-y-auto flex-1 px-5 pt-5 pb-12">

          {/* Baseball inline line score */}
          {canShowBoxScore && game.sport === "baseball" && (
            <div className="mb-5">
              <SectionLabel label="Line Score" />
              <div className="rounded-xl overflow-hidden" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <div className="px-3 py-3">
                  <CompactBaseballLineScore
                    gameId={game.id}
                    league={game.league}
                    seattleTeamId={game.seattleTeam.espnId || game.seattleTeam.id}
                    isLive={isLive}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Full box score for other sports */}
          {canShowBoxScore && game.sport !== "baseball" && (
            <div className="mb-5">
              <div className="rounded-xl overflow-hidden" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <div className="px-3 py-3">
                  <BoxScore
                    eventId={game.id.includes("|") ? game.id.split("|").at(-1)! : game.id}
                    league={game.league}
                    seattleTeamId={game.seattleTeam.espnId}
                    color={isLive ? "#ef4444" : (game.seattleTeam.primaryColor ?? "#D95C17")}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Team context — two-column card */}
          {showTeamContext && (
            <div className="mb-5">
              <SectionLabel label="Teams" />
              <div
                className="rounded-xl grid grid-cols-2 divide-x divide-zinc-800/60"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
              >
                <div className="p-4">
                  <TeamContextCard
                    name={awayName}
                    logo={awayLogo}
                    emoji={awayEmoji}
                    abbr={awayAbbr}
                    color={awayColor}
                    record={awayRecord}
                    detail={awayDetail}
                    label="Away"
                  />
                </div>
                <div className="p-4">
                  <TeamContextCard
                    name={homeName}
                    logo={homeLogo}
                    emoji={homeEmoji}
                    abbr={homeAbbr}
                    color={homeColor}
                    record={homeRecord}
                    detail={homeDetail}
                    label="Home"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Upcoming schedule */}
          <UpcomingScheduleSection game={game} />

        </div>{/* end scrollable body */}
      </div>{/* end sheet */}

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
