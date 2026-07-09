"use client"
import { useState, useEffect, useMemo } from "react"
import Image from "next/image"
import { SEATTLE_TEAMS, getTeamLogoUrl } from "@/lib/teams"
import { useSelectedTeams } from "@/hooks/useSelectedTeams"
import { useFollowedOtherTeams } from "@/hooks/useFollowedOtherTeams"
import { useTeamClickCounts } from "@/hooks/useTeamClickCounts"
import { ALL_PRO_TEAMS } from "@/lib/allProTeams"
import TeamLogo from "@/components/TeamLogo"

interface StandingsEntry {
  teamId: string; teamName: string; abbr: string; logo: string
  wins: number; losses: number; ties?: number
  winPct: number; gamesBehind: number | string; isFollowed: boolean
  gamesPlayed?: number
  overtimeLosses?: number
  points?: number
}
interface Division { name: string; entries: StandingsEntry[] }
interface ConferenceGroup { name: string; divisions: Division[] }
interface SeasonInfo {
  status: 'preseason' | 'regular' | 'playoffs' | 'offseason'
  year: number; label: string; nextStartApprox: string | null
}
interface StandingsResponse {
  season: SeasonInfo | null
  divisions: Division[]
  conferences: ConferenceGroup[]
  followedDivisionName: string | null
  followedConferenceName: string | null
}

// Map Seattle team IDs → standings league key
const TEAM_TO_LEAGUE: Record<string, string> = {
  mariners: "mlb",
  kraken: "nhl",
  storm: "wnba",
  sounders: "mls",
  seahawks: "nfl",
  reign: "nwsl",  // no API support yet
}

// League display info
const LEAGUE_INFO: Record<string, { label: string; logo: string; color: string }> = {
  mlb:  { label: "MLB",  logo: "https://a.espncdn.com/i/teamlogos/leagues/500/mlb.png",  color: "#005C5C" },
  nhl:  { label: "NHL",  logo: "https://a.espncdn.com/i/teamlogos/leagues/500/nhl.png",  color: "#99D9D9" },
  wnba: { label: "WNBA", logo: "https://a.espncdn.com/i/teamlogos/leagues/500/wnba.png", color: "#f9a000" },
  mls:  { label: "MLS",  logo: "https://a.espncdn.com/i/teamlogos/leagues/500/mls.png",  color: "#5D9732" },
  nfl:  { label: "NFL",  logo: "https://a.espncdn.com/i/teamlogos/leagues/500/nfl.png",  color: "#013369" },
  nba:  { label: "NBA",  logo: "https://a.espncdn.com/i/teamlogos/leagues/500/nba.png",  color: "#1d428a" },
}

// Supported leagues for standings API
const SUPPORTED_STANDINGS = new Set(["mlb", "nhl", "wnba", "mls", "nfl", "nba"])

function getCollegeGroupKey(teamId: string): string | null {
  if (teamId.startsWith("uw-")) return "uw"
  if (teamId.startsWith("wsu-")) return "wsu"
  if (teamId === "seattleu") return "seattleu"
  return null
}

const SPORT_LABELS: Record<string, string> = {
  football: "Football", baseball: "Baseball", basketball: "Basketball",
  volleyball: "Volleyball", lacrosse: "Lacrosse", softball: "Softball",
  soccer: "Soccer", hockey: "Hockey",
}

type Scope = "division" | "conference" | "league"

function formatPct(pct: number): string {
  if (pct >= 1) return "1.000"
  return pct.toFixed(3).replace(/^0/, "")
}

function TeamLogoImg({ src, abbr }: { src: string; abbr: string }) {
  const [err, setErr] = useState(false)
  if (err || !src) {
    return (
      <div className="w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-bold text-zinc-400" style={{ background: "var(--surface-2)" }}>
        {abbr.slice(0, 3)}
      </div>
    )
  }
  return <Image src={src} alt={abbr} width={28} height={28} className="object-contain w-7 h-7" onError={() => setErr(true)} unoptimized />
}

