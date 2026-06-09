"use client"
import { useState, useEffect } from "react"
import Image from "next/image"
import { SEATTLE_TEAMS } from "@/lib/teams"

interface StandingsEntry {
  teamId: string; teamName: string; abbr: string; logo: string
  wins: number; losses: number; ties?: number
  winPct: number; gamesBehind: number | string; isSeattle: boolean
  seattleColor?: string; streak?: string; last10?: string
}
interface Division { name: string; entries: StandingsEntry[] }
interface LeagueStandings { divisions: Division[] }

const LEAGUE_TABS = [
  { id: "mlb",  label: "MLB",  emoji: "⚾" },
  { id: "nhl",  label: "NHL",  emoji: "🏒" },
  { id: "wnba", label: "WNBA", emoji: "🏀" },
  { id: "mls",  label: "MLS",  emoji: "⚽" },
  { id: "nfl",  label: "NFL",  emoji: "🏈" },
  { id: "nba",  label: "NBA",  emoji: "🏀" },
]

const SEATTLE_COLORS: Record<string, string> = {
  mlb: "#0C2C56", nhl: "#001628", wnba: "#2C5235", mls: "#5D9732", nfl: "#002244"
}

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
  return (
    <Image src={src} alt={abbr} width={28} height={28}
      className="object-contain w-7 h-7" onError={() => setErr(true)} unoptimized />
  )
}

function DivisionTable({ division }: { division: Division }) {
  return (
    <div className="mb-3">
      {/* Division header */}
      <div className="px-4 py-2.5 flex items-center gap-3" style={{ background: "var(--surface-2)" }}>
        <span className="font-display text-[11px] font-700 text-zinc-400 uppercase tracking-widest">{division.name}</span>
        <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
      </div>

      {/* Column headers */}
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
            background: entry.isSeattle ? `${entry.seattleColor || "#3b82f6"}14` : "transparent",
          }}
        >
          {/* Left color bar for Seattle */}
          {entry.isSeattle && (
            <span
              className="absolute left-0 top-0 bottom-0 w-[3px] rounded-r-full"
              style={{ background: entry.seattleColor || "#3b82f6" }}
            />
          )}

          {/* Team */}
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="font-display text-[11px] font-600 text-zinc-600 w-4 text-center flex-shrink-0">{idx + 1}</span>
            <TeamLogoImg src={entry.logo} abbr={entry.abbr} />
            <div className="min-w-0">
              <div className={`font-display text-[14px] font-700 leading-tight truncate ${entry.isSeattle ? "text-white" : "text-zinc-200"}`}>
                {entry.teamName}
              </div>
              {entry.isSeattle && (
                <div className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: entry.seattleColor || "#00d4ff" }}>
                  ▲ Seattle
                </div>
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
  const [standings, setStandings] = useState<LeagueStandings | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true); setError(null); setStandings(null)
    fetch(`/api/standings?league=${activeLeague}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then((data: LeagueStandings) => setStandings(data))
      .catch(() => setError("Unable to load standings"))
      .finally(() => setLoading(false))
  }, [activeLeague])

  // Inject Seattle color into entries
  const standingsWithColor = standings ? {
    ...standings,
    divisions: standings.divisions.map(div => ({
      ...div,
      entries: div.entries.map(e => ({
        ...e,
        seattleColor: e.isSeattle ? (SEATTLE_COLORS[activeLeague] || "#3b82f6") : undefined
      }))
    }))
  } : null

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
              <button
                key={tab.id}
                onClick={() => setActiveLeague(tab.id)}
                className="relative px-4 py-2.5 transition-colors"
              >
                <span className={`font-display text-[13px] font-700 uppercase tracking-wider transition-colors ${active ? "text-[#00d4ff]" : "text-zinc-500 hover:text-zinc-300"}`}>
                  {tab.label}
                </span>
                {active && (
                  <span
                    className="absolute bottom-0 left-1/2 -translate-x-1/2 h-[2px] w-6 rounded-t-full"
                    style={{ background: "var(--accent)", boxShadow: "0 0 6px var(--accent)" }}
                  />
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
      {standingsWithColor && !loading && (
        <div className="mt-2">
          {standingsWithColor.divisions.map(div => (
            <DivisionTable key={div.name} division={div} />
          ))}
        </div>
      )}
    </div>
  )
}
