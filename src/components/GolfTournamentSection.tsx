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
}

function scoreColor(score: string) {
  if (!score || score === 'E' || score === '--') return '#a1a1aa'
  if (score.startsWith('-')) return '#4ade80'
  if (score.startsWith('+')) return '#f87171'
  return '#a1a1aa'
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
    : tournament.status === 'post' ? 'Tournament Complete' : 'Upcoming'

  return (
    <>
      <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50" onClick={onClose} />
      <div
        className="fixed bottom-0 left-0 right-0 z-50 lg:max-w-4xl lg:mx-auto overflow-hidden flex flex-col animate-slide-up"
        style={{ background: "#0c1b31", paddingBottom: "env(safe-area-inset-bottom)", maxHeight: "92dvh" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex-shrink-0 px-5 pt-5 pb-4" style={{ background: "linear-gradient(to bottom, #142236, #0c1b31)" }}>
          <button onClick={onClose} className="absolute top-4 right-5 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white text-sm">✕</button>
          <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1">{label}</div>
          <div className="text-[22px] font-bold text-white leading-tight">{tournament.name}</div>
          {tournament.course && (
            <div className="text-[12px] text-zinc-400 mt-1">
              {tournament.course}{tournament.location ? ` · ${tournament.location}` : ''}
            </div>
          )}
          <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
            {tournament.status === 'in' && (
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: accentColor }} />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ background: accentColor }} />
              </span>
            )}
            <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-300">{statusLabel}</span>
          </div>
        </div>

        {/* Column headers */}
        <div className="flex-shrink-0 flex items-center px-5 py-2 border-b border-zinc-800">
          <div className="w-8 text-[10px] text-zinc-600 uppercase tracking-wider text-right">#</div>
          <div className="flex-1 text-[10px] text-zinc-600 uppercase tracking-wider ml-3">Player</div>
          <div className="w-12 text-[10px] text-zinc-600 uppercase tracking-wider text-right">Today</div>
          <div className="w-12 text-[10px] text-zinc-600 uppercase tracking-wider text-right">Total</div>
          <div className="w-10 text-[10px] text-zinc-600 uppercase tracking-wider text-right">Thru</div>
        </div>

        {/* Full leaderboard — all players, cut players dimmed */}
        <div className="overflow-y-auto flex-1 px-5">
          {tournament.leaders.map((player, i) => {
            const isCut = player.status === 'cut'
            const prevCut = i > 0 && tournament.leaders[i - 1].status !== 'cut'
            const showCutLine = isCut && prevCut
            return (
              <div key={player.name + i}>
                {showCutLine && (
                  <div className="flex items-center gap-2 my-2">
                    <div className="flex-1 h-px bg-zinc-700" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-600">Cut</span>
                    <div className="flex-1 h-px bg-zinc-700" />
                  </div>
                )}
                <div className={`flex items-center py-3 border-b border-zinc-800/40 ${isCut ? 'opacity-40' : ''}`}>
                  <div className="w-8 text-[12px] text-zinc-500 font-mono text-right flex-shrink-0">{player.rank}</div>
                  <div className="flex-1 min-w-0 ml-3">
                    <div className="text-[14px] font-semibold text-white truncate">{player.name}</div>
                    {player.country && <div className="text-[11px] text-zinc-600">{player.country}</div>}
                  </div>
                  <div className="w-12 text-right flex-shrink-0">
                    <span className="text-[13px] font-semibold tabular-nums" style={{ color: isCut ? '#52525b' : scoreColor(player.today) }}>
                      {player.today || '–'}
                    </span>
                  </div>
                  <div className="w-12 text-right flex-shrink-0">
                    <span className="text-[16px] font-bold tabular-nums" style={{ color: isCut ? '#52525b' : scoreColor(player.score) }}>
                      {player.score}
                    </span>
                  </div>
                  <div className="w-10 text-right flex-shrink-0">
                    <span className="text-[12px] text-zinc-400">{isCut ? 'CUT' : player.thru}</span>
                  </div>
                </div>
              </div>
            )
          })}
          <div className="h-6" />
        </div>
      </div>
    </>
  )
}

// ── Main section (tappable, shows top 3, opens detail sheet) ─────────────────
export function GolfTournamentSection({ tourId, accentColor, logoUrl, label }: GolfTournamentSectionProps) {
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
          {/* Section header */}
          <div className="flex items-center gap-3 px-5 mb-3">
            <span className="font-display text-[13px] font-800 text-white uppercase tracking-widest">{label}</span>
            <div className="flex-1 h-px bg-zinc-800" />
            {tournament && (
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider">
                {tournament.status === 'in' ? `Round ${tournament.round}` : tournament.status === 'post' ? 'Final' : 'Upcoming'}
              </span>
            )}
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

              {/* Top 3 preview rows */}
              <div className="px-5 pr-6">
                {tournament.leaders.slice(0, 3).map((player, i) => (
                  <div key={player.name}>
                    {i > 0 && <div className="h-px bg-zinc-800/60" />}
                    <div className="flex items-center gap-3 py-2.5">
                      <div className="w-5 flex-shrink-0 text-right">
                        <span className="text-[11px] text-zinc-600 font-mono">{player.rank}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-[13px] font-semibold text-white truncate block">{player.name}</span>
                      </div>
                      <div className="w-10 text-right flex-shrink-0">
                        <span className="text-[11px]" style={{ color: scoreColor(player.today) }}>{player.today || '–'}</span>
                        <div className="text-[9px] text-zinc-700 uppercase">Rd</div>
                      </div>
                      <div className="w-10 text-right flex-shrink-0">
                        <span className="text-[14px] font-bold tabular-nums" style={{ color: scoreColor(player.score) }}>{player.score}</span>
                        <div className="text-[9px] text-zinc-700 uppercase">Tot</div>
                      </div>
                      <div className="w-8 text-right flex-shrink-0">
                        <span className="text-[11px] text-zinc-500">{player.thru}</span>
                        <div className="text-[9px] text-zinc-700 uppercase">Thru</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* "Tap to see full field" hint */}
              {(tournament.leaders?.length ?? 0) > 3 && (
                <div className="px-5 pt-1 pb-1">
                  <span className="text-[11px] text-zinc-600">
                    Full field ({tournament.leaders.length} players) · tap to open →
                  </span>
                </div>
              )}
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
