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

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
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

/** ALL-CAPS section label flanked by hairline dividers — WC style */
function SectionHeader({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 mb-3">
      <div className="flex-1 h-px bg-zinc-800" />
      <span className="font-display text-[10px] font-700 uppercase tracking-widest text-zinc-500 flex-shrink-0">
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
  const canShowBoxScore = (isLive || isFt) && !!game.id

  const league = game.league
  // For WHL/PWHL teams espnId is empty — fall back to internal team id so team-detail API can handle them
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
        className="fixed bottom-0 left-0 right-0 z-50 lg:max-w-4xl lg:mx-auto overflow-hidden flex flex-col animate-slide-up"
        style={{ background: "#0f0f18", paddingBottom: "env(safe-area-inset-bottom)", maxHeight: "96dvh" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Fixed header */}
        <div className="relative bg-gradient-to-b from-[#0a1628] to-[#0f0f18] px-5 pt-4 pb-8 flex-shrink-0">
          <button onClick={onClose} className="absolute top-4 right-5 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white text-sm hover:bg-white/20 transition-colors">✕</button>

          {/* Status + date row */}
          <div className="flex items-center gap-2 mb-4">
            {isLive ? (
              <span className="text-[11px] font-bold text-red-400 animate-pulse">● LIVE</span>
            ) : isFt ? (
              <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">FINAL</span>
            ) : (
              <span className="text-[11px] text-zinc-500">Upcoming</span>
            )}
            <span className="text-[11px] text-zinc-600">{fmtDate(game.kickoff)}</span>
            {game.broadcast && <span className="text-[11px] text-zinc-600">{game.broadcast}</span>}
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
              <TeamLogo src={game.isHome ? game.opponent.logo : seattleLogoUrl} emoji={game.isHome ? "🏟️" : game.seattleTeam.emoji} abbr={game.isHome ? game.opponent.abbr : game.seattleTeam.abbr} size={72} />
              <span className="font-display text-[14px] font-semibold text-white text-center leading-tight">
                {game.isHome ? (game.opponent.shortName || game.opponent.name) : game.seattleTeam.shortName}
              </span>
            </button>

            {/* Score */}
            <div className="flex flex-col items-center gap-1 flex-shrink-0">
              {hasScore ? (
                <span className={`text-[52px] font-black tabular-nums leading-none ${isLive ? "text-red-400" : "text-white"}`}>
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
              <TeamLogo src={game.isHome ? seattleLogoUrl : game.opponent.logo} emoji={game.isHome ? game.seattleTeam.emoji : "🏟️"} abbr={game.isHome ? game.seattleTeam.abbr : game.opponent.abbr} size={72} />
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
        <div className="overflow-y-auto flex-1 px-4 pt-4 pb-10">
          {canShowBoxScore && (
            <BoxScore
              eventId={game.id.includes("|") ? game.id.split("|").at(-1)! : game.id}
              league={game.league}
              seattleTeamId={game.seattleTeam.espnId}
              color={isLive ? "#ef4444" : (game.seattleTeam.primaryColor ?? "#00d4ff")}
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
                  <span className="text-[36px] font-black text-white tabular-nums leading-none">
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
                  <span className="text-[36px] font-black text-white tabular-nums leading-none">
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
