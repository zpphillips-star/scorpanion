"use client"
import { useState, useEffect } from "react"
import Image from "next/image"

interface StandingsEntry {
  teamId: string; teamName: string; abbr: string; logo: string
  wins: number; losses: number; ties?: number
  winPct: number; gamesBehind: number | string; isSeattle: boolean
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
  seattleDivisionName: string | null
  seattleConferenceName: string | null
}

const LEAGUE_TABS = [
  { id: "mlb",  label: "MLB",  emoji: "⚾" },
  { id: "wnba", label: "WNBA", emoji: "🏀" },
  { id: "mls",  label: "MLS",  emoji: "⚽" },
  { id: "nhl",  label: "NHL",  emoji: "🏒" },
  { id: "nfl",  label: "NFL",  emoji: "🏈" },
  { id: "nba",  label: "NBA",  emoji: "🏀" },
]

const SEATTLE_COLORS: Record<string, string> = {
  mlb: "#005C5C", nhl: "#99D9D9", wnba: "#2C5235", mls: "#5D9732", nfl: "#002244"
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
  const seattleColor = SEATTLE_COLORS[leagueId] || "#00d4ff"

  if (season.status === "offseason") {
    return (
      <div className="mx-3 mt-3 px-4 py-3 rounded-2xl flex items-center gap-3"
        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
        <span className="text-[18px]">💤</span>
        <div>
          <div className="font-display text-[12px] font-700 text-zinc-400 uppercase tracking-widest">Off-Season</div>
          {season.nextStartApprox && (
            <div className="font-display text-[11px] text-zinc-600 mt-0.5">
              New season starts <span className="text-zinc-400">{season.nextStartApprox}</span>
            </div>
          )}
        </div>
      </div>
    )
  }

  if (season.status === "playoffs") {
    return (
      <div className="mx-3 mt-3 px-4 py-3 rounded-2xl flex items-center gap-3"
        style={{ background: "rgba(234,179,8,0.08)", border: "1px solid rgba(234,179,8,0.2)" }}>
        <span className="text-[18px]">🏆</span>
        <div>
          <div className="font-display text-[12px] font-700 text-yellow-400 uppercase tracking-widest">Playoffs</div>
          <div className="font-display text-[11px] text-zinc-500 mt-0.5">{season.label}</div>
        </div>
        <span className="ml-auto relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-60" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-yellow-400" />
        </span>
      </div>
    )
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
      style={{ background: `${seattleColor}10`, border: `1px solid ${seattleColor}28` }}>
      <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60" style={{ backgroundColor: seattleColor }} />
        <span className="relative inline-flex rounded-full h-2.5 w-2.5" style={{ backgroundColor: seattleColor }} />
      </span>
      <div>
        <div className="font-display text-[12px] font-700 uppercase tracking-widest" style={{ color: seattleColor }}>Regular Season</div>
        <div className="font-display text-[11px] text-zinc-500 mt-0.5">{season.label} · In progress</div>
      </div>
    </div>
  )
}

