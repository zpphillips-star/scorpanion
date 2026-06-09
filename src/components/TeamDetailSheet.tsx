"use client"
import { useState, useEffect } from "react"

interface TeamDetailData {
  id: string
  name: string
  shortName: string
  abbr: string
  logo: string
  color: string
  altColor: string
  wins: number
  losses: number
  ties?: number
  winPct?: string
  recentForm: { result: "W" | "L" | "T"; score: string; opponent: string; date: string }[]
  divisionRank: number | null
  divisionName: string
  venue: string | null
  location: string | null
}

interface Props {
  teamId: string        // ESPN team ID
  teamName: string      // Display name (shown while loading)
  teamLogo?: string
  league: string
  onClose: () => void
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

export default function TeamDetailSheet({ teamId, teamName, teamLogo, league, onClose }: Props) {
  const [data, setData] = useState<TeamDetailData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!teamId || teamId === "" || league === "whl" || league === "pwhl") {
      setLoading(false)
      return
    }
    fetch(`/api/team-detail?teamId=${encodeURIComponent(teamId)}&league=${encodeURIComponent(league)}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [teamId, league])

  const color = data?.color ?? "#00d4ff"
  const logo = data?.logo ?? teamLogo ?? ""

  return (
    <>
      <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50" onClick={onClose} />
      <div
        className="fixed bottom-0 left-0 right-0 z-50 lg:max-w-2xl lg:mx-auto rounded-t-3xl overflow-hidden animate-slide-up"
        style={{ background: "var(--surface)", paddingBottom: "env(safe-area-inset-bottom)", maxHeight: "75dvh", overflowY: "auto" }}
        onClick={e => e.stopPropagation()}
      >
        <div className="w-10 h-1 rounded-full bg-white/15 mx-auto mt-3 mb-1" />

        {/* Header */}
        <div
          className="relative px-5 pt-4 pb-6"
          style={{ background: `linear-gradient(135deg, ${color}30 0%, ${color}10 50%, transparent 100%)` }}
        >
          <button onClick={onClose} className="absolute top-3 right-4 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white text-sm">✕</button>

          {loading ? (
            <div className="flex items-center gap-4">
              {logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logo} alt={teamName} width={64} height={64} className="object-contain" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-white/10 animate-pulse" />
              )}
              <div>
                <div className="font-display text-[22px] font-800 text-white uppercase">{teamName}</div>
                <div className="flex items-center gap-2 mt-1">
                  <div className="h-3 w-20 rounded bg-white/10 animate-pulse" />
                </div>
              </div>
            </div>
          ) : !data ? (
            <div className="flex items-center gap-4">
              {logo && <img src={logo} alt={teamName} width={64} height={64} className="object-contain" />}
              <div>
                <div className="font-display text-[22px] font-800 text-white uppercase">{teamName}</div>
                <div className="text-sm text-zinc-500 mt-1">Stats unavailable</div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {data.logo && <img src={data.logo} alt={data.name} width={72} height={72} className="object-contain" />}
              <div className="flex-1 min-w-0">
                <div className="font-display text-[22px] font-800 text-white uppercase leading-tight">{data.shortName ?? data.name}</div>
                {data.location && <div className="text-[12px] text-zinc-500">{data.location}</div>}
              </div>
            </div>
          )}
        </div>

        {data && !loading && (
          <>
            {/* Record + rank */}
            <div className="px-5 py-4 border-t border-white/5">
              <div className="grid grid-cols-3 gap-3">
                {/* W-L */}
                <div className="rounded-xl px-3 py-3 text-center" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
                  <div className="font-display text-[24px] font-800 text-white tabular-nums">
                    {data.wins}-{data.losses}{data.ties ? `-${data.ties}` : ""}
                  </div>
                  <div className="font-display text-[9px] font-600 text-zinc-500 uppercase tracking-widest mt-0.5">Record</div>
                </div>

                {/* Win % */}
                {data.winPct && (
                  <div className="rounded-xl px-3 py-3 text-center" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
                    <div className="font-display text-[24px] font-800 text-white tabular-nums">
                      {parseFloat(data.winPct).toFixed(3).replace(/^0/, "")}
                    </div>
                    <div className="font-display text-[9px] font-600 text-zinc-500 uppercase tracking-widest mt-0.5">Win %</div>
                  </div>
                )}

                {/* Division rank */}
                {data.divisionRank && (
                  <div className="rounded-xl px-3 py-3 text-center" style={{ background: "var(--surface-2)", border: `1px solid ${color}44` }}>
                    <div className="font-display text-[24px] font-800 tabular-nums" style={{ color }}>
                      #{data.divisionRank}
                    </div>
                    <div className="font-display text-[9px] font-600 text-zinc-500 uppercase tracking-widest mt-0.5 truncate">
                      {data.divisionName ? data.divisionName.replace("Division", "Div") : "Division"}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Recent form */}
            {data.recentForm.length > 0 && (
              <div className="px-5 pb-4 border-t border-white/5">
                <div className="font-display text-[10px] font-700 uppercase tracking-widest text-zinc-600 pt-4 pb-3">Last {data.recentForm.length} Games</div>
                <div className="space-y-2">
                  {[...data.recentForm].reverse().map((g, i) => {
                    const resultColor = g.result === "W" ? "#34d399" : g.result === "L" ? "#f87171" : "#9ca3af"
                    return (
                      <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-xl" style={{ background: "var(--surface-2)" }}>
                        <span
                          className="font-display text-[14px] font-800 w-5 text-center flex-shrink-0"
                          style={{ color: resultColor }}
                        >{g.result}</span>
                        <span className="font-display text-[12px] font-600 text-white flex-shrink-0">vs {g.opponent}</span>
                        <span className="font-display text-[12px] text-zinc-400 tabular-nums">{g.score}</span>
                        <span className="font-display text-[10px] text-zinc-600 ml-auto">{fmtDate(g.date)}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Venue */}
            {data.venue && (
              <div className="px-5 pb-5 border-t border-white/5 pt-4">
                <div className="flex items-center gap-2.5 text-zinc-400 text-sm">
                  <span>📍</span>
                  <span>{data.venue}</span>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  )
}
