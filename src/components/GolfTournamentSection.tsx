"use client"
import { useState, useEffect, useRef, useCallback } from "react"
import { LEAGUE_SEASON, fmtShort } from "@/lib/seasonDates"

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

interface ScheduleTournament {
  id: string
  name: string
  startDate: string
  endDate: string
}

interface RankingsPlayer {
  rank: number
  name: string
  country: string
  points: string
  earnings?: string
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
        <div className="flex-shrink-0 flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>
        <div className="flex-shrink-0 px-5 pt-2 pb-4" style={{ background: "linear-gradient(to bottom, #111d2e, #0d1520)" }}>
          <button
            onClick={onClose}
            className="absolute top-4 right-5 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/70 text-sm hover:bg-white/15 transition-colors"
          >✕</button>
          <div className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: accentColor }}>{label}</div>
          <div className="text-[22px] font-bold text-white leading-tight pr-10">{tournament.name}</div>
          {tournament.course && (
            <div className="text-[12px] text-zinc-400 mt-0.5">
              {tournament.course}{tournament.location ? ` · ${tournament.location}` : ''}
            </div>
          )}
          <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.15)" }}>
            {tournament.status === 'in' && (
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: accentColor }} />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ background: accentColor }} />
              </span>
            )}
            <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-300">{statusLabel}</span>
          </div>
        </div>
        <div className="flex-shrink-0 flex items-center px-5 py-2 border-b border-white/[0.15]" style={{ background: "#0d1520" }}>
          <div className="flex-1 text-[9px] font-bold uppercase tracking-widest text-zinc-600">Player</div>
          <div className="flex gap-4 flex-shrink-0">
            <div className="w-10 text-center text-[9px] font-bold uppercase tracking-widest text-zinc-600">Today</div>
            <div className="w-10 text-center text-[9px] font-bold uppercase tracking-widest text-zinc-600">Total</div>
            <div className="w-10 text-center text-[9px] font-bold uppercase tracking-widest text-zinc-600">Thru</div>
          </div>
        </div>
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
                    <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.16)" }} />
                    <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-600">Cut</span>
                    <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.16)" }} />
                  </div>
                )}
                <div
                  className={`flex items-center px-5 py-3 border-b border-white/[0.05] ${isCut ? 'opacity-40' : ''}`}
                  style={isEven ? { background: "rgba(255,255,255,0.02)" } : undefined}
                >
                  <div className="flex-1 min-w-0 flex items-start gap-3 mr-4">
                    <span className="w-6 flex-shrink-0 text-right text-[12px] text-zinc-500 tabular-nums pt-0.5">{player.rank}</span>
                    <div className="flex flex-col min-w-0">
                      <span className="text-[15px] font-semibold text-white truncate leading-tight">{player.name}</span>
                      {player.country && <span className="text-[11px] text-zinc-500 truncate mt-0.5">{player.country}</span>}
                    </div>
                  </div>
                  <div className="flex gap-4 flex-shrink-0">
                    <div className="w-10 flex items-center justify-center">
                      <span className="text-[14px] font-semibold tabular-nums leading-none" style={{ color: isCut ? '#52525b' : scoreColor(player.today) }}>
                        {player.today || '–'}
                      </span>
                    </div>
                    <div className="w-10 flex items-center justify-center">
                      <span className="text-[14px] font-semibold tabular-nums leading-none" style={{ color: isCut ? '#52525b' : scoreColor(player.score) }}>
                        {player.score}
                      </span>
                    </div>
                    <div className="w-10 flex items-center justify-center">
                      <span className="text-[14px] font-semibold tabular-nums leading-none text-zinc-300">
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