function ScopePicker({
  scope, setScope, hasDivision, hasConference, seattleDivisionName, seattleConferenceName,
}: {
  scope: Scope; setScope: (s: Scope) => void
  hasDivision: boolean; hasConference: boolean
  seattleDivisionName: string | null; seattleConferenceName: string | null
}) {
  const options: { id: Scope; label: string; sublabel?: string }[] = []
  if (hasDivision) options.push({ id: "division", label: "Division", sublabel: seattleDivisionName || undefined })
  if (hasConference) options.push({ id: "conference", label: "Conference", sublabel: seattleConferenceName || undefined })
  options.push({ id: "league", label: "Full League" })

  if (options.length <= 1) return null

  return (
    <div className="mx-3 mt-3 flex gap-2">
      {options.map(opt => {
        const active = scope === opt.id
        return (
          <button
            key={opt.id}
            onClick={() => setScope(opt.id)}
            className="flex-1 rounded-xl px-3 py-2.5 text-center transition-all"
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

function DivisionTable({ division, seattleColor }: { division: Division; seattleColor: string }) {
  return (
    <div className="mb-3">
      <div className="px-4 py-2.5 flex items-center gap-3" style={{ background: "var(--surface-2)" }}>
        <span className="font-display text-[11px] font-700 text-zinc-400 uppercase tracking-widest">{division.name}</span>
        <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
      </div>
      <div className="grid px-4 py-1.5" style={{ gridTemplateColumns: "1fr 36px 36px 52px 40px" }}>
        <span className="font-display text-[10px] font-600 text-zinc-600 uppercase tracking-wider">Team</span>
        <span className="font-display text-[10px] font-600 text-zinc-600 uppercase tracking-wider text-center">W</span>
        <span className="font-display text-[10px] font-600 text-zinc-600 uppercase tracking-wider text-center">L</span>
        <span className="font-display text-[10px] font-600 text-zinc-600 uppercase tracking-wider text-center">PCT</span>
        <span className="font-display text-[10px] font-600 text-zinc-600 uppercase tracking-wider text-center">GB</span>
      </div>
      {division.entries.map((entry, idx) => (
        <div
          key={entry.teamId}
          className="relative grid px-4 py-2.5 transition-colors hover:bg-white/3"
          style={{
            gridTemplateColumns: "1fr 36px 36px 52px 40px",
            borderTop: "1px solid var(--border)",
            background: entry.isSeattle ? `${seattleColor}14` : "transparent",
          }}
        >
          {entry.isSeattle && (
            <span className="absolute left-0 top-0 bottom-0 w-[3px] rounded-r-full" style={{ background: seattleColor }} />
          )}
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="font-display text-[11px] font-600 text-zinc-600 w-4 text-center flex-shrink-0">{idx + 1}</span>
            <TeamLogoImg src={entry.logo} abbr={entry.abbr} />
            <div className="min-w-0">
              <div className={`font-display text-[14px] font-700 leading-tight truncate ${entry.isSeattle ? "text-white" : "text-zinc-200"}`}>
                {entry.teamName}
              </div>
              {entry.isSeattle && (
                <div className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: seattleColor }}>▲ Seattle</div>
              )}
            </div>
          </div>
          <span className="font-display text-[14px] font-700 text-white text-center self-center tabular-nums">{entry.wins}</span>
          <span className="font-display text-[14px] font-600 text-zinc-400 text-center self-center tabular-nums">{entry.losses}</span>
          <span className="font-display text-[13px] font-500 text-zinc-400 text-center self-center tabular-nums">{formatPct(entry.winPct)}</span>
          <span className="font-display text-[13px] font-500 text-zinc-500 text-center self-center tabular-nums">
            {entry.gamesBehind === 0 || entry.gamesBehind === "0" || entry.gamesBehind === "-" ? "—" : entry.gamesBehind}
          </span>
        </div>
      ))}
    </div>
  )
}

export default function StandingsClient() {
  const [activeLeague, setActiveLeague] = useState("mlb")
  const [data, setData] = useState<StandingsResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [scope, setScope] = useState<Scope>("division")

  useEffect(() => {
    setLoading(true); setError(null); setData(null)
    fetch(`/api/standings?league=${activeLeague}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then((d: StandingsResponse) => {
        setData(d)
        // Auto-set scope: if no Seattle division found, fall back to league
        if (!d.seattleDivisionName && !d.seattleConferenceName) setScope("league")
        else if (!d.seattleDivisionName) setScope("conference")
        else setScope("division")
      })
      .catch(() => setError("Unable to load standings"))
      .finally(() => setLoading(false))
  }, [activeLeague])

  const seattleColor = SEATTLE_COLORS[activeLeague] || "#00d4ff"

  // Compute which divisions to show based on scope
  const visibleDivisions: Division[] = (() => {
    if (!data) return []
    if (scope === "league") return data.divisions
    if (scope === "conference") {
      const conf = data.conferences.find(c => c.name === data.seattleConferenceName)
      return conf ? conf.divisions : data.divisions
    }
    // division scope: just Seattle's division
    const div = data.divisions.find(d => d.name === data.seattleDivisionName)
    return div ? [div] : data.divisions.slice(0, 1)
  })()

  // Check if we have true divisions (sub-conference level) vs just conferences
  const hasTrueDivisions = !!(data?.seattleDivisionName &&
    data.conferences.some(c => c.divisions.length > 1))
  const hasConference = !!(data?.seattleConferenceName &&
    data.conferences.length > 1)

  return (
    <div style={{ paddingBottom: "1rem" }}>
      {/* Page header */}
      <div className="sticky top-0 z-30 glass-header px-4 py-3">
        <h1 className="font-display text-[26px] font-800 text-white leading-none tracking-tight uppercase">Standings</h1>
      </div>

      {/* League tabs */}
      <div className="overflow-x-auto no-scrollbar" style={{ borderBottom: "1px solid var(--border)" }}>
        <div className="flex min-w-max px-3 gap-0 pt-1">
          {LEAGUE_TABS.map(tab => {
            const active = activeLeague === tab.id
            return (
              <button key={tab.id} onClick={() => setActiveLeague(tab.id)} className="relative px-4 py-2.5 transition-colors">
                <span className={`font-display text-[13px] font-700 uppercase tracking-wider transition-colors ${active ? "text-[#00d4ff]" : "text-zinc-500 hover:text-zinc-300"}`}>
                  {tab.label}
                </span>
                {active && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 h-[2px] w-6 rounded-t-full"
                    style={{ background: "var(--accent)", boxShadow: "0 0 6px var(--accent)" }} />
                )}
              </button>
            )
          })}
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }} />
        </div>
      )}
      {error && (
        <div className="mx-4 mt-4 p-3 rounded-xl text-red-300 text-sm" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>
          {error}
        </div>
      )}

      {data && !loading && (
        <>
          {/* Season status banner */}
          {data.season && <SeasonBanner season={data.season} leagueId={activeLeague} />}

          {/* Scope selector */}
          <ScopePicker
            scope={scope} setScope={setScope}
            hasDivision={hasTrueDivisions} hasConference={hasConference}
            seattleDivisionName={data.seattleDivisionName}
            seattleConferenceName={data.seattleConferenceName}
          />

          {/* Standings tables */}
          <div className="mt-3">
            {visibleDivisions.map(div => (
              <DivisionTable key={div.name} division={div} seattleColor={seattleColor} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
