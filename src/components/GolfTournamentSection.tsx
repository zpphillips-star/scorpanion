"use client"
import { useState, useEffect } from "react"

interface GolfPlayer {
  rank: number
  name: string
  country: string
  score: string
  today: string
  thru: string
  status: string
}

interface GolfTournament {
  id: string
  name: string
  course: string
  location: string
  status: 'pre' | 'in' | 'post'
  round: number
  totalRounds: number
  startDate: string
  endDate: string
  leaders: GolfPlayer[]
}

interface GolfTournamentSectionProps {
  tourId: 'pga' | 'lpga'
  accentColor: string
  logoUrl: string
  label: string
  mode?: 'preview' | 'full'
}

function scoreColor(score: string) {
  if (!score || score === 'E' || score === '--') return '#e4e4e7'
  if (score.startsWith('-')) return '#4ade80'
  if (score.startsWith('+')) return '#f87171'
  return '#e4e4e7'
}

// ── Full detail sheet ─────────────────────────────────────────────────────────
function GolfDetailSheet({ tournament, label, accentColor, onClose }: {
  tournament: GolfTournament
  label: string
  accentColor: string
  onClose: () => void
}) {
  const statusLabel = tournament.status === 'in'
    ? `Round ${tournament.round} of ${tournament.totalRounds}`
    : tournament.status === 'post' ? 'Final' : 'Upcoming'

  return (
    <>
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50" onClick={onClose} />
      <div
        className="fixed bottom-0 left-0 right-0 z-50 lg:max-w-4xl lg:mx-auto overflow-hidden flex flex-col animate-slide-up rounded-t-2xl"
        style={{ background: "#0d1520", paddingBottom: "env(safe-area-inset-bottom)", maxHeight: "92dvh" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="flex-shrink-0 flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        {/* Header */}
        <div className="flex-shrink-0 px-5 pt-2 pb-4" style={{ background: "linear-gradient(to bottom, #111d2e, #0d1520)" }}>
          <button
            onClick={onClose}
            className="absolute top-4 right-5 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/70 text-sm hover:bg-white/15 transition-colors"
          >✕</button>

          <div className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: accentColor }}>
            {label}
          </div>
          <div className="text-[22px] font-bold text-white leading-tight pr-10">{tournament.name}</div>
          {tournament.course && (
            <div className="text-[12px] text-zinc-400 mt-0.5">
              {tournament.course}{tournament.location ? ` · ${tournament.location}` : ''}
            </div>
          )}
          <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.07)" }}>
            {tournament.status === 'in' && (
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: accentColor }} />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ background: accentColor }} />
              </span>
            )}
            <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-300">{statusLabel}</span>
          </div>
        </div>

        {/* Column headers — sticky above scroll */}
        <div className="flex-shrink-0 flex items-center px-5 py-2 border-b border-white/[0.06]" style={{ background: "#0d1520" }}>
          {/* name (rank is now inline, no placeholder needed) */}
          <div className="flex-1 text-[9px] font-bold uppercase tracking-widest text-zinc-600">Player</div>
          {/* stat headers right-side group */}
          <div className="flex gap-4 flex-shrink-0">
            <div className="w-10 text-center text-[9px] font-bold uppercase tracking-widest text-zinc-600">Today</div>
            <div className="w-10 text-center text-[9px] font-bold uppercase tracking-widest text-zinc-600">Total</div>
            <div className="w-10 text-center text-[9px] font-bold uppercase tracking-widest text-zinc-600">Thru</div>
          </div>
        </div>

        {/* Full leaderboard — all players, cut players dimmed */}
        <div className="overflow-y-auto flex-1">
          {tournament.leaders.map((player, i) => {
            const isCut = player.status === 'cut'
            const prevCut = i > 0 && tournament.leaders[i - 1].status !== 'cut'
            const showCutLine = isCut && prevCut
            const isEven = i % 2 === 0
            return (
              <div key={player.name + i}>
                {showCutLine && (
                  <div className="flex items-center gap-3 px-5 my-1">
                    <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.08)" }} />
                    <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-600">Cut</span>
                    <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.08)" }} />
                  </div>
                )}
                <div
                  className={`flex items-center px-5 py-3 border-b border-white/[0.05] ${isCut ? 'opacity-40' : ''}`}
                  style={isEven ? { background: "rgba(255,255,255,0.02)" } : undefined}
                >
                  {/* Rank inline with name + country stacked below */}
                  <div className="flex-1 min-w-0 mr-4">
                    <div className="flex items-baseline">
                      <span className="text-[12px] text-zinc-500 mr-1.5">{player.rank}</span>
                      <span className="text-[15px] font-semibold text-white truncate leading-tight">{player.name}</span>
                    </div>
                    {player.country && (
                      <div className="text-[11px] text-zinc-500 mt-0.5 truncate">{player.country}</div>
                    )}
                  </div>

                  {/* Stat values — no per-row labels, header row covers labeling */}
                  <div className="flex gap-4 flex-shrink-0">
                    <div className="w-10 flex items-center justify-center">
                      <span className="text-[14px] font-bold tabular-nums leading-none" style={{ color: isCut ? '#52525b' : scoreColor(player.today) }}>
                        {player.today || '–'}
                      </span>
                    </div>
                    <div className="w-10 flex items-center justify-center">
                      <span className="text-[16px] font-bold tabular-nums leading-none" style={{ color: isCut ? '#52525b' : scoreColor(player.score) }}>
                        {player.score}
                      </span>
                    </div>
                    <div className="w-10 flex items-center justify-center">
                      <span className="text-[13px] font-semibold tabular-nums leading-none text-zinc-300">
                        {isCut ? 'CUT' : (player.thru || '–')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
          <div className="h-8" />
        </div>
      </div>
    </>
  )
}

// ── Main section (tappable, shows full field, opens detail sheet) ────────────
export function GolfTournamentSection({ tourId, accentColor, logoUrl, label, mode = 'full' }: GolfTournamentSectionProps) {
  const [tournament, setTournament] = useState<GolfTournament | null>(null)
  const [loading, setLoading] = useState(true)
  const [showDetail, setShowDetail] = useState(false)

  useEffect(() => {
    fetch(`/api/golf?tour=${tourId}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { setTournament(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [tourId])

  return (
    <>
      <button
        className="w-full text-left active:opacity-70 transition-opacity"
        onClick={() => tournament && setShowDetail(true)}
      >
        <div className="pb-2">
          {/* Section label — matches TodayGameCard league label: small dim text, no separator */}
          <div className="px-4 mb-3">
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--text-faint)" }}>{label}</span>
          </div>

          {loading ? (
            <div className="py-6 flex justify-center">
              <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: accentColor, borderTopColor: 'transparent' }} />
            </div>
          ) : !tournament ? (
            <div className="px-5 py-6 text-center">
              <span className="text-[13px] text-zinc-600">No active tournament</span>
            </div>
          ) : (
            <>
              {/* Tournament name — subtle subtitle */}
              <div className="px-5 mb-2">
                <span className="text-[12px] text-zinc-400">{tournament.name}</span>
                {tournament.course && (
                  <span className="text-[11px] text-zinc-600 ml-2">· {tournament.course}{tournament.location ? `, ${tournament.location}` : ''}</span>
                )}
              </div>

              {/* Column headers */}
              <div className="flex items-center px-5 py-1.5 border-b border-white/[0.06]">
                <div className="w-6 flex-shrink-0" />
                <div className="flex-1 text-[9px] font-bold text-zinc-600 uppercase tracking-widest ml-3">Player</div>
                <div className="flex gap-4 flex-shrink-0">
                  <div className="w-10 text-center text-[9px] font-bold text-zinc-600 uppercase tracking-widest">Rd</div>
                  <div className="w-10 text-center text-[9px] font-bold text-zinc-600 uppercase tracking-widest">Tot</div>
                  <div className="w-10 text-center text-[9px] font-bold text-zinc-600 uppercase tracking-widest">Thru</div>
                </div>
              </div>

              {/* Player rows — top 5 in preview, full field in full mode */}
              <div>
                {(mode === 'preview'
                  ? tournament.leaders.filter(p => p.status !== 'cut').slice(0, 5)
                  : tournament.leaders
                ).map((player, i, arr) => {
                  const isCut = player.status === 'cut'
                  // Cut divider only in full mode: insert before the first cut player
                  const prevWasActive = i > 0 && arr[i - 1].status !== 'cut'
                  const showCutLine = mode === 'full' && isCut && prevWasActive
                  const isEven = i % 2 === 0
                  return (
                    <div key={player.name + i}>
                      {showCutLine && (
                        <div className="flex items-center gap-3 px-5 my-1">
                          <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.07)" }} />
                          <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-600">Cut</span>
                          <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.07)" }} />
                        </div>
                      )}
                      <div
                        className={`flex items-center px-5 py-2.5 border-b border-white/[0.05] ${isCut ? 'opacity-40' : ''}`}
                        style={isEven ? { background: "rgba(255,255,255,0.015)" } : undefined}
                      >
                        <div className="w-6 flex-shrink-0 text-right">
                          <span className="text-[11px] text-zinc-600 font-mono tabular-nums">{player.rank}</span>
                        </div>
                        <div className="flex-1 min-w-0 ml-3 mr-3">
                          <span className="text-[13px] font-semibold text-white truncate block leading-tight">{player.name}</span>
                          {player.country && (
                            <span className="text-[10px] text-zinc-500 truncate block mt-0.5">{player.country}</span>
                          )}
                        </div>
                        <div className="flex gap-4 flex-shrink-0">
                          <div className="w-10 flex flex-col items-center gap-0.5">
                            <span className="text-[11px] tabular-nums font-semibold" style={{ color: isCut ? '#52525b' : scoreColor(player.today) }}>
                              {player.today || '–'}
                            </span>
                          </div>
                          <div className="w-10 flex flex-col items-center gap-0.5">
                            <span className="text-[14px] font-bold tabular-nums" style={{ color: isCut ? '#52525b' : scoreColor(player.score) }}>
                              {player.score}
                            </span>
                          </div>
                          <div className="w-10 flex flex-col items-center gap-0.5">
                            <span className="text-[11px] text-zinc-400 tabular-nums">{isCut ? 'CUT' : (player.thru || '–')}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Tap hint */}
              <div className="px-5 pt-1.5 pb-1">
                <span className="text-[11px] text-zinc-600">
                  {mode === 'preview' ? 'Tap for full leaderboard →' : 'Tap for tournament details →'}
                </span>
              </div>
            </>
          )}
        </div>
      </button>

      {showDetail && tournament && (
        <GolfDetailSheet
          tournament={tournament}
          label={label}
          accentColor={accentColor}
          onClose={() => setShowDetail(false)}
        />
      )}
    </>
  )
}
