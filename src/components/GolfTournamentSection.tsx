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

export function GolfTournamentSection({ tourId, accentColor, logoUrl, label }: GolfTournamentSectionProps) {
  const [tournament, setTournament] = useState<GolfTournament | null>(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    fetch(`/api/golf?tour=${tourId}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { setTournament(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [tourId])

  const visiblePlayers = expanded ? tournament?.leaders : tournament?.leaders?.slice(0, 5)

  function scoreColor(score: string) {
    if (!score || score === 'E' || score === '--') return '#a1a1aa'
    if (score.startsWith('-')) return '#4ade80'   // under par = green
    if (score.startsWith('+')) return '#f87171'   // over par = red
    return '#a1a1aa'
  }

  return (
    <div className="px-4 pb-2">
      {/* Section header */}
      <div className="flex items-center gap-3 mb-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logoUrl} alt={label} width={22} height={22} className="object-contain flex-shrink-0 opacity-90" />
        <span className="font-display text-[13px] font-800 text-white uppercase tracking-widest">{label}</span>
        <div className="flex-1 h-px bg-zinc-800" />
        {tournament && (
          <span className="text-[10px] text-zinc-600 uppercase tracking-wider">
            {tournament.status === 'in' ? `Round ${tournament.round}` : tournament.status === 'post' ? 'Final' : 'Upcoming'}
          </span>
        )}
      </div>

      {loading ? (
        <div className="py-6 flex justify-center">
          <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: accentColor, borderTopColor: 'transparent' }} />
        </div>
      ) : !tournament ? (
        <div className="py-6 text-center">
          <span className="text-[13px] text-zinc-600">No active tournament</span>
        </div>
      ) : (
        <>
          {/* Tournament name + course */}
          <div className="mb-3">
            <div className="text-[15px] font-bold text-white leading-tight">{tournament.name}</div>
            {tournament.course && (
              <div className="text-[11px] text-zinc-500 mt-0.5">{tournament.course}{tournament.location ? ` · ${tournament.location}` : ''}</div>
            )}
          </div>

          {/* Leaderboard rows */}
          <div>
            {visiblePlayers?.map((player, i) => (
              <div key={player.name}>
                {i > 0 && <div className="h-px bg-zinc-800/60 mx-0" />}
                <div className="flex items-center gap-3 py-2.5">
                  {/* Rank */}
                  <div className="w-6 flex-shrink-0 text-right">
                    <span className="text-[11px] text-zinc-600 font-mono">{player.rank}</span>
                  </div>
                  {/* Name */}
                  <div className="flex-1 min-w-0">
                    <span className="text-[13px] font-semibold text-white leading-tight truncate block">{player.name}</span>
                    {player.country && (
                      <span className="text-[10px] text-zinc-600">{player.country}</span>
                    )}
                  </div>
                  {/* Today's score */}
                  <div className="w-10 text-right flex-shrink-0">
                    <span className="text-[11px]" style={{ color: scoreColor(player.today) }}>
                      {player.today || '–'}
                    </span>
                    <div className="text-[9px] text-zinc-700 uppercase">Today</div>
                  </div>
                  {/* Total score */}
                  <div className="w-10 text-right flex-shrink-0">
                    <span className="text-[14px] font-bold tabular-nums" style={{ color: scoreColor(player.score) }}>
                      {player.score}
                    </span>
                    <div className="text-[9px] text-zinc-700 uppercase">Total</div>
                  </div>
                  {/* Thru */}
                  <div className="w-7 text-right flex-shrink-0">
                    <span className="text-[11px] text-zinc-500">{player.thru}</span>
                    <div className="text-[9px] text-zinc-700 uppercase">Thru</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Expand/collapse */}
          {(tournament.leaders?.length ?? 0) > 5 && (
            <button
              onClick={() => setExpanded(e => !e)}
              className="mt-1 w-full py-2 text-[12px] font-semibold uppercase tracking-wider transition-opacity active:opacity-70"
              style={{ color: accentColor }}
            >
              {expanded ? '▲ Show Less' : `▼ Full Leaderboard (${tournament.leaders.length})`}
            </button>
          )}
        </>
      )}
    </div>
  )
}
