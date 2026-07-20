"use client"
import { useCallback, useEffect } from "react"
import type { PGATournament } from "@/app/api/pga/route"

// ── Helpers ───────────────────────────────────────────────────────────────────

function scoreColor(s: string): string {
  if (s.startsWith("-")) return "#4ade80"
  if (s.startsWith("+")) return "#f87171"
  return "#e4e4e7"
}

/** "2025-06-19T00:00:00Z" → "THU, JUN 19" */
function fmtGolfDate(iso: string): string {
  if (!iso) return ""
  try {
    const [y, m, d] = iso.split("T")[0].split("-").map(Number)
    return new Date(y, m - 1, d).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    }).toUpperCase()
  } catch { return "" }
}

/** "2025-06-19" → "Jun 19" (for date range) */
function fmtGolfDateShort(iso: string): string {
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

// ── Sub-components ────────────────────────────────────────────────────────────

/** ALL-CAPS section label flanked by hairline dividers — identical to GameDetailSheet */
function SectionLabel({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 mb-3">
      <div className="flex-1 h-px bg-zinc-800" />
      <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 flex-shrink-0">
        {label}
      </span>
      <div className="flex-1 h-px bg-zinc-800" />
    </div>
  )
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
      ? `${fmtGolfDateShort(tournament.startDate)} – ${fmtGolfDateShort(tournament.endDate)}`
      : fmtGolfDateShort(tournament.startDate)

  const roundDisplay = isCompleted
    ? "Final"
    : isLive
    ? tournament.roundLabel
    : tournament.roundLabel || "Upcoming"

  // The header date line — e.g. "THU, JUN 19 – SUN, JUN 22"
  const headerDate = fmtGolfDate(tournament.startDate)

  // Logo URL — PGA or LPGA
  const logoUrl = label === "LPGA"
    ? "https://a.espncdn.com/combiner/i?img=/i/teamlogos/leagues/500/lpga.png"
    : "https://a.espncdn.com/combiner/i?img=/i/teamlogos/leagues/500/pgatour.png"

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
          background: "#0c1b31",
          paddingBottom: "env(safe-area-inset-bottom)",
          maxHeight: "94dvh",
          boxShadow: "0 -4px 40px rgba(0,0,0,0.7)",
        }}
        onClick={e => e.stopPropagation()}
      >

        {/* ── HEADER ── */}
        <div
          className="relative flex-shrink-0 px-5 pt-3 pb-6"
          style={{ background: "#0c1b31" }}
        >
          {/* Drag handle */}
          <div className="flex justify-center mb-3">
            <div className="w-9 h-1 rounded-full bg-white/20" />
          </div>

          {/* League label (top-left) + close ✕ (top-right) */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              {isLive && (
                <span className="relative flex h-1.5 w-1.5 flex-shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500" />
                </span>
              )}
              <span
                className="font-display text-[11px] font-bold uppercase tracking-[0.18em]"
                style={{ color: accentColor }}
              >
                {label}
              </span>
              {roundDisplay && (
                <span className="text-[11px] text-zinc-600">· {roundDisplay}</span>
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

          {/* ── HERO: centered logo + tournament info ── */}
          <div className="flex flex-col items-center gap-3">

            {/* Tour logo — large, like a team logo */}
            <div className="rounded-2xl p-2 flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={logoUrl}
                alt={label}
                width={80}
                height={80}
                style={{ objectFit: "contain" }}
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none" }}
              />
            </div>

            {/* Tournament name — same size/weight as team name in GameDetailSheet */}
            <div className="text-center">
              <div className="font-display text-[18px] font-bold text-white leading-tight px-4 text-center">
                {tournament.name}
              </div>
            </div>

            {/* Round / status — same position as score area */}
            <div className="flex flex-col items-center gap-0.5 mt-0.5">
              {isLive ? (
                <div className="flex items-center gap-1.5">
                  <span className="relative flex h-1.5 w-1.5 flex-shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500" />
                  </span>
                  <span className="font-display text-[13px] font-bold text-red-400 uppercase tracking-[0.14em]">
                    Live · {tournament.roundLabel}
                  </span>
                </div>
              ) : isCompleted ? (
                <span className="font-display text-[13px] font-bold uppercase tracking-[0.18em] text-zinc-500">
                  Final
                </span>
              ) : (
                /* Upcoming: show date range as the "time" line */
                <span className="font-display text-[15px] font-bold text-zinc-200 tabular-nums">
                  {dateRange}
                </span>
              )}

              {/* Date line — "THU, JUN 19" style, same as GameDetailSheet */}
              {headerDate && (
                <span className="font-display text-[10px] uppercase tracking-wider text-zinc-600 mt-0.5">
                  {headerDate}
                </span>
              )}
            </div>

          </div>

          {/* Venue line — 📍 Course, Location — same as GameDetailSheet */}
          <div className="flex items-center justify-center flex-wrap gap-x-3 gap-y-0.5 mt-5">
            {(tournament.course || tournament.location) && (
              <span className="text-[11px] text-zinc-600">
                📍{tournament.course ? ` ${tournament.course}` : ""}{tournament.location ? `, ${tournament.location}` : ""}
              </span>
            )}
            {tournament.purse && (
              <span className="text-[11px] text-zinc-600">💰 {tournament.purse}</span>
            )}
          </div>

          {/* Hairline divider */}
          <div className="absolute bottom-0 left-5 right-5 h-px bg-zinc-800/60" />
        </div>

        {/* ── SCROLLABLE BODY ── */}
        <div className="overflow-y-auto flex-1 px-5 pt-5 pb-12">

          {/* ── FIELD / LEADERBOARD section ── */}
          <div className="mb-5">
            <SectionLabel label={isUpcoming ? "Field" : "Leaderboard"} />

            {hasLeaders ? (
              <div
                className="rounded-xl overflow-hidden"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
              >
                {/* Column headers for live/completed */}
                {!isUpcoming && (
                  <div
                    className="grid px-4 py-2"
                    style={{
                      gridTemplateColumns: "32px 1fr 52px 44px 36px",
                      background: "rgba(255,255,255,0.03)",
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
              // No leaders yet — graceful empty state
              <div
                className="rounded-xl p-6 flex items-center justify-center"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
              >
                <span className="text-[13px] text-zinc-600">
                  {isUpcoming
                    ? "Field TBA"
                    : "Leaderboard available when tournament begins"}
                </span>
              </div>
            )}
          </div>

        </div>
      </div>
    </>
  )
}
