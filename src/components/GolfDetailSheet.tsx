"use client"
import { useCallback, useEffect } from "react"
import type { PGATournament } from "@/app/api/pga/route"

// ── Helpers ───────────────────────────────────────────────────────────────────

function scoreColor(s: string): string {
  if (s.startsWith("-")) return "#4ade80"
  if (s.startsWith("+")) return "#f87171"
  return "#e4e4e7"
}

function fmtGolfDate(iso: string): string {
  if (!iso) return ""
  try {
    const [y, m, d] = iso.split("T")[0].split("-").map(Number)
    return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "short", day: "numeric" })
  } catch { return "" }
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface GolfDetailSheetProps {
  tournament: PGATournament
  label: string
  accentColor: string
  onClose: () => void
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function GolfDetailSheet({
  tournament,
  label,
  accentColor,
  onClose,
}: GolfDetailSheetProps) {
  const isLive      = tournament.status === "live"
  const isCompleted = tournament.status === "completed"
  const isUpcoming  = tournament.status === "upcoming"
  const hasLeaders  = tournament.leaders.length > 0

  const dateRange =
    tournament.endDate && tournament.endDate !== tournament.startDate
      ? `${fmtGolfDate(tournament.startDate)} – ${fmtGolfDate(tournament.endDate)}`
      : fmtGolfDate(tournament.startDate)

  const roundDisplay = isCompleted
    ? "Final"
    : isLive
    ? tournament.roundLabel
    : tournament.roundLabel || "Upcoming"

  // Dismiss on Escape key
  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    },
    [onClose],
  )
  useEffect(() => {
    document.addEventListener("keydown", handleKey)
    return () => document.removeEventListener("keydown", handleKey)
  }, [handleKey])

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
        aria-label={`${tournament.name} detail`}
        className="fixed bottom-0 left-0 right-0 z-[10000] lg:max-w-2xl lg:mx-auto flex flex-col rounded-t-[20px] overflow-hidden animate-slide-up"
        style={{
          background: "#0a1628",
          paddingBottom: "env(safe-area-inset-bottom)",
          maxHeight: "94dvh",
          boxShadow: "0 -4px 40px rgba(0,0,0,0.7)",
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── HEADER (gradient) ── */}
        <div
          className="relative flex-shrink-0 px-5 pt-3 pb-6"
          style={{
            background: "linear-gradient(160deg, #1a2f4a 0%, #0a1628 100%)",
            borderBottom: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          {/* Drag handle */}
          <div className="flex justify-center mb-3">
            <div className="w-9 h-1 rounded-full bg-white/20" />
          </div>

          {/* Close + tour label row */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              {isLive && (
                <span className="relative flex h-1.5 w-1.5 flex-shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500" />
                </span>
              )}
              <span
                className="text-[11px] font-bold uppercase tracking-[0.18em]"
                style={{ color: accentColor }}
              >
                {label}
              </span>
              {roundDisplay && (
                <span className="text-[11px] text-zinc-500">· {roundDisplay}</span>
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

          {/* Tournament name — large + bold */}
          <div className="text-[21px] font-bold text-white leading-tight mb-1">
            {tournament.name}
          </div>

          {/* Course · location */}
          {(tournament.course || tournament.location) && (
            <div className="text-[12px] text-zinc-500 mt-0.5">
              {tournament.course}
              {tournament.location ? ` · ${tournament.location}` : ""}
            </div>
          )}
        </div>

        {/* ── SCROLLABLE BODY ── */}
        <div className="overflow-y-auto flex-1 px-4 pt-4 pb-12">

          {/* 📅 Tournament Info card */}
          <div className="bg-white/5 rounded-xl p-4 mb-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
              📅 Tournament Info
            </div>
            {dateRange && (
              <div className="flex items-center justify-between py-1.5 border-b border-white/5">
                <span className="text-[13px] text-zinc-400">Dates</span>
                <span className="text-[13px] font-semibold text-white">{dateRange}</span>
              </div>
            )}
            <div className="flex items-center justify-between py-1.5 border-b border-white/5">
              <span className="text-[13px] text-zinc-400">Round</span>
              <span className="text-[13px] font-semibold text-white">{roundDisplay}</span>
            </div>
            {tournament.course && (
              <div className="flex items-center justify-between py-1.5 border-b border-white/5">
                <span className="text-[13px] text-zinc-400">Course</span>
                <span className="text-[13px] font-semibold text-white text-right max-w-[60%] truncate">{tournament.course}</span>
              </div>
            )}
            {tournament.location && (
              <div className="flex items-center justify-between py-1.5 border-b border-white/5">
                <span className="text-[13px] text-zinc-400">Location</span>
                <span className="text-[13px] font-semibold text-white">{tournament.location}</span>
              </div>
            )}
            {tournament.purse && (
              <div className="flex items-center justify-between py-1.5">
                <span className="text-[13px] text-zinc-400">Purse</span>
                <span className="text-[13px] font-semibold text-white">{tournament.purse}</span>
              </div>
            )}
          </div>

          {/* 👥 Leaderboard / Field card */}
          {hasLeaders ? (
            <div className="bg-white/5 rounded-xl overflow-hidden mb-3">
              {/* Section title */}
              <div className="px-4 pt-4 pb-2">
                <div className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                  {isUpcoming ? "👥 Field" : "🏆 Leaderboard"}
                </div>
              </div>

              {/* Column headers for live/completed */}
              {!isUpcoming && (
                <div
                  className="grid px-4 py-2"
                  style={{
                    gridTemplateColumns: "32px 1fr 52px 44px 36px",
                    background: "rgba(255,255,255,0.03)",
                    borderTop: "1px solid rgba(255,255,255,0.06)",
                    borderBottom: "1px solid rgba(255,255,255,0.06)",
                  }}
                >
                  <span />
                  <span className="text-[9px] tracking-widest uppercase font-semibold text-zinc-600">
                    Player
                  </span>
                  <span className="text-[9px] tracking-widest uppercase font-semibold text-right text-zinc-600">
                    Total
                  </span>
                  <span className="text-[9px] tracking-widest uppercase font-semibold text-right text-zinc-600">
                    Rd
                  </span>
                  <span className="text-[9px] tracking-widest uppercase font-semibold text-right text-zinc-600">
                    Thru
                  </span>
                </div>
              )}

              {/* Player rows */}
              {tournament.leaders.map((p, i) =>
                isUpcoming ? (
                  // Upcoming: name + country, no scores
                  <div
                    key={`${p.name}-${i}`}
                    className="flex items-center px-4 py-3 gap-3"
                    style={{
                      background: i % 2 === 1 ? "rgba(255,255,255,0.02)" : "transparent",
                      borderBottom:
                        i < tournament.leaders.length - 1
                          ? "1px solid rgba(255,255,255,0.04)"
                          : "none",
                    }}
                  >
                    <span className="text-[11px] text-zinc-600 w-6 flex-shrink-0 tabular-nums">
                      {i + 1}
                    </span>
                    <span className="text-[13px] font-semibold text-white flex-1 truncate">
                      {p.name}
                    </span>
                    {p.country && (
                      <span className="text-[11px] text-zinc-500 flex-shrink-0">{p.country}</span>
                    )}
                  </div>
                ) : (
                  // Live / completed: full score row
                  <div
                    key={`${p.name}-${i}`}
                    className="grid items-center px-4 py-3"
                    style={{
                      gridTemplateColumns: "32px 1fr 52px 44px 36px",
                      background: i % 2 === 1 ? "rgba(255,255,255,0.02)" : "transparent",
                      borderBottom:
                        i < tournament.leaders.length - 1
                          ? "1px solid rgba(255,255,255,0.04)"
                          : "none",
                    }}
                  >
                    <span className="text-[11px] tabular-nums text-zinc-500">{p.position}</span>
                    <div className="flex flex-col min-w-0 pr-2">
                      <span className="text-[13px] font-semibold text-white truncate">
                        {p.shortName || p.name}
                      </span>
                      {p.country && (
                        <span className="text-[10px] text-zinc-600">{p.country}</span>
                      )}
                    </div>
                    <span
                      className="text-right text-[13px] font-bold tabular-nums"
                      style={{ color: scoreColor(p.totalScore) }}
                    >
                      {p.totalScore}
                    </span>
                    <span className="text-right text-[12px] text-zinc-600 tabular-nums">
                      {p.todayScore}
                    </span>
                    <span className="text-right text-[11px] text-zinc-700 tabular-nums">
                      {p.thru}
                    </span>
                  </div>
                ),
              )}

              {/* Cut line note */}
              {tournament.cutLine && (
                <div className="px-4 py-2.5 text-center text-[10px] text-zinc-600 border-t border-white/5">
                  {tournament.cutLine}
                </div>
              )}
            </div>
          ) : (
            // No leaders yet
            <div className="bg-white/5 rounded-xl p-6 mb-3 flex items-center justify-center">
              <span className="text-[13px] text-zinc-600">
                {isUpcoming
                  ? "Field announced closer to tournament"
                  : "Leaderboard available when tournament begins"}
              </span>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