function SeasonBanner({ season, leagueId }: { season: SeasonInfo; leagueId: string }) {
  const info = LEAGUE_INFO[leagueId]
  const accentColor = info?.color || "#00d4ff"

  if (season.status === "offseason") {
    return (
      <div className="mx-3 mt-3 px-4 py-4 rounded-2xl" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
        <div className="flex items-center gap-3 mb-1">
          <span className="text-[22px]">💤</span>
          <div className="font-display text-[14px] font-700 text-zinc-300 uppercase tracking-widest">Off-Season</div>
        </div>
        <div className="font-display text-[12px] text-zinc-600">{season.label} · Regular season complete</div>
        {season.nextStartApprox && (
          <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
            <span className="text-[10px]">📅</span>
            <span className="font-display text-[11px] text-zinc-400">Next season starts <span className="text-white font-700">{season.nextStartApprox}</span></span>
          </div>
        )}
      </div>
    )
  }

  if (season.status === "playoffs") {
    // Playoff banner is handled by PlayoffSection — just return null here
    return null
  }

  if (season.status === "preseason") {
    return (
      <div className="mx-3 mt-3 px-4 py-3 rounded-2xl flex items-center gap-3"
        style={{ background: "rgba(168,85,247,0.08)", border: "1px solid rgba(168,85,247,0.2)" }}>
        <span className="text-[18px]">🔜</span>
        <div>
          <div className="font-display text-[12px] font-700 text-purple-400 uppercase tracking-widest">Preseason</div>
          <div className="font-display text-[11px] text-zinc-500 mt-0.5">{season.label}</div>
        </div>
      </div>
    )
  }

  // Regular season
  return (
    <div className="mx-3 mt-3 px-4 py-3 rounded-2xl flex items-center gap-3"
      style={{ background: `${accentColor}10`, border: `1px solid ${accentColor}28` }}>
      <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60" style={{ backgroundColor: accentColor }} />
        <span className="relative inline-flex rounded-full h-2.5 w-2.5" style={{ backgroundColor: accentColor }} />
      </span>
      <div>
        <div className="font-display text-[12px] font-700 uppercase tracking-widest" style={{ color: accentColor }}>Regular Season</div>
        <div className="font-display text-[11px] text-zinc-500 mt-0.5">{season.label} · In progress</div>
      </div>
    </div>
  )
}

function ScopePicker({
  scope, setScope, hasDivision, hasConference, followedDivisionName, followedConferenceName,
}: {
  scope: Scope; setScope: (s: Scope) => void
  hasDivision: boolean; hasConference: boolean
  followedDivisionName: string | null; followedConferenceName: string | null
}) {
  const options: { id: Scope; label: string; sublabel?: string }[] = []
  if (hasDivision) options.push({ id: "division", label: "Division", sublabel: followedDivisionName || undefined })
  if (hasConference) options.push({ id: "conference", label: "Conference", sublabel: followedConferenceName || undefined })
  options.push({ id: "league", label: "All Divisions" })

  if (options.length <= 1) return null

  return (
    <div className="mx-3 mt-3 flex gap-2">
      {options.map(opt => {
        const active = scope === opt.id
        return (
          <button
            key={opt.id}
            onClick={() => setScope(opt.id)}
            className="flex-1 rounded-lg px-3 py-2.5 text-center transition-all"
            style={{
              background: active ? "var(--accent)" : "var(--surface-2)",
              border: `1px solid ${active ? "var(--accent)" : "rgba(255,255,255,0.08)"}`,
              boxShadow: active ? "0 0 12px rgba(0,212,255,0.25)" : "none",
            }}
          >
            <div className={`font-display text-[12px] font-700 uppercase tracking-wide ${active ? "text-[#08080f]" : "text-zinc-400"}`}>
              {opt.label}
            </div>
            {opt.sublabel && (
              <div className={`font-display text-[9px] mt-0.5 truncate ${active ? "text-[#08080f]/70" : "text-zinc-600"}`}>
                {opt.sublabel}
              </div>
            )}
          </button>
        )
      })}
    </div>
  )
}

interface ColDef {
  key: string
  label: string
  getValue: (e: StandingsEntry) => string | number
  minWidth: number
  bold?: boolean
  muted?: boolean
  small?: boolean
}

