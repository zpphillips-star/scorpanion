"use client"
import { useState, useEffect } from "react"
import type { PGATournament, PGAPlayer } from "@/app/api/pga/route"

function ScoreBadge({ score, dim }: { score: string; dim?: boolean }) {
  const isUnder = score.startsWith("-")
  const isOver  = score.startsWith("+")
  const isEven  = score === "E"

  const color = isUnder ? "#22c55e" : isOver ? "#f87171" : isEven ? "#f0f0f8" : "#f0f0f8"
  return (
    <span className="font-display text-[15px] font-800 tabular-nums"
          style={{ color: dim ? `${color}55` : color }}>
      {score}
    </span>
  )
}

function PlayerRow({ player, isLast }: { player: PGAPlayer; isLast: boolean }) {
  const isTied = player.position.startsWith("T")
  return (
    <div
      className="grid items-center px-4 py-2.5"
      style={{
        gridTemplateColumns: "34px 1fr 44px 44px 36px",
        borderBottom: isLast ? "none" : "1px solid rgba(255,255,255,0.05)",
      }}
    >
      {/* Position */}
      <span className="text-[11px] font-semibold tabular-nums"
            style={{ color: isTied ? "#a3a3a3" : "#f0f0f8" }}>
        {player.position}
      </span>
      {/* Name */}
      <span className="text-[13px] font-semibold truncate pr-2" style={{ color: "#f0f0f8" }}>
        {player.shortName}
      </span>
      {/* Total */}
      <div className="text-right">
        <ScoreBadge score={player.totalScore} />
      </div>
      {/* Today */}
      <div className="text-right">
        <span className="text-[12px] tabular-nums" style={{ color: "#6b7280" }}>
          {player.todayScore}
        </span>
      </div>
      {/* Thru */}
      <div className="text-right">
        <span className="text-[11px] tabular-nums" style={{ color: "#4b5563" }}>
          {player.thru}
        </span>
      </div>
    </div>
  )
}

function TournamentCard({ tournament }: { tournament: PGATournament }) {
  const isLive = tournament.status === "live"
  const isCompleted = tournament.status === "completed"
  const hasLeaderboard = tournament.leaders.length > 0

  const fmtDate = (iso: string) => {
    if (!iso) return ""
    try {
      return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" })
    } catch { return "" }
  }

  return (
    <div
      className="mx-4 rounded-2xl overflow-hidden"
      style={{ background: "#18181f", border: "1px solid rgba(255,255,255,0.07)" }}
    >
      {/* Header */}
      <div className="px-4 pt-4 pb-3"
           style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
        {/* Status pill */}
        <div className="flex items-center gap-2 mb-1.5">
          {isLive ? (
            <>
              <span className="relative flex h-1.5 w-1.5 flex-shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500" />
              </span>
              <span className="text-[10px] tracking-[0.14em] font-semibold uppercase text-green-400">
                {tournament.roundLabel}
              </span>
            </>
          ) : isCompleted ? (
            <span className="text-[10px] tracking-[0.14em] font-semibold uppercase" style={{ color: "#6b7280" }}>
              Final
            </span>
          ) : (
            <span className="text-[10px] tracking-[0.14em] font-semibold uppercase" style={{ color: "#6b7280" }}>
              {tournament.roundLabel}
            </span>
          )}
        </div>

        {/* Tournament name */}
        <div className="text-[17px] font-bold leading-tight" style={{ color: "#f0f0f8" }}>
          {tournament.shortName || tournament.name}
        </div>

        {/* Course + dates */}
        <div className="flex items-center gap-2 mt-1">
          {tournament.course && (
            <span className="text-[11px]" style={{ color: "#6b7280" }}>{tournament.course}</span>
          )}
          {tournament.course && (tournament.startDate || tournament.endDate) && (
            <span style={{ color: "#374151" }}>·</span>
          )}
          {(tournament.startDate || tournament.endDate) && (
            <span className="text-[11px]" style={{ color: "#4b5563" }}>
              {fmtDate(tournament.startDate)}
              {tournament.endDate && tournament.endDate !== tournament.startDate
                ? ` – ${fmtDate(tournament.endDate)}`
                : ""}
            </span>
          )}
          {tournament.purse && (
            <>
              <span style={{ color: "#374151" }}>·</span>
              <span className="text-[11px]" style={{ color: "#4b5563" }}>{tournament.purse}</span>
            </>
          )}
        </div>
      </div>

      {/* Leaderboard */}
      {hasLeaderboard ? (
        <>
          {/* Column headers */}
          <div className="grid px-4 py-2"
               style={{ gridTemplateColumns: "34px 1fr 44px 44px 36px",
                        borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
            <span />
            <span className="text-[9px] tracking-[0.14em] uppercase font-semibold" style={{ color: "#4b5563" }}>Player</span>
            <span className="text-[9px] tracking-[0.14em] uppercase font-semibold text-right" style={{ color: "#4b5563" }}>Total</span>
            <span className="text-[9px] tracking-[0.14em] uppercase font-semibold text-right" style={{ color: "#4b5563" }}>Rd</span>
            <span className="text-[9px] tracking-[0.14em] uppercase font-semibold text-right" style={{ color: "#4b5563" }}>Thru</span>
          </div>
          {tournament.leaders.map((p, i) => (
            <PlayerRow key={`${p.name}-${i}`} player={p} isLast={i === tournament.leaders.length - 1} />
          ))}
          {tournament.cutLine && (
            <div className="px-4 py-2 text-[10px] text-center" style={{ color: "#4b5563" }}>
              {tournament.cutLine}
            </div>
          )}
        </>
      ) : (
        <div className="px-4 py-6 text-center">
          <span className="text-[13px]" style={{ color: "#4b5563" }}>Leaderboard coming soon</span>
        </div>
      )}
    </div>
  )
}

export default function PGASection() {
  const [tournaments, setTournaments] = useState<PGATournament[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const r = await fetch("/api/pga")
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
  }, [])

  if (loading) {
    return (
      <div className="mx-4 rounded-2xl flex items-center justify-center py-8"
           style={{ background: "#18181f" }}>
        <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin"
             style={{ borderColor: "#CBA135", borderTopColor: "transparent" }} />
      </div>
    )
  }

  if (tournaments.length === 0) {
    return (
      <div className="mx-4 rounded-2xl flex items-center justify-center py-6"
           style={{ background: "#18181f", border: "1px solid rgba(255,255,255,0.07)" }}>
        <span className="text-[13px]" style={{ color: "#4b5563" }}>No active PGA tournaments</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {tournaments.map(t => <TournamentCard key={t.id} tournament={t} />)}
    </div>
  )
}