// ── Schedule tab ─────────────────────────────────────────────────────────────
function ScheduleTab({ schedule, accentColor, onSelectActive }: {
  schedule: ScheduleTournament[]
  accentColor: string
  onSelectActive: () => void
}) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const sorted = [...schedule].sort((a, b) => a.startDate.localeCompare(b.startDate))

  if (sorted.length === 0) {
    return (
      <div className="px-5 py-8 text-center">
        <span className="text-[13px] text-zinc-600">Schedule not available</span>
      </div>
    )
  }

  return (
    <div>
      {sorted.map((t, i) => {
        // Slice to date-only in case ESPN returns full ISO timestamps
        const startIso = t.startDate.slice(0, 10)
        const endIso   = t.endDate.slice(0, 10)
        const start    = new Date(startIso + 'T00:00:00')
        const end      = new Date(endIso   + 'T23:59:59')

        const isCompleted = end < today
        const isActive    = start <= today && today <= end
        const isEven      = i % 2 === 0

        const startFmt = fmtShort(startIso)
        const endFmt   = fmtShort(endIso)
        const dateRange = startFmt === endFmt ? startFmt : `${startFmt}–${endFmt}`

        return (
          <div
            key={t.id}
            className={`flex items-center px-4 py-3 border-b border-white/[0.05] ${isActive ? 'cursor-pointer' : ''}`}
            style={{
              background: isActive
                ? `${accentColor}10`
                : isEven && !isCompleted
                  ? "rgba(255,255,255,0.012)"
                  : undefined,
              opacity: isCompleted ? 0.45 : 1,
            }}
            onClick={() => isActive && onSelectActive()}
          >
            <div className="flex-1 min-w-0">
              <div className={`font-display text-[13px] truncate ${isActive ? 'font-700 text-white' : isCompleted ? 'text-zinc-600 font-500' : 'font-600 text-zinc-300'}`}>
                {t.name}
              </div>
              <div className={`text-[11px] mt-0.5 ${isCompleted ? 'text-zinc-700' : 'text-zinc-500'}`}>{dateRange}</div>
            </div>
            <div className="ml-3 flex-shrink-0">
              {isActive && (
                <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest"
                  style={{ background: `${accentColor}22`, color: accentColor }}>ACTIVE</span>
              )}
              {isCompleted && (
                <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest text-zinc-700" style={{ background: "rgba(255,255,255,0.04)" }}>DONE</span>
              )}
              {!isActive && !isCompleted && (
                <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest text-zinc-600" style={{ background: "rgba(255,255,255,0.04)" }}>UPCOMING</span>
              )}
            </div>
          </div>
        )
      })}
      <div className="h-6" />
    </div>
  )
}

// ── Rankings tab ─────────────────────────────────────────────────────────────
function RankingsTab({ rankings, accentColor, loading }: {
  rankings: RankingsPlayer[]
  accentColor: string
  loading: boolean
}) {
  if (loading) {
    return (
      <div className="py-8 flex justify-center">
        <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: accentColor, borderTopColor: 'transparent' }} />
      </div>
    )
  }
  if (rankings.length === 0) {
    return (
      <div className="px-5 py-8 text-center">
        <span className="text-[13px] text-zinc-600">Rankings not available</span>
      </div>
    )
  }
  return (
    <div>
      {/* Column headers */}
      <div className="flex items-center px-4 py-1.5 border-b border-white/[0.15]">
        <div className="w-7 flex-shrink-0 text-[9px] font-bold uppercase tracking-widest text-zinc-600 text-center">#</div>
        <div className="flex-1 text-[9px] font-bold uppercase tracking-widest text-zinc-600 ml-3">Player</div>
        <div className="text-right text-[9px] font-bold uppercase tracking-widest text-zinc-600 mr-1">Points</div>
      </div>
      {rankings.map((player, i) => (
        <div
          key={player.name + i}
          className="flex items-center px-4 py-2.5 border-b border-white/[0.05]"
          style={i % 2 === 0 ? { background: "rgba(255,255,255,0.015)" } : undefined}
        >
          <span className="w-7 flex-shrink-0 text-center text-[12px] text-zinc-500 tabular-nums font-mono">{player.rank}</span>
          <div className="flex-1 min-w-0 ml-3 mr-3">
            <div className="text-[13px] font-semibold text-white truncate leading-tight">{player.name}</div>
            {player.country && <div className="text-[10px] text-zinc-500 truncate mt-0.5">{player.country}</div>}
          </div>
          <div className="text-right flex-shrink-0">
            <div className="text-[13px] font-semibold tabular-nums" style={{ color: accentColor }}>{player.points || '–'}</div>
            {player.earnings && <div className="text-[10px] text-zinc-600 tabular-nums mt-0.5">{player.earnings}</div>}
          </div>
        </div>
      ))}
      <div className="h-6" />
    </div>
  )
}

