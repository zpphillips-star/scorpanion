"use client"
import { useState, useEffect } from "react"

interface StandingRow {
  abbr: string; logo: string; wins: number; losses: number; winPct: number; isThis: boolean
}

interface TeamDetailData {
  id: string; name: string; shortName: string; abbr: string; logo: string
  color: string; altColor: string
  wins: number; losses: number; ties?: number; winPct?: string
  recentForm: { result: "W" | "L" | "T"; myScore: number; oppScore: number; isHome: boolean; opponent: string; oppLogo: string; date: string }[]
  upcomingGames: { opponent: string; oppLogo: string; date: string; isHome: boolean; time: string }[]
  divisionRank: number | null; divisionName: string
  divisionStandings: StandingRow[]
  venue: string | null; location: string | null
}

interface Props {
  teamId: string; teamName: string; teamLogo?: string; league: string; onClose: () => void
}

function fmtShortDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" })
}
function fmtDay(iso: string) {
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
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60]" onClick={onClose} />

      {/* Sheet */}
      <div
        className="fixed bottom-0 left-0 right-0 z-[70] lg:max-w-2xl lg:mx-auto rounded-t-3xl overflow-y-auto animate-slide-up"
        style={{ background: "var(--surface)", paddingBottom: "env(safe-area-inset-bottom)", maxHeight: "88dvh" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Drag pill */}
        <div className="w-10 h-1 rounded-full bg-white/15 mx-auto mt-3 mb-1" />

        {/* ── HERO HEADER ─────────────────────────────────────────────────────── */}
        <div
          className="relative px-5 pt-4 pb-6"
          style={{ background: `linear-gradient(160deg, ${color}30 0%, ${color}10 55%, transparent 100%)` }}
        >
          {/* Top accent line */}
          <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-3xl" style={{ background: `linear-gradient(to right, ${color}, ${color}44, transparent)` }} />

          <button
            onClick={onClose}
            className="absolute top-3 right-4 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/60 text-sm hover:bg-white/15 transition-colors"
          >✕</button>

          <div className="flex items-center gap-4">
            {/* Logo */}
            <div className="flex-shrink-0 relative">
              {logo
                ? <img src={logo} alt={teamName} width={76} height={76} className="object-contain drop-shadow-xl" />
                : <div className="w-[76px] h-[76px] rounded-full bg-white/10 animate-pulse" />
              }
            </div>

            {/* Name + record */}
            <div className="flex-1 min-w-0">
              <div className="font-display text-[11px] font-700 uppercase tracking-widest mb-0.5" style={{ color }}>
                {loading ? "Loading…" : (data?.location ?? "")}
              </div>
              <div className="font-display text-[26px] font-800 text-white uppercase leading-tight truncate">
                {loading ? teamName : (data?.shortName ?? data?.name ?? teamName)}
              </div>

              {data && !loading && (
                <div className="flex items-baseline gap-2 mt-2 flex-wrap">
                  <span className="font-display text-[30px] font-800 text-white tabular-nums leading-none">
                    {data.wins}–{data.losses}{data.ties ? `–${data.ties}` : ""}
                  </span>
                  {data.divisionRank && (
                    <span
                      className="font-display text-[13px] font-700 px-2 py-0.5 rounded-full tabular-nums"
                      style={{ color, background: `${color}18`, border: `1px solid ${color}30` }}
                    >
                      #{data.divisionRank} {data.divisionName?.split(" ").pop() ?? "Div"}
                    </span>
                  )}
                  {data.winPct && (
                    <span className="font-display text-[13px] text-zinc-500 tabular-nums">
                      .{Math.round(parseFloat(data.winPct) * 1000).toString().padStart(3, "0")}
                    </span>
                  )}
                </div>
              )}
              {loading && <div className="h-8 w-32 rounded-xl bg-white/8 animate-pulse mt-2" />}
            </div>
          </div>
        </div>

        {/* ── LAST 3 GAMES ─────────────────────────────────────────────────────── */}
        {data && !loading && data.recentForm.length > 0 && (
          <div className="px-4 pt-5 pb-4 border-t border-white/5">
            <div className="flex items-center gap-2 mb-3">
              <div className="font-display text-[11px] font-800 uppercase tracking-widest text-zinc-400">Last 3 Games</div>
              <div className="flex-1 h-px bg-white/5" />
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[...data.recentForm].reverse().map((g, i) => {
                const win = g.result === "W"
                const loss = g.result === "L"
                const rc = win ? "#34d399" : loss ? "#f87171" : "#9ca3af"
                const awayAbbr = g.isHome ? g.opponent : (data.abbr ?? "SEA")
                const awayLogo = g.isHome ? g.oppLogo : logo
                const awayScore = g.isHome ? g.oppScore : g.myScore
                const homeAbbr = g.isHome ? (data.abbr ?? "SEA") : g.opponent
                const homeLogo = g.isHome ? logo : g.oppLogo
                const homeScore = g.isHome ? g.myScore : g.oppScore
                return (
                  <div
                    key={i}
                    className="rounded-2xl overflow-hidden"
                    style={{ background: "var(--surface-2)", border: `1px solid ${rc}28` }}
                  >
                    {/* Away row */}
                    <div className="flex items-center px-2.5 pt-2.5 pb-1 gap-1.5">
                      {awayLogo
                        ? <img src={awayLogo} alt={awayAbbr} width={28} height={28} className="object-contain flex-shrink-0" />
                        : <div className="w-4 h-4 rounded-full bg-white/10 flex-shrink-0" />
                      }
                      <span className="flex-1 font-display text-[12px] font-600 text-zinc-300 truncate">{awayAbbr}</span>
                      <span className={`font-display text-[16px] font-800 tabular-nums ${awayScore > homeScore ? "text-white" : "text-zinc-500"}`}>{awayScore}</span>
                    </div>
                    {/* Home row */}
                    <div className="flex items-center px-2.5 pb-2 pt-1 gap-1.5 border-t border-white/5">
                      {homeLogo
                        ? <img src={homeLogo} alt={homeAbbr} width={28} height={28} className="object-contain flex-shrink-0" />
                        : <div className="w-4 h-4 rounded-full bg-white/10 flex-shrink-0" />
                      }
                      <span className="flex-1 font-display text-[12px] font-600 text-zinc-300 truncate">{homeAbbr}</span>
                      <span className={`font-display text-[16px] font-800 tabular-nums ${homeScore > awayScore ? "text-white" : "text-zinc-500"}`}>{homeScore}</span>
                    </div>
                    {/* Footer */}
                    <div className="flex items-center justify-between px-2.5 py-1 border-t border-white/5" style={{ background: "rgba(0,0,0,0.25)" }}>
                      <span className="font-display text-[10px] font-800 uppercase" style={{ color: rc }}>{win ? "W" : loss ? "L" : "T"}</span>
                      <span className="font-display text-[9px] text-zinc-600">{fmtShortDate(g.date)}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── NEXT 3 GAMES ─────────────────────────────────────────────────────── */}
        {data && !loading && data.upcomingGames.length > 0 && (
          <div className="px-4 pt-5 pb-4 border-t border-white/5">
            <div className="flex items-center gap-2 mb-3">
              <div className="font-display text-[11px] font-800 uppercase tracking-widest text-zinc-400">Next 3 Games</div>
              <div className="flex-1 h-px bg-white/5" />
            </div>
            <div className="space-y-2">
              {data.upcomingGames.map((g, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 px-3.5 py-3 rounded-2xl"
                  style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}
                >
                  {g.oppLogo
                    ? <img src={g.oppLogo} alt={g.opponent} width={28} height={28} className="object-contain flex-shrink-0" />
                    : <div className="w-9 h-9 rounded-full bg-white/8 flex-shrink-0 flex items-center justify-center font-display text-[10px] text-zinc-500">{g.opponent.slice(0,3)}</div>
                  }
                  <div className="flex-1 min-w-0">
                    <div className="font-display text-[15px] font-700 text-white leading-tight">
                      {g.isHome ? "vs" : "@"} {g.opponent}
                    </div>
                    <div className="font-display text-[11px] text-zinc-500 mt-0.5">{fmtDay(g.date)}</div>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <div className="font-display text-[13px] font-700 text-zinc-200">
                      {new Date(g.time).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}
                    </div>
                    <div
                      className="font-display text-[9px] font-700 uppercase tracking-wide mt-0.5 px-1.5 py-0.5 rounded-full inline-block"
                      style={{ color: g.isHome ? color : "var(--text-muted)", background: g.isHome ? `${color}18` : "transparent" }}
                    >{g.isHome ? "Home" : "Away"}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── DIVISION STANDINGS ───────────────────────────────────────────────── */}
        {data && !loading && data.divisionStandings.length > 0 && (
          <div className="px-4 pt-5 pb-5 border-t border-white/5">
            <div className="flex items-center gap-2 mb-3">
              <div className="font-display text-[11px] font-800 uppercase tracking-widest text-zinc-400">
                {data.divisionName || "Division"}
              </div>
              <div className="flex-1 h-px bg-white/5" />
            </div>

            {/* Header row */}
            <div className="flex items-center px-3 mb-1.5">
              <div className="w-6 font-display text-[9px] text-zinc-600 text-center">#</div>
              <div className="flex-1" />
              <div className="w-8 font-display text-[9px] text-zinc-600 text-center">W</div>
              <div className="w-8 font-display text-[9px] text-zinc-600 text-center">L</div>
              <div className="w-12 font-display text-[9px] text-zinc-600 text-right">PCT</div>
            </div>

            <div className="space-y-1">
              {data.divisionStandings.map((row, i) => (
                <div
                  key={i}
                  className="flex items-center px-3 py-2.5 rounded-xl gap-2.5"
                  style={{
                    background: row.isThis ? `${color}18` : "var(--surface-2)",
                    border: `1px solid ${row.isThis ? `${color}35` : "var(--border)"}`,
                  }}
                >
                  <div
                    className="w-5 font-display text-[12px] font-700 text-center flex-shrink-0"
                    style={{ color: row.isThis ? color : (i === 0 ? "#fbbf24" : "var(--text-muted)") }}
                  >{i + 1}</div>
                  {row.logo
                    ? <img src={row.logo} alt={row.abbr} width={28} height={28} className="object-contain flex-shrink-0" />
                    : <div className="w-6 h-6 rounded-full bg-white/8 flex-shrink-0" />
                  }
                  <div className="flex-1 min-w-0">
                    <span
                      className="font-display text-[14px] font-700 truncate"
                      style={{ color: row.isThis ? "white" : "var(--text-secondary)" }}
                    >{row.abbr}</span>
                  </div>
                  <div className="w-8 font-display text-[14px] font-700 text-center tabular-nums" style={{ color: row.isThis ? "white" : "var(--text-secondary)" }}>{row.wins}</div>
                  <div className="w-8 font-display text-[14px] text-center tabular-nums text-zinc-500">{row.losses}</div>
                  <div className="w-12 font-display text-[12px] text-right tabular-nums text-zinc-400">
                    {row.winPct > 0 ? `.${Math.round(row.winPct * 1000).toString().padStart(3,"0")}` : "—"}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Venue */}
        {data?.venue && (
          <div className="px-5 pb-5 border-t border-white/5 pt-3">
            <div className="flex items-center gap-2 text-zinc-600 text-[12px]">
              <span>📍</span><span>{data.venue}</span>
            </div>
          </div>
        )}

        {loading && (
          <div className="px-5 py-10 flex flex-col items-center gap-3">
            <div className="w-7 h-7 border-2 rounded-full animate-spin" style={{ borderColor: `${color}44`, borderTopColor: color }} />
            <div className="font-display text-[12px] text-zinc-600">Loading {teamName}…</div>
          </div>
        )}

        {!loading && !data && (
          <div className="px-5 py-10 text-center">
            <div className="font-display text-[14px] text-zinc-500">No data available</div>
          </div>
        )}
      </div>
    </>
  )
}

