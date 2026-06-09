"use client"
import { useState, useEffect } from "react"

interface TeamDetailData {
  id: string; name: string; shortName: string; abbr: string; logo: string
  color: string; altColor: string
  wins: number; losses: number; ties?: number; winPct?: string
  recentForm: { result: "W" | "L" | "T"; score: string; opponent: string; oppLogo: string; date: string }[]
  upcomingGames: { opponent: string; oppLogo: string; date: string; isHome: boolean; time: string }[]
  divisionRank: number | null; divisionName: string
  venue: string | null; location: string | null
}

interface Props {
  teamId: string; teamName: string; teamLogo?: string; league: string; onClose: () => void
}

function fmtShortDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
}

export default function TeamDetailSheet({ teamId, teamName, teamLogo, league, onClose }: Props) {
  const [data, setData] = useState<TeamDetailData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!teamId || teamId === "" || league === "whl" || league === "pwhl") { setLoading(false); return }
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
        className="fixed bottom-0 left-0 right-0 z-50 lg:max-w-2xl lg:mx-auto rounded-t-3xl overflow-y-auto animate-slide-up"
        style={{ background: "var(--surface)", paddingBottom: "env(safe-area-inset-bottom)", maxHeight: "82dvh" }}
        onClick={e => e.stopPropagation()}
      >
        <div className="w-10 h-1 rounded-full bg-white/15 mx-auto mt-3 mb-1" />

        {/* ── HEADER: logo + name + record ─────────────────────────── */}
        <div className="relative px-5 pt-4 pb-5" style={{ background: `linear-gradient(145deg, ${color}28 0%, ${color}0a 60%, transparent 100%)` }}>
          <button onClick={onClose} className="absolute top-3 right-4 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white text-sm">✕</button>

          <div className="flex items-center gap-4">
            {/* Logo */}
            <div className="flex-shrink-0">
              {logo
                ? <img src={logo} alt={teamName} width={72} height={72} className="object-contain" />
                : <div className="w-18 h-18 rounded-full bg-white/10 animate-pulse w-[72px] h-[72px]" />
              }
            </div>

            {/* Name + stats inline */}
            <div className="flex-1 min-w-0">
              <div className="font-display text-[24px] font-800 text-white uppercase leading-tight truncate">
                {loading ? teamName : (data?.shortName ?? data?.name ?? teamName)}
              </div>
              {data?.location && <div className="text-[12px] text-zinc-500 mt-0.5">{data.location}</div>}

              {/* Record row — large, readable */}
              {data && !loading && (
                <div className="flex items-baseline gap-3 mt-2 flex-wrap">
                  <span className="font-display text-[28px] font-800 text-white tabular-nums leading-none">
                    {data.wins}–{data.losses}{data.ties ? `–${data.ties}` : ""}
                  </span>
                  {data.winPct && (
                    <span className="font-display text-[16px] font-600 text-zinc-400 tabular-nums">
                      {parseFloat(data.winPct).toFixed(3).replace(/^0/, "")}
                    </span>
                  )}
                  {data.divisionRank && (
                    <span className="font-display text-[16px] font-700 tabular-nums" style={{ color }}>
                      #{data.divisionRank} {data.divisionName?.split(" ").slice(-1)[0] ?? "Div"}
                    </span>
                  )}
                </div>
              )}
              {loading && <div className="h-7 w-28 rounded bg-white/10 animate-pulse mt-2" />}
            </div>
          </div>
        </div>

        {data && !loading && (
          <>
            {/* ── LAST 3 GAMES — 3 cards across ─────────────────────── */}
            {data.recentForm.length > 0 && (
              <div className="px-4 pt-4 pb-2 border-t border-white/5">
                <div className="font-display text-[10px] font-700 uppercase tracking-widest text-zinc-600 mb-3">Last 3 Games</div>
                <div className="grid grid-cols-3 gap-2">
                  {[...data.recentForm].reverse().map((g, i) => {
                    const win = g.result === "W"
                    const loss = g.result === "L"
                    const resultColor = win ? "#34d399" : loss ? "#f87171" : "#9ca3af"
                    const resultBg = win ? "rgba(52,211,153,0.1)" : loss ? "rgba(248,113,113,0.1)" : "rgba(156,163,175,0.08)"
                    return (
                      <div
                        key={i}
                        className="rounded-2xl overflow-hidden flex flex-col items-center py-3 px-2 gap-1.5"
                        style={{ background: "var(--surface-2)", border: `1px solid ${resultColor}30` }}
                      >
                        {/* W/L badge */}
                        <span
                          className="font-display text-[15px] font-800 w-8 h-8 rounded-full flex items-center justify-center"
                          style={{ color: resultColor, background: resultBg }}
                        >
                          {g.result}
                        </span>
                        {/* Opponent logo */}
                        {g.oppLogo
                          ? <img src={g.oppLogo} alt={g.opponent} width={28} height={28} className="object-contain" />
                          : <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center font-display text-[9px] text-zinc-500">{g.opponent.slice(0,3)}</div>
                        }
                        {/* Score */}
                        <span className="font-display text-[13px] font-700 text-white tabular-nums leading-none">{g.score}</span>
                        {/* Date */}
                        <span className="font-display text-[9px] text-zinc-600 text-center leading-tight">
                          {new Date(g.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* ── NEXT 3 GAMES — vertical list ──────────────────────── */}
            {data.upcomingGames.length > 0 && (
              <div className="px-4 pt-4 pb-5 border-t border-white/5">
                <div className="font-display text-[10px] font-700 uppercase tracking-widest text-zinc-600 mb-3">Next 3 Games</div>
                <div className="space-y-2">
                  {data.upcomingGames.map((g, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                      style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}
                    >
                      {/* Opponent logo */}
                      {g.oppLogo
                        ? <img src={g.oppLogo} alt={g.opponent} width={32} height={32} className="object-contain flex-shrink-0" />
                        : <div className="w-8 h-8 rounded-full bg-white/10 flex-shrink-0 flex items-center justify-center font-display text-[10px] text-zinc-500">{g.opponent.slice(0,3)}</div>
                      }
                      <div className="flex-1 min-w-0">
                        <div className="font-display text-[14px] font-700 text-white leading-tight">
                          {g.isHome ? "vs" : "@"} {g.opponent}
                        </div>
                        <div className="font-display text-[11px] text-zinc-500 mt-0.5">{fmtShortDate(g.date)}</div>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <div className="font-display text-[12px] font-600 text-zinc-300">{g.time}</div>
                        <div className="font-display text-[10px] text-zinc-600 mt-0.5">{g.isHome ? "Home" : "Away"}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Venue */}
            {data.venue && (
              <div className="px-5 pb-5 border-t border-white/5 pt-3">
                <div className="flex items-center gap-2 text-zinc-600 text-[12px]">
                  <span>📍</span><span>{data.venue}</span>
                </div>
              </div>
            )}
          </>
        )}

        {loading && (
          <div className="px-5 py-8 flex justify-center">
            <div className="w-7 h-7 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: color, borderTopColor: "transparent" }} />
          </div>
        )}
      </div>
    </>
  )
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

