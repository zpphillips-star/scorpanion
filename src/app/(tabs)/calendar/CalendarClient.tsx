'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { Game, ScoreUpdate } from '@/lib/types'
import { getTeamLogoUrl } from '@/lib/teams'
import { useSelectedTeams } from '@/hooks/useSelectedTeams'
import { useTeamClickCounts } from '@/hooks/useTeamClickCounts'
import GameCard from '@/components/GameCard'
import GameDetailSheet from '@/components/GameDetailSheet'
import TeamFilterBar, { getCollegeGroupKey } from '@/components/TeamFilterBar'
import TeamLogo from '@/components/TeamLogo'
import PageHeader from '@/components/PageHeader'

const DOW = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

function getDaysInMonth(y: number, m: number) { return new Date(y, m + 1, 0).getDate() }
function getFirstDay(y: number, m: number) { return new Date(y, m, 1).getDay() }

export default function CalendarClient() {
  const { selectedTeamIds, loaded } = useSelectedTeams()
  const { counts: teamClickCounts, recordClick } = useTeamClickCounts()
  const [games, setGames] = useState<Game[]>([])
  const [liveScores, setLiveScores] = useState<Record<string, ScoreUpdate>>({})
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedGame, setSelectedGame] = useState<Game | null>(null)
  const [activeFilter, setActiveFilter] = useState('all')
  const liveScoresRef = useRef(liveScores)
  useEffect(() => { liveScoresRef.current = liveScores }, [liveScores])

  const now = new Date()
  const [viewYear, setViewYear] = useState(now.getFullYear())
  const [viewMonth, setViewMonth] = useState(now.getMonth())
  const [slideDir, setSlideDir] = useState<'left' | 'right' | null>(null)
  const [monthKey, setMonthKey] = useState(0)
  const touchStartX = useRef(0)
  const touchStartY = useRef(0)

  const fetchSchedule = useCallback(async () => {
    if (!loaded || selectedTeamIds.length === 0) return
    try {
      const WHL = ['thunderbirds', 'silvertips']
      const NCAA = ['uw-softball', 'uw-soccer']
      const espn = selectedTeamIds.filter(id => id !== 'torrent' && !WHL.includes(id) && !NCAA.includes(id))
      const fetches: Promise<Game[]>[] = []
      if (espn.length > 0) fetches.push(fetch(`/api/schedule?teams=${espn.join(',')}`).then(r => r.ok ? r.json() : []))
      if (selectedTeamIds.includes('torrent')) fetches.push(fetch('/api/pwhl').then(r => r.ok ? r.json() : []))
      if (WHL.some(id => selectedTeamIds.includes(id)))
        fetches.push(fetch('/api/whl').then(r => r.ok ? r.json() as Promise<Game[]> : []).then(gs => gs.filter(g => selectedTeamIds.includes(g.seattleTeamId))))
      if (NCAA.some(id => selectedTeamIds.includes(id)))
        fetches.push(fetch('/api/ncaa', { signal: AbortSignal.timeout(8000) }).then(r => r.ok ? r.json() as Promise<Game[]> : []).then(gs => gs.filter(g => selectedTeamIds.includes(g.seattleTeamId))).catch(() => []))
      const results = await Promise.all(fetches)
      setGames(results.flat())
    } catch {}
    finally { setLoading(false) }
  }, [loaded, selectedTeamIds])

  useEffect(() => { if (loaded) fetchSchedule() }, [loaded, fetchSchedule])

  // ── Live-score polling (same cadence as Home/Schedule) ─────────────────────
  const fetchLiveScores = useCallback(async () => {
    try {
      const r = await fetch('/api/live-scores')
      if (!r.ok) return
      setLiveScores(await r.json())
    } catch { /* silent */ }
  }, [])

  useEffect(() => {
    fetchLiveScores()
    let interval = setInterval(fetchLiveScores, 30_000)
    const adaptive = setInterval(() => {
      const hasLive = Object.values(liveScoresRef.current).some(s => s.status === 'live')
      clearInterval(interval)
      interval = setInterval(fetchLiveScores, hasLive ? 2_000 : 30_000)
    }, 5_000)
    return () => { clearInterval(interval); clearInterval(adaptive) }
  }, [fetchLiveScores])

  // Merge live scores into schedule data
  const allGames = games.map(g => {
    const u = liveScores[g.id]
    return u ? { ...g, status: u.status, seattleScore: u.seattleScore, opponentScore: u.opponentScore, clock: u.clock, period: u.period } : g
  })

  const filteredGames = (() => {
    const base = allGames.filter(g => selectedTeamIds.includes(g.seattleTeamId))
    if (activeFilter === 'all') return base
    const gk = getCollegeGroupKey(activeFilter)
    if (gk) return base.filter(g => getCollegeGroupKey(g.seattleTeamId) === gk)
    return base.filter(g => g.seattleTeamId === activeFilter)
  })()

  const selectedGames = selectedDate
    ? filteredGames.filter(g => {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
        return new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(new Date(g.kickoff)) === selectedDate
      })
    : []

  function navigate(dir: 'prev' | 'next') {
    setSlideDir(dir === 'next' ? 'left' : 'right')
    setMonthKey(k => k + 1)
    if (dir === 'next') {
      if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
      else setViewMonth(m => m + 1)
    } else {
      if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
      else setViewMonth(m => m - 1)
    }
    setSelectedDate(null)
  }

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
  }
  function handleTouchEnd(e: React.TouchEvent) {
    const dx = e.changedTouches[0].clientX - touchStartX.current
    const dy = Math.abs(e.changedTouches[0].clientY - touchStartY.current)
    if (Math.abs(dx) > 48 && dy < 60) {
      navigate(dx < 0 ? 'next' : 'prev')
    }
  }

  // Build calendar data
  const today = now.toLocaleDateString('en-CA')
  const daysInMonth = getDaysInMonth(viewYear, viewMonth)
  const firstDay = getFirstDay(viewYear, viewMonth)
  const monthName = new Date(viewYear, viewMonth, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  // Map date → games + team colors (timezone-aware)
  const gamesByDay = new Map<string, { count: number; colors: string[]; logos: { src: string; emoji: string; abbr: string }[] }>()
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
  for (const g of filteredGames) {
    const d = new Date(g.kickoff)
    const key = new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(d)
    const [ky, km] = key.split('-').map(Number)
    if (ky === viewYear && km - 1 === viewMonth) {
      if (!gamesByDay.has(key)) gamesByDay.set(key, { count: 0, colors: [], logos: [] })
      const e = gamesByDay.get(key)!
      e.count++
      if (!e.colors.includes(g.seattleTeam.primaryColor)) e.colors.push(g.seattleTeam.primaryColor)
    }
  }

  // Pad grid to always show 6 rows (42 cells)
  const totalCells = 42
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  while (cells.length < totalCells) cells.push(null)

  const slideClass = slideDir === 'left' ? 'animate-slide-in-left' : slideDir === 'right' ? 'animate-slide-in-right' : ''

  return (
    <>
      {/* ── Sticky header (same as Schedule/Home) ─────────────────────── */}
      <PageHeader title="Calendar">
        <TeamFilterBar
          selectedTeamIds={selectedTeamIds}
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
          teamClickCounts={teamClickCounts}
          recordClick={recordClick}
        />
      </PageHeader>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
        </div>
      ) : (
        <div
          className="select-none flex flex-col"
          style={{ height: 'calc(100dvh - 128px - 5rem)' }}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* Month nav */}
          <div className="flex-shrink-0 flex items-center justify-between px-5 py-3">
            <button
              onClick={() => navigate('prev')}
              className="w-9 h-9 flex items-center justify-center rounded-full transition-colors active:bg-white/10"
              style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}
            >
              <svg className="w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="font-display text-[20px] font-800 text-white uppercase tracking-tight leading-none">{monthName}</div>
            <button
              onClick={() => navigate('next')}
              className="w-9 h-9 flex items-center justify-center rounded-full transition-colors active:bg-white/10"
              style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}
            >
              <svg className="w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Day of week headers */}
          <div className="flex-shrink-0 grid grid-cols-7 px-2 pb-1">
            {DOW.map(d => (
              <div key={d} className="text-center font-display text-[11px] font-700 uppercase tracking-widest text-zinc-600 py-1">{d}</div>
            ))}
          </div>

          {/* Calendar grid — fills remaining space */}
          <div key={monthKey} className={`flex-1 grid grid-cols-7 grid-rows-6 px-2 pb-2 gap-px ${slideClass}`}>
            {cells.map((day, idx) => {
              if (!day) return <div key={`e-${idx}`} />
              const ds = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
              const entry = gamesByDay.get(ds)
              const hasGames = !!entry
              const isToday = ds === today
              const isSelected = ds === selectedDate

              return (
                <button
                  key={ds}
                  onClick={() => { if (hasGames || isToday) setSelectedDate(ds === selectedDate ? null : ds) }}
                  className={`relative flex flex-col items-center justify-start pt-1.5 rounded-xl transition-all active:scale-95 ${
                    isSelected ? 'ring-2 ring-[#00d4ff]' : hasGames ? 'cursor-pointer active:bg-white/10' : 'cursor-default'
                  }`}
                  style={{
                    background: isSelected ? 'rgba(0,212,255,0.12)' : hasGames ? 'var(--surface)' : 'transparent',
                    border: hasGames && !isSelected ? '1px solid var(--border)' : isSelected ? 'none' : '1px solid transparent',
                  }}
                >
                  <span
                    className={`font-display text-[15px] font-700 leading-none w-7 h-7 flex items-center justify-center rounded-full flex-shrink-0 ${
                      isToday ? 'font-800' : hasGames ? 'text-white' : 'text-zinc-600'
                    }`}
                    style={isToday ? { background: 'var(--accent)', color: '#08080f' } : {}}
                  >
                    {day}
                  </span>
                  {hasGames && (
                    <div className="flex gap-0.5 mt-1 flex-wrap justify-center px-1">
                      {entry!.colors.slice(0, 3).map((color, i) => (
                        <span key={i} className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                      ))}
                    </div>
                  )}
                  {hasGames && entry!.count > 1 && (
                    <span className="font-display text-[9px] font-700 text-zinc-500 mt-0.5">{entry!.count}</span>
                  )}
                </button>
              )
            })}
          </div>

          {/* ── Day game list (inline below grid when date selected) ──── */}
          {selectedDate && selectedGames.length > 0 && (
            <div
              className="flex-shrink-0 border-t animate-slide-up overflow-y-auto"
              style={{ borderColor: 'var(--border)', background: 'var(--surface)', maxHeight: '38dvh', paddingBottom: 'calc(env(safe-area-inset-bottom) + 1rem)' }}
            >
              <div className="px-5 py-3 flex items-center justify-between sticky top-0" style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
                <div>
                  <div className="font-display text-[16px] font-800 text-white uppercase tracking-tight">
                    {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                  </div>
                  <div className="font-display text-[10px] font-600 text-zinc-500 uppercase tracking-widest">
                    {selectedGames.length} Game{selectedGames.length !== 1 ? 's' : ''}
                  </div>
                </div>
                <button onClick={() => setSelectedDate(null)} className="w-7 h-7 rounded-full flex items-center justify-center text-zinc-400 text-sm" style={{ background: 'rgba(255,255,255,0.08)' }}>✕</button>
              </div>
              <div className="py-2">
                {selectedGames.map(g => (
                  <div key={g.id} onClick={() => setSelectedGame(g)} className="cursor-pointer">
                    <GameCard game={g} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty day */}
          {selectedDate && selectedGames.length === 0 && (
            <div className="flex-shrink-0 border-t py-6 text-center animate-slide-up" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
              <div className="text-3xl mb-2">🗓️</div>
              <div className="font-display text-[13px] font-700 text-zinc-400 uppercase tracking-wide">No games this day</div>
              <button onClick={() => setSelectedDate(null)} className="mt-3 text-[11px] text-zinc-500 underline">Dismiss</button>
            </div>
          )}
        </div>
      )}

      {/* ── Game detail sheet (same as everywhere else) ────────────────── */}
      {selectedGame && (
        <GameDetailSheet game={selectedGame} onClose={() => setSelectedGame(null)} />
      )}
    </>
  )
}
