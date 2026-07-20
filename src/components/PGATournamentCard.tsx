"use client"
import { useState, useEffect } from "react"
import type { PGATournament, PGAPlayer } from "@/app/api/pga/route"

function ScoreBadge({ score }: { score: string }) {
  const isUnder = score.startsWith("-")
  const isOver  = score.startsWith("+")
  const color = isUnder ? "#22c55e" : isOver ? "#f87171" : "#f0f0f8"
  return (
    <span className="font-display text-[15px] font-800 tabular-nums" style={{ color }}>{score}</span>
  )
}

function PlayerRow({ player, isLast, showRounds }: { player: PGAPlayer; isLast: boolean; showRounds?: boolean }) {
  const isTied = player.position.startsWith("T")
  return (
    <div
      className="grid items-center px-4 py-2.5"
      style={{
        gridTemplateColumns: "32px 1fr 48px 44px 36px",
        borderBottom: isLast ? "none" : "1px solid rgba(255,255,255,0.15)",
      }}
    >
      <span className="text-[11px] font-semibold tabular-nums" style={{ color: isTied ? "#6b7280" : "#f0f0f8" }}>
        {player.position}
      </span>
      <span className="text-[13px] font-semibold truncate pr-2" style={{ color: "#f0f0f8" }}>
        {player.shortName}
      </span>
      <div className="text-right"><ScoreBadge score={player.totalScore} /></div>
      <div className="text-right">
        <span className="text-[12px] tabular-nums" style={{ color: "#6b7280" }}>{player.todayScore}</span>
      </div>
      <div className="text-right">
        <span className="text-[11px] tabular-nums" style={{ color: "#3a5070" }}>{player.thru}</span>
      </div>
    </div>
  )
}

// ── Full detail sheet ────────────────────────────────────────────────────────
function TournamentDetailSheet({ tournament, onClose }: { tournament: PGATournament; onClose: () => void }) {
  const fmtDate = (iso: string) => {
    if (!iso) return ""
    try { return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" }) } catch { return "" }
  }
  const isLive = tournament.status === "live"
  const isCompleted = tournament.status === "completed"

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: "rgba(0,0,0,0.75)" }} onClick={onClose}>
      <div className="flex-1" />
      <div
        className="rounded-t-2xl overflow-hidden flex flex-col"
        style={{ background: "#0c1b31", maxHeight: "85vh" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full" style={{ background: "rgba(255,255,255,0.15)" }} />
        </div>

        {/* Header */}
        <div className="px-4 pb-4 flex-shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.16)" }}>
          <div className="flex items-center gap-2 mb-1.5">
            {isLive ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-green-500" style={{ animation: "liveDotPulse 1.8s ease-in-out infinite" }} />
                <span className="text-[10px] tracking-widest uppercase font-bold text-green-400">{tournament.roundLabel}</span>
              </>
            ) : (
              <span className="text-[10px] tracking-widest uppercase font-semibold" style={{ color: "#3a5070" }}>
                {isCompleted ? "Final" : tournament.roundLabel}
              </span>
            )}
          </div>
          <div className="text-[18px] font-bold" style={{ color: "#f0f0f8" }}>{tournament.name}</div>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {tournament.course && <span className="text-[11px]" style={{ color: "#6b7280" }}>{tournament.course}</span>}
            {tournament.location && <><span style={{ color: "#1e3050" }}>·</span><span className="text-[11px]" style={{ color: "#4b5563" }}>{tournament.location}</span></>}
            {(tournament.startDate || tournament.endDate) && (
              <><span style={{ color: "#1e3050" }}>·</span>
              <span className="text-[11px]" style={{ color: "#374151" }}>
                {fmtDate(tournament.startDate)}{tournament.endDate && tournament.endDate !== tournament.startDate ? ` – ${fmtDate(tournament.endDate)}` : ""}
              </span></>
            )}
            {tournament.purse && <><span style={{ color: "#1e3050" }}>·</span><span className="text-[11px]" style={{ color: "#374151" }}>{tournament.purse}</span></>}
          </div>
        </div>

        {/* Full leaderboard scrollable */}
        <div className="overflow-y-auto flex-1">
          {/* Column headers */}
          <div className="grid px-4 py-2 sticky top-0" style={{
            gridTemplateColumns: "32px 1fr 48px 44px 36px",
            background: "#0c1b31",
            borderBottom: "1px solid rgba(255,255,255,0.16)"
          }}>
            <span />
            <span className="text-[9px] tracking-widest uppercase font-semibold" style={{ color: "#374151" }}>Player</span>
            <span className="text-[9px] tracking-widest uppercase font-semibold text-right" style={{ color: "#374151" }}>Total</span>
            <span className="text-[9px] tracking-widest uppercase font-semibold text-right" style={{ color: "#374151" }}>Rd</span>
            <span className="text-[9px] tracking-widest uppercase font-semibold text-right" style={{ color: "#374151" }}>Thru</span>
          </div>
          {tournament.leaders.map((p, i) => (
            <PlayerRow key={`${p.name}-${i}`} player={p} isLast={i === tournament.leaders.length - 1} />
          ))}
          {tournament.cutLine && (
            <div className="px-4 py-2 text-center text-[10px]" style={{ color: "#374151" }}>{tournament.cutLine}</div>
          )}
          <div className="h-8" />
        </div>
      </div>
    </div>
  )
}