// ── Main section ─────────────────────────────────────────────────────────────
export function GolfTournamentSection({ tourId, accentColor, label }: GolfTournamentSectionProps) {
  const [activeTab, setActiveTab]         = useState<'schedule' | 'rankings'>('schedule')
  const [schedule, setSchedule]           = useState<ScheduleTournament[]>([])
  const [rankings, setRankings]           = useState<RankingsPlayer[]>([])
  const [tournament, setTournament]       = useState<GolfTournament | null>(null)
  const [loadingSchedule, setLoadingSchedule] = useState(true)
  const [loadingRankings, setLoadingRankings] = useState(false)
  const [rankingsFetched, setRankingsFetched] = useState(false)
  const [showDetail, setShowDetail]       = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Fetch schedule once on mount
  useEffect(() => {
    setLoadingSchedule(true)
    fetch(`/api/golf?tour=${tourId}&mode=schedule`)
      .then(r => r.ok ? r.json() : [])
      .then(d => { setSchedule(Array.isArray(d) ? d : []); setLoadingSchedule(false) })
      .catch(() => setLoadingSchedule(false))
  }, [tourId])

  // Fetch current tournament (for detail sheet)
  const doFetch = useCallback(() => {
    fetch(`/api/golf?tour=${tourId}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        setTournament(d)
        const isLive = d?.status === 'in'
        const nextInterval = isLive ? 60_000 : 5 * 60_000
        if (intervalRef.current) clearInterval(intervalRef.current)
        intervalRef.current = setInterval(doFetch, nextInterval)
      })
      .catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tourId])

  useEffect(() => {
    doFetch()
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [doFetch])

  // Lazy-fetch rankings when that tab is first opened
  useEffect(() => {
    if (activeTab !== 'rankings' || rankingsFetched) return
    setLoadingRankings(true)
    fetch(`/api/golf?tour=${tourId}&mode=rankings`)
      .then(r => r.ok ? r.json() : [])
      .then(d => { setRankings(Array.isArray(d) ? d : []); setLoadingRankings(false); setRankingsFetched(true) })
      .catch(() => { setLoadingRankings(false); setRankingsFetched(true) })
  }, [activeTab, tourId, rankingsFetched])

  // Season dates from LEAGUE_SEASON
  const seasonData = LEAGUE_SEASON[tourId]
  const currentYear = new Date().getFullYear()
  const fmtD = (iso: string) => {
    if (!iso) return ''
    const year = parseInt(iso.split('-')[0], 10)
    return year !== currentYear ? `${fmtShort(iso)}, ${year}` : fmtShort(iso)
  }

  return (
    <>
      <div className="pb-2">
        {/* Section label */}
        <div className="px-4 mb-3">
          <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--text-faint)" }}>{label}</span>
        </div>

        {/* Season dates header */}
        {seasonData && (
          <div className="mx-4 mb-3 px-3 py-2.5 rounded-xl" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.16)" }}>
            <div className="font-display text-[11px] text-zinc-400">
              Regular season{' '}
              <span className="text-zinc-200">{fmtD(seasonData.regularStart)} – {fmtD(seasonData.regularEnd)}</span>
            </div>
            {seasonData.playoffStart && (
              <div className="font-display text-[11px] text-zinc-500 mt-0.5">
                {seasonData.playoffLabel || 'Playoffs'}{' '}
                <span className="text-zinc-400">{fmtD(seasonData.playoffStart)} – {fmtD(seasonData.playoffEnd)}</span>
                {' · '}
                <span className="text-zinc-500">{seasonData.championship}</span>
              </div>
            )}
          </div>
        )}

        {/* Tab switcher */}
        <div className="flex gap-2 px-4 mb-3">
          {(['schedule', 'rankings'] as const).map(tab => {
            const active = activeTab === tab
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="flex-1 py-2 rounded-lg font-display text-[11px] font-700 uppercase tracking-widest transition-all"
                style={{
                  background: active ? `${accentColor}20` : "var(--surface-2)",
                  color: active ? accentColor : "#71717a",
                  border: `1px solid ${active ? accentColor + '40' : 'rgba(255,255,255,0.15)'}`,
                }}
              >
                {tab === 'schedule' ? 'Schedule' : 'Rankings'}
              </button>
            )
          })}
        </div>

        {/* Schedule tab */}
        {activeTab === 'schedule' && (
          loadingSchedule ? (
            <div className="py-8 flex justify-center">
              <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: accentColor, borderTopColor: 'transparent' }} />
            </div>
          ) : (
            <ScheduleTab
              schedule={schedule}
              accentColor={accentColor}
              onSelectActive={() => tournament && setShowDetail(true)}
            />
          )
        )}

        {/* Rankings tab */}
        {activeTab === 'rankings' && (
          <RankingsTab rankings={rankings} accentColor={accentColor} loading={loadingRankings} />
        )}
      </div>

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