function getColDefs(leagueId: string, entries: StandingsEntry[]): ColDef[] {
  const hasTies = entries.some(e => (e.ties ?? 0) > 0)
  switch (leagueId) {
    case 'nhl':
      return [
        { key: 'gp',  label: 'GP',  getValue: e => e.gamesPlayed ?? (e.wins + e.losses + (e.overtimeLosses ?? 0)), minWidth: 36 },
        { key: 'w',   label: 'W',   getValue: e => e.wins, minWidth: 36, bold: true },
        { key: 'l',   label: 'L',   getValue: e => e.losses, minWidth: 36 },
        { key: 'otl', label: 'OTL', getValue: e => e.overtimeLosses ?? 0, minWidth: 44, muted: true },
        { key: 'pts', label: 'PTS', getValue: e => e.points ?? 0, minWidth: 40, bold: true },
      ]
    case 'mls':
      return [
        { key: 'w',   label: 'W',   getValue: e => e.wins, minWidth: 36, bold: true },
        { key: 'd',   label: 'D',   getValue: e => e.ties ?? 0, minWidth: 36 },
        { key: 'l',   label: 'L',   getValue: e => e.losses, minWidth: 36 },
        { key: 'pts', label: 'PTS', getValue: e => e.points ?? 0, minWidth: 40, bold: true },
      ]
    case 'nfl':
      // Always show T column so all divisions have identical columns (0 when no ties)
      return [
        { key: 'w',   label: 'W',   getValue: e => e.wins, minWidth: 36, bold: true },
        { key: 'l',   label: 'L',   getValue: e => e.losses, minWidth: 36 },
        { key: 't',   label: 'T',   getValue: e => e.ties ?? 0, minWidth: 36, muted: true },
        { key: 'pct', label: 'PCT', getValue: e => formatPct(e.winPct), minWidth: 52, small: true },
      ]
    default: // mlb, nba, wnba
      return [
        { key: 'w',   label: 'W',   getValue: e => e.wins, minWidth: 36, bold: true },
        { key: 'l',   label: 'L',   getValue: e => e.losses, minWidth: 36 },
        { key: 'pct', label: 'PCT', getValue: e => formatPct(e.winPct), minWidth: 52, small: true },
        { key: 'gb',  label: 'GB',  getValue: e => {
          const gb = e.gamesBehind
          return (gb === 0 || gb === '0' || gb === '-') ? '—' : String(gb)
        }, minWidth: 40, small: true, muted: true },
      ]
  }
}

function ConferenceHeader({ name }: { name: string }) {
  return (
    <div className="px-4 pt-5 pb-1 flex items-center gap-3">
      <span className="font-display text-[12px] font-800 text-zinc-300 uppercase tracking-[0.15em]">{name}</span>
      <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.15)" }} />
    </div>
  )
}