// ── Collapsed tournament card ────────────────────────────────────────────────
export function TournamentCard({ tournament }: { tournament: PGATournament }) {
  const [showDetail, setShowDetail] = useState(false)
  const isLive = tournament.status === "live"
  const isCompleted = tournament.status === "completed"
  const hasLeaderboard = tournament.leaders.length > 0
  const previewPlayers = tournament.leaders.slice(0, 5)

  const fmtDate = (iso: string) => {
    if (!iso) return ""
    try { return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" }) } catch { return "" }
  }

  return (
    <>
      <button
        className="w-full text-left active:scale-[0.99] transition-transform"
        onClick={() => hasLeaderboard && setShowDetail(true)}
      >
        <div
          className="mx-4 rounded-2xl overflow-hidden"
          style={{
            background: "#0c1b31",
            border: "1px solid rgba(255,255,255,0.16)",
            borderLeft: isLive ? "3px solid #22c55e" : "1px solid rgba(255,255,255,0.16)",
          }}
        >
          {/* Header */}
          <div className="px-4 pt-4 pb-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.16)" }}>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                {isLive ? (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0"
                          style={{ animation: "liveDotPulse 1.8s ease-in-out infinite" }} />
                    <span className="text-[10px] tracking-widest uppercase font-bold text-green-400">{tournament.roundLabel}</span>
                  </>
                ) : (
                  <span className="text-[10px] tracking-widest uppercase font-semibold" style={{ color: "#3a5070" }}>
                    {isCompleted ? "Final" : tournament.roundLabel}
                  </span>
                )}
              </div>
              {hasLeaderboard && (
                <span className="text-[10px] font-semibold" style={{ color: "#3a5070" }}>View all →</span>
              )}
            </div>
            <div className="text-[16px] font-bold leading-tight" style={{ color: "#f0f0f8" }}>
              {tournament.shortName || tournament.name}
            </div>
            <div className="flex items-center gap-2 mt-1">
              {tournament.course && <span className="text-[10px]" style={{ color: "#3a5070" }}>{tournament.course}</span>}
              {tournament.course && (tournament.startDate) && <span style={{ color: "#1e3050" }}>·</span>}
              {tournament.startDate && (
                <span className="text-[10px]" style={{ color: "#2d4a6b" }}>
                  {fmtDate(tournament.startDate)}{tournament.endDate && tournament.endDate !== tournament.startDate ? ` – ${fmtDate(tournament.endDate)}` : ""}
                </span>
              )}
            </div>
          </div>

          {/* Leaderboard preview (top 5) */}
          {hasLeaderboard ? (
            <>
              <div className="grid px-4 py-2" style={{
                gridTemplateColumns: "32px 1fr 48px 44px 36px",
                borderBottom: "1px solid rgba(255,255,255,0.15)"
              }}>
                <span />
                <span className="text-[9px] tracking-widest uppercase font-semibold" style={{ color: "#2d4a6b" }}>Player</span>
                <span className="text-[9px] tracking-widest uppercase font-semibold text-right" style={{ color: "#2d4a6b" }}>Total</span>
                <span className="text-[9px] tracking-widest uppercase font-semibold text-right" style={{ color: "#2d4a6b" }}>Rd</span>
                <span className="text-[9px] tracking-widest uppercase font-semibold text-right" style={{ color: "#2d4a6b" }}>Thru</span>
              </div>
              {previewPlayers.map((p, i) => (
                <PlayerRow key={`${p.name}-${i}`} player={p} isLast={i === previewPlayers.length - 1} />
              ))}
              {tournament.leaders.length > 5 && (
                <div className="px-4 py-2.5 text-center" style={{ borderTop: "1px solid rgba(255,255,255,0.15)" }}>
                  <span className="text-[11px] font-semibold" style={{ color: "#3a5070" }}>
                    +{tournament.leaders.length - 5} more · tap to view full leaderboard
                  </span>
                </div>
              )}
            </>
          ) : (
            <div className="px-4 py-5 text-center">
              <span className="text-[12px]" style={{ color: "#2d4a6b" }}>Leaderboard coming soon</span>
            </div>
          )}
        </div>
      </button>

      {showDetail && (
        <TournamentDetailSheet tournament={tournament} onClose={() => setShowDetail(false)} />
      )}
    </>
  )
}

// ── Section component (used for both PGA + LPGA) ─────────────────────────────
export default function PGASection({ tourId = "pga" }: { tourId?: "pga" | "lpga" }) {
  const [tournaments, setTournaments] = useState<PGATournament[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const r = await fetch(`/api/${tourId}`)
        if (!r.ok || cancelled) return
        const data: PGATournament[] = await r.json()
        if (!cancelled) { setTournaments(data); setLoading(false) }
      } catch {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    const interval = setInterval(load, 60_000)
    return () => { cancelled = true; clearInterval(interval) }
  }, [tourId])

  if (loading) {
    return (
      <div className="mx-4 rounded-2xl flex items-center justify-center py-8"
           style={{ background: "#0c1b31", border: "1px solid rgba(255,255,255,0.16)" }}>
        <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin"
             style={{ borderColor: tourId === "lpga" ? "#C084FC" : "#CBA135", borderTopColor: "transparent" }} />
      </div>
    )
  }

  if (tournaments.length === 0) {
    return (
      <div className="mx-4 rounded-2xl flex items-center justify-center py-6"
           style={{ background: "#0c1b31", border: "1px solid rgba(255,255,255,0.16)" }}>
        <span className="text-[12px]" style={{ color: "#2d4a6b" }}>No active {tourId.toUpperCase()} tournaments</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {tournaments.map(t => <TournamentCard key={t.id} tournament={t} />)}
    </div>
  )
}