function DivisionTable({ division, followedTeamColors, accentColor, leagueId }: {
  division: Division
  /** abbr → primaryColor for every followed team in this league */
  followedTeamColors: Record<string, string>
  /** fallback league accent color if espnId isn't in the map */
  accentColor: string
  leagueId: string
}) {
  const cols = getColDefs(leagueId, division.entries)
  const bgBase = 'rgba(8,8,15,1)'

  return (
    <div className="mb-4">
      {/* Division header */}
      <div className="px-4 py-2.5 flex items-center gap-3" style={{ background: "var(--surface-2)" }}>
        <span className="font-display text-[11px] font-700 text-zinc-400 uppercase tracking-widest">{division.name}</span>
        <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
      </div>

      {/* Sticky team col + horizontal scroll for stats */}
      <div className="overflow-x-auto no-scrollbar">
        <table style={{ borderCollapse: 'collapse', width: '100%' }}>
          <thead>
            <tr>
              <th
                className="sticky left-0 z-10 px-4 py-1.5 text-left"
                style={{ background: 'var(--surface-2)', minWidth: '160px' }}
              >
                <span className="font-display text-[10px] font-600 text-zinc-600 uppercase tracking-wider">Team</span>
              </th>
              {cols.map(col => (
                <th
                  key={col.key}
                  className="px-3 py-1.5 text-center"
                  style={{ background: 'var(--surface-2)', minWidth: `${col.minWidth}px` }}
                >
                  <span className="font-display text-[10px] font-600 text-zinc-600 uppercase tracking-wider">{col.label}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {division.entries.map((entry, idx) => {
              // Per-team brand color — falls back to league accent if abbr not in map
              const teamColor = entry.isFollowed
                ? (followedTeamColors[entry.abbr] ?? accentColor)
                : null
              const rowBg = teamColor ? `${teamColor}18` : 'transparent'
              const stickyBg = teamColor ? `color-mix(in srgb, ${teamColor} 10%, ${bgBase})` : bgBase
              return (
                <tr key={entry.teamId} style={{ borderTop: '1px solid var(--border)' }}>
                  {/* Sticky team cell */}
                  <td
                    className="sticky left-0 z-10 px-4 py-2.5"
                    style={{ background: stickyBg, minWidth: '160px' }}
                  >
                    <div className="relative flex items-center gap-2.5">
                      {teamColor && (
                        <span
                          className="absolute -left-4 top-0 bottom-0 w-1 rounded-r-full"
                          style={{ background: teamColor }}
                        />
                      )}
                      <span className="font-display text-[11px] font-600 text-zinc-600 w-4 text-center flex-shrink-0">{idx + 1}</span>
                      <TeamLogoImg src={entry.logo} abbr={entry.abbr} />
                      <div className="min-w-0">
                        <div className={`font-display text-[14px] font-700 leading-tight truncate ${teamColor ? "text-white" : "text-zinc-200"}`}>
                          {entry.teamName}
                        </div>
                      </div>
                    </div>
                  </td>
                  {cols.map(col => {
                    const val = col.getValue(entry)
                    const cls = col.bold
                      ? 'font-display tabular-nums text-[14px] font-700 text-white'
                      : col.muted
                        ? 'font-display tabular-nums text-[13px] font-500 text-zinc-500'
                        : col.small
                          ? 'font-display tabular-nums text-[13px] font-500 text-zinc-400'
                          : 'font-display tabular-nums text-[14px] font-600 text-zinc-400'
                    return (
                      <td key={col.key} className="px-3 py-2.5 text-center" style={{ background: rowBg }}>
                        <span className={cls}>{val}</span>
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// College picker dropdown for standings
function CollegeStandingsPicker({
  groupKey, availableTeams, activeCollegeSport,
  onSelect, onClose,
}: {
  groupKey: string
  availableTeams: typeof SEATTLE_TEAMS
  activeCollegeSport: string | null
  onSelect: (sport: string) => void
  onClose: () => void
}) {
  const rep = availableTeams[0]
  const school = groupKey === "uw" ? "Washington Huskies" : groupKey === "wsu" ? "WSU Cougars" : groupKey

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        className="absolute left-0 z-50 mt-1 rounded-2xl overflow-hidden shadow-2xl animate-slide-down"
        style={{ background: "var(--surface)", border: "1px solid var(--border)", top: "100%", minWidth: "180px" }}
      >
        <div className="px-3 py-2.5 border-b border-white/5 flex items-center gap-2">
          {rep && <TeamLogo src={getTeamLogoUrl(rep)} emoji={rep.emoji} abbr={rep.abbr} size={20} />}
          <span className="font-display text-[12px] font-800 text-white uppercase">{school}</span>
        </div>
        <div className="p-2.5 flex flex-col gap-1">
          {availableTeams.map(team => (
            <button
              key={team.id}
              onClick={() => onSelect(team.id)}
              className="px-3 py-2 rounded-lg text-[12px] font-700 font-display uppercase tracking-wide text-left transition-all flex items-center gap-2"
              style={{
                background: activeCollegeSport === team.id ? team.primaryColor + "30" : "var(--surface-2)",
                color: activeCollegeSport === team.id ? "#fff" : "#9ca3af",
                border: `1px solid ${activeCollegeSport === team.id ? team.primaryColor : "rgba(255,255,255,0.08)"}`,
              }}
            >
              <span className="text-sm">{team.emoji}</span>
              {SPORT_LABELS[team.sport] || team.sport}
              <span className="ml-auto text-zinc-600 text-[10px]">Coming soon</span>
            </button>
          ))}
        </div>
      </div>
    </>
  )
}

function PlayoffSection({ leagueId, accentColor, followedAbbrs }: { leagueId: string; accentColor: string; followedAbbrs: string[] }) {
  const [data, setData] = useState<{ rounds: { name: string; series: any[] }[]; currentRound: string | null; season: string } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    const highlight = followedAbbrs.join(',')
    fetch(`/api/playoffs?league=${leagueId}${highlight ? `&highlight=${highlight}` : ''}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [leagueId, followedAbbrs])

  if (loading) return (
    <div className="mx-3 mt-3 flex items-center gap-2 px-4 py-3 rounded-2xl" style={{ background: "rgba(234,179,8,0.06)", border: "1px solid rgba(234,179,8,0.15)" }}>
      <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin border-yellow-400" />
      <span className="font-display text-[11px] text-zinc-500 uppercase tracking-widest">Loading playoffs...</span>
    </div>
  )

  if (!data || data.rounds.length === 0) return (
    <div className="mx-3 mt-3 px-4 py-3 rounded-2xl flex items-center gap-3" style={{ background: "rgba(234,179,8,0.08)", border: "1px solid rgba(234,179,8,0.2)" }}>
      <span className="text-[20px]">🏆</span>
      <div>
        <div className="font-display text-[13px] font-700 text-yellow-400 uppercase tracking-widest">Playoffs Underway</div>
        <div className="font-display text-[11px] text-zinc-500 mt-0.5">Bracket data not available</div>
      </div>
    </div>
  )

  // Show the most recent/active round
  const activeRound = data.rounds[data.rounds.length - 1]
  const followedSeries = activeRound.series.filter((s: any) => s.isFollowed)
  const otherSeries = activeRound.series.filter((s: any) => !s.isFollowed)

  return (
    <div className="mx-3 mt-3">
      {/* Header */}
      <div className="flex items-center gap-3 px-1 mb-2">
        <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-60" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-yellow-400" />
        </span>
        <span className="font-display text-[13px] font-800 text-yellow-400 uppercase tracking-widest">🏆 {activeRound.name}</span>
        <div className="flex-1 h-px" style={{ background: "rgba(234,179,8,0.2)" }} />
        <span className="font-display text-[10px] text-zinc-600">{data.season}</span>
      </div>

      {/* Followed series first */}
      {[...followedSeries, ...otherSeries].map((series: any) => {
        const isFollowed = series.isFollowed
        const winsNeeded = 4 // best of 7 for most sports
        const isOver = series.status === 'final'
        const isLive = series.status === 'live'
        const hWins = series.home.wins
        const aWins = series.away.wins
        const leader = hWins > aWins ? series.home : aWins > hWins ? series.away : null

        return (
          <div
            key={series.id}
            className="mb-2 rounded-2xl overflow-hidden"
            style={{
              background: isFollowed ? `${accentColor}12` : "var(--surface)",
              border: `1px solid ${isFollowed ? accentColor + "35" : "var(--border)"}`,
            }}
          >
            {isFollowed && <div className="h-0.5" style={{ background: `linear-gradient(to right, ${accentColor}, transparent)` }} />}
            <div className="px-3 py-3 flex items-center gap-2">
              {/* Away */}
              <div className="flex-1 flex flex-col items-center gap-1">
                {series.away.logo
                  ? <img src={series.away.logo} alt={series.away.abbr} width={36} height={36} className="object-contain" />
                  : <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-[10px] text-zinc-500">{series.away.abbr}</div>
                }
                {series.away.seed && <span className="font-display text-[9px] text-zinc-600">#{series.away.seed}</span>}
                <span className={`font-display text-[12px] font-700 ${isFollowed ? "text-white" : "text-zinc-300"}`}>{series.away.abbr}</span>
              </div>

              {/* Series score center */}
              <div className="flex flex-col items-center gap-0.5 min-w-[80px]">
                <div className="font-display text-[28px] font-800 tabular-nums leading-none text-white">
                  {aWins}<span className="text-zinc-600 mx-1.5 text-[20px]">–</span>{hWins}
                </div>
                {isOver ? (
                  <span className="font-display text-[10px] font-700 uppercase tracking-widest text-zinc-500">
                    {leader ? `${leader.abbr} wins` : "Series over"}
                  </span>
                ) : isLive ? (
                  <span className="font-display text-[10px] font-700 uppercase tracking-widest text-red-400">🔴 Live</span>
                ) : (
                  <span className="font-display text-[10px] text-zinc-600 uppercase tracking-widest">
                    {leader ? `${leader.abbr} leads` : "Series tied"}
                  </span>
                )}
                <div className="flex gap-1 mt-1">
                  {Array.from({ length: winsNeeded }).map((_, i) => (
                    <div key={i} className="w-2 h-2 rounded-full" style={{
                      background: i < aWins ? (isFollowed ? accentColor : "#a1a1aa") : "var(--surface-2)",
                      border: "1px solid rgba(255,255,255,0.1)"
                    }} />
                  ))}
                  <span className="text-zinc-700 text-[9px] mx-0.5">·</span>
                  {Array.from({ length: winsNeeded }).map((_, i) => (
                    <div key={i} className="w-2 h-2 rounded-full" style={{
                      background: i < hWins ? (isFollowed ? accentColor : "#a1a1aa") : "var(--surface-2)",
                      border: "1px solid rgba(255,255,255,0.1)"
                    }} />
                  ))}
                </div>
              </div>

              {/* Home */}
              <div className="flex-1 flex flex-col items-center gap-1">
                {series.home.logo
                  ? <img src={series.home.logo} alt={series.home.abbr} width={36} height={36} className="object-contain" />
                  : <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-[10px] text-zinc-500">{series.home.abbr}</div>
                }
                {series.home.seed && <span className="font-display text-[9px] text-zinc-600">#{series.home.seed}</span>}
                <span className={`font-display text-[12px] font-700 ${isFollowed ? "text-white" : "text-zinc-300"}`}>{series.home.abbr}</span>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function StandingsClient() {
  const { selectedTeamIds, loaded } = useSelectedTeams()
  const { followedIds } = useFollowedOtherTeams()
  const { counts: _teamClickCounts, recordClick } = useTeamClickCounts()
  const [activeLeague, setActiveLeague] = useState<string>("")
  const [data, setData] = useState<StandingsResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [scope, setScope] = useState<Scope>("division")
  const [collegePicker, setCollegePicker] = useState<string | null>(null)

  // Get abbreviations of followed teams for a given standings league
  const getFollowedAbbrsForLeague = (leagueId: string): string[] => {
    const abbrs = new Set<string>()
    // Seattle teams (from useSelectedTeams)
    for (const team of SEATTLE_TEAMS) {
      if (!selectedTeamIds.includes(team.id)) continue
      if (TEAM_TO_LEAGUE[team.id] === leagueId) abbrs.add(team.abbr)
    }
    // Other followed pro teams (from useFollowedOtherTeams)
    for (const pid of followedIds) {
      const proTeam = ALL_PRO_TEAMS.find(t => t.id === pid)
      if (!proTeam) continue
      if (proTeam.league.toLowerCase() === leagueId) abbrs.add(proTeam.abbr)
    }
    return [...abbrs]
  }

  // Build available leagues from all followed teams (Seattle + others)
  const availableLeagues = (() => {
    const seen = new Set<string>()
    const result: { leagueId: string; teamId: string }[] = []
    // Seattle teams first
    for (const team of SEATTLE_TEAMS) {
      if (!selectedTeamIds.includes(team.id)) continue
      const leagueId = TEAM_TO_LEAGUE[team.id]
      if (leagueId && SUPPORTED_STANDINGS.has(leagueId) && !seen.has(leagueId)) {
        seen.add(leagueId)
        result.push({ leagueId, teamId: team.id })
      }
    }
    // Other followed pro teams
    for (const pid of followedIds) {
      const proTeam = ALL_PRO_TEAMS.find(t => t.id === pid)
      if (!proTeam) continue
      const leagueId = proTeam.league.toLowerCase()
      if (SUPPORTED_STANDINGS.has(leagueId) && !seen.has(leagueId)) {
        seen.add(leagueId)
        result.push({ leagueId, teamId: pid })
      }
    }
    return result
  })()

  // College teams followed
  const collegeGroups = (() => {
    const groups: Record<string, typeof SEATTLE_TEAMS> = {}
    for (const team of SEATTLE_TEAMS) {
      if (!selectedTeamIds.includes(team.id)) continue
      const gk = getCollegeGroupKey(team.id)
      if (gk) {
        if (!groups[gk]) groups[gk] = []
        groups[gk].push(team)
      }
    }
    return groups
  })()

  // Auto-select first available league
  useEffect(() => {
    if (!loaded) return
    if (availableLeagues.length > 0 && !activeLeague) {
      setActiveLeague(availableLeagues[0].leagueId)
    }
  }, [loaded, availableLeagues, activeLeague])

  useEffect(() => {
    if (!activeLeague || !SUPPORTED_STANDINGS.has(activeLeague)) return
    const highlight = getFollowedAbbrsForLeague(activeLeague).join(',')
    setLoading(true); setError(null); setData(null)
    fetch(`/api/standings?league=${activeLeague}${highlight ? `&highlight=${highlight}` : ''}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then((d: StandingsResponse) => {
        setData(d)
        setScope("league")
      })
      .catch(() => setError("Unable to load standings"))
      .finally(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeLeague, selectedTeamIds, followedIds])

  const accentColor = LEAGUE_INFO[activeLeague]?.color || "#00d4ff"
  const followedAbbrs = activeLeague ? getFollowedAbbrsForLeague(activeLeague) : []

  // Build abbr → primaryColor for each followed team in the active league.
  // Keyed by abbreviation (matches entry.abbr from the API) rather than espnId
  // because MLB uses statsapi IDs and NHL uses abbreviations as teamId — neither
  // matches the ESPN espnId stored in allProTeams.
  const followedTeamColors = useMemo<Record<string, string>>(() => {
    if (!activeLeague) return {}
    const map: Record<string, string> = {}
    // Seattle teams (SEATTLE_TEAMS has primaryColor + abbr directly)
    for (const team of SEATTLE_TEAMS) {
      if (!selectedTeamIds.includes(team.id)) continue
      if (TEAM_TO_LEAGUE[team.id] !== activeLeague) continue
      map[team.abbr] = team.primaryColor
    }
    // Other followed pro teams
    for (const pid of followedIds) {
      const proTeam = ALL_PRO_TEAMS.find(t => t.id === pid)
      if (!proTeam || proTeam.league.toLowerCase() !== activeLeague) continue
      map[proTeam.abbr] = proTeam.primaryColor
    }
    return map
  }, [activeLeague, selectedTeamIds, followedIds])

  const visibleDivisions: Division[] = (() => {
    if (!data) return []
    if (scope === "league") return data.divisions
    if (scope === "conference") {
      const conf = data.conferences.find(c => c.name === data.followedConferenceName)
      return conf ? conf.divisions : data.divisions
    }
    const div = data.divisions.find(d => d.name === data.followedDivisionName)
    return div ? [div] : data.divisions.slice(0, 1)
  })()

  const hasTrueDivisions = !!(data?.followedDivisionName &&
    data.conferences.some(c => c.divisions.length > 1))
  const hasConference = !!(data?.followedConferenceName &&
    data.conferences.length > 1)

  if (!loaded) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }} />
      </div>
    )
  }

  return (
    <div style={{ paddingBottom: "1rem" }}>
      {/* Sticky header + filter bar */}
      <div className="sticky top-0 z-30 glass-header">
        <div className="px-4 py-3">
          <h1 className="font-display text-[26px] font-800 text-white leading-none tracking-tight uppercase">Standings</h1>
        </div>

        {/* League logo filter bar */}
        <div className="relative overflow-x-auto no-scrollbar px-4 pb-3 pt-1">
          <div className="flex gap-3 min-w-max">
            {availableLeagues.map(({ leagueId, teamId }) => {
              const info = LEAGUE_INFO[leagueId]
              const active = activeLeague === leagueId
              return (
                <button
                  key={leagueId}
                  onClick={() => { setActiveLeague(leagueId); setCollegePicker(null); recordClick(teamId) }}
                  className="flex-shrink-0 flex flex-col items-center gap-1"
                >
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center transition-all overflow-hidden"
                    style={{
                      background: active ? `${info?.color}25` : "var(--surface-2)",
                      border: `2px solid ${active ? info?.color : "rgba(255,255,255,0.1)"}`,
                      boxShadow: active ? `0 0 14px ${info?.color}55` : "none",
                      opacity: !active && activeLeague ? 0.45 : 1,
                      padding: "6px",
                    }}
                  >
                    {info?.logo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={info.logo}
                        alt={info.label}
                        width={34}
                        height={34}
                        className="object-contain w-full h-full"
                        style={{ filter: active ? "none" : "grayscale(0.3) brightness(0.9)" }}
                      />
                    ) : (
                      <span className="font-display text-[11px] font-800 text-zinc-400">{leagueId.toUpperCase()}</span>
                    )}
                  </div>
                  <span className="font-display text-[9px] font-700 uppercase tracking-widest" style={{ color: active ? (info?.color || "var(--accent)") : "#4b5563" }}>
                    {info?.label || leagueId.toUpperCase()}
                  </span>
                </button>
              )
            })}

            {/* College school icons */}
            {Object.entries(collegeGroups).map(([gk, teams]) => {
              const rep = teams[0]
              const open = collegePicker === gk
              return (
                <div key={gk} className="relative flex-shrink-0 flex flex-col items-center gap-1">
                  <button
                    onClick={() => { setCollegePicker(open ? null : gk); setActiveLeague("") }}
                    className="flex flex-col items-center gap-1"
                  >
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center transition-all overflow-hidden p-1 relative"
                      style={{
                        background: open ? `${rep.primaryColor}30` : "var(--surface-2)",
                        border: `2px solid ${open ? rep.primaryColor : "rgba(255,255,255,0.1)"}`,
                        boxShadow: open ? `0 0 14px ${rep.primaryColor}55` : "none",
                        opacity: !open && activeLeague ? 0.5 : 1,
                      }}
                    >
                      <TeamLogo src={getTeamLogoUrl(rep)} emoji={rep.emoji} abbr={rep.abbr} size={32} />
                      <span className="absolute bottom-0.5 right-0.5 text-[8px] text-white/60">▾</span>
                    </div>
                  </button>
                  <span className="font-display text-[9px] font-700 uppercase tracking-widest" style={{ color: open ? rep.primaryColor : "#4b5563" }}>
                    {gk === "uw" ? "Huskies" : gk === "wsu" ? "Cougars" : gk.toUpperCase()}
                  </span>

                  {open && (
                    <CollegeStandingsPicker
                      groupKey={gk}
                      availableTeams={teams}
                      activeCollegeSport={null}
                      onSelect={() => setCollegePicker(null)}
                      onClose={() => setCollegePicker(null)}
                    />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }} />
        </div>
      )}
      {error && (
        <div className="mx-4 mt-4 p-3 rounded-lg text-red-300 text-sm" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>
          {error}
        </div>
      )}

      {/* College standings placeholder */}
      {!activeLeague && collegePicker && (
        <div className="mx-4 mt-6 p-5 rounded-2xl text-center" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
          <div className="text-3xl mb-2">🎓</div>
          <div className="font-display text-[15px] font-800 text-white uppercase tracking-tight">College Standings</div>
          <div className="text-zinc-500 text-[12px] mt-1">Conference standings coming soon</div>
        </div>
      )}

      {data && !loading && activeLeague && (
        <>
          {/* Season status banner (offseason / preseason / regular) */}
          {data.season && data.season.status !== 'playoffs' && (
            <SeasonBanner season={data.season} leagueId={activeLeague} />
          )}

          {/* PLAYOFFS — show bracket prominently first */}
          {data.season?.status === 'playoffs' && (
            <PlayoffSection leagueId={activeLeague} accentColor={accentColor} followedAbbrs={followedAbbrs} />
          )}

          {/* Scope picker — Division / Conference / All Divisions */}
          <ScopePicker
            scope={scope} setScope={setScope}
            hasDivision={hasTrueDivisions} hasConference={hasConference}
            followedDivisionName={data.followedDivisionName}
            followedConferenceName={data.followedConferenceName}
          />

          {/* Standings label — "Final" when postseason */}
          <div className="px-4 pt-3 pb-1 flex items-center gap-3">
            <span className="font-display text-[10px] font-700 uppercase tracking-widest text-zinc-600">
              {data.season?.status === 'playoffs' || data.season?.status === 'offseason'
                ? 'Regular Season — Final'
                : 'Standings'}
            </span>
            <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
          </div>

          <div className="mt-1">
            {scope === 'league'
              ? data.conferences.map(conf => (
                  <div key={conf.name}>
                    {data.conferences.length > 1 && <ConferenceHeader name={conf.name} />}
                    {conf.divisions.map(div => (
                      <DivisionTable key={div.name} division={div} followedTeamColors={followedTeamColors} accentColor={accentColor} leagueId={activeLeague} />
                    ))}
                  </div>
                ))
              : visibleDivisions.map(div => (
                  <DivisionTable key={div.name} division={div} followedTeamColors={followedTeamColors} accentColor={accentColor} leagueId={activeLeague} />
                ))
            }
          </div>
        </>
      )}

      {availableLeagues.length === 0 && Object.keys(collegeGroups).length === 0 && !loading && (
        <div className="flex flex-col items-center justify-center h-64 px-8 text-center gap-3">
          <span className="text-5xl">📊</span>
          <div className="font-display text-[20px] font-800 text-white uppercase">No Teams Followed</div>
          <p className="text-zinc-500 text-sm">Go to Teams and follow your teams to see standings.</p>
        </div>
      )}
    </div>
  )
}