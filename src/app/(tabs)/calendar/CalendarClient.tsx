'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { Game } from '@/lib/types'
import { SEATTLE_TEAMS, getTeamLogoUrl } from '@/lib/teams'
import { useSelectedTeams } from '@/hooks/useSelectedTeams'
import { useTeamClickCounts } from '@/hooks/useTeamClickCounts'
import GameCard from '@/components/GameCard'
import TeamFilterBar, { getCollegeGroupKey } from '@/components/TeamFilterBar'
import TeamLogo from '@/components/TeamLogo'

const DOW = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

function getDaysInMonth(y: number, m: number) { return new Date(y, m + 1, 0).getDate() }
function getFirstDay(y: number, m: number) { return new Date(y, m, 1).getDay() }

export default function CalendarClient() {
  const { selectedTeamIds, loaded } = useSelectedTeams()
  const { counts: teamClickCounts, recordClick } = useTeamClickCounts()
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [activeFilter, setActiveFilter] = useState('all')

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

  const filteredGames = (() => {
    const base = games.filter(g => selectedTeamIds.includes(g.seattleTeamId))
    if (activeFilter === 'all') return base
    const gk = getCollegeGroupKey(activeFilter)
    if (gk) return base.filter(g => getCollegeGroupKey(g.seattleTeamId) === gk)
    return base.filter(g => g.seattleTeamId === activeFilter)
  })()

  const selectedGames = selectedDate
    ? filteredGames.filter(g => new Date(g.kickoff).toLocaleDateString('en-CA') === selectedDate)
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

  // Map date → games + team colors
  const gamesByDay = new Map<string, { count: number; colors: string[]; logos: { src: string; emoji: string; abbr: string }[] }>()
  for (const g of filteredGames) {
    const d = new Date(g.kickoff)
    if (d.getFullYear() === viewYear && d.getMonth() === viewMonth) {
      const key = d.toLocaleDateString('en-CA')
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
    <div className="flex flex-col h-[calc(100dvh-68px)] overflow-hidden">

      {/* Sticky header */}
      <div className="flex-shrink-0 glass-header">
        <div className="px-4 py-2.5 flex items-center justify-between">
          <h1 className="font-display text-[24px] font-800 text-white leading-none tracking-tight uppercase">Calendar</h1>
        </div>
        <TeamFilterBar
          selectedTeamIds={selectedTeamIds}
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
          teamClickCounts={teamClickCounts}
          recordClick={recordClick}
        />
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
        </div>
      ) : (
        <div
          className="flex-1 flex flex-col overflow-hidden select-none"
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
            <div className="text-center">
              <div className="font-display text-[20px] font-800 text-white uppercase tracking-tight leading-none">{monthName}</div>
            </div>
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
                  onClick={() => { if (hasGames || isToday) { setSelectedDate(ds) } }}
                  className={`relative flex flex-col items-center justify-start pt-1.5 rounded-xl transition-all active:scale-95 ${
                    isSelected
                      ? 'ring-2 ring-[#00d4ff]'
                      : hasGames
                      ? 'cursor-pointer active:bg-white/10'
                      : 'cursor-default'
                  }`}
                  style={{
                    background: isSelected
                      ? 'rgba(0,212,255,0.12)'
                      : hasGames
                      ? 'var(--surface)'
                      : 'transparent',
                    border: hasGames && !isSelected ? '1px solid var(--border)' : isSelected ? 'none' : '1px solid transparent',
                  }}
                >
                  {/* Day number */}
                  <span
                    className={`font-display text-[15px] font-700 leading-none w-7 h-7 flex items-center justify-center rounded-full flex-shrink-0 ${
                      isToday ? 'font-800' : hasGames ? 'text-white' : 'text-zinc-600'
                    }`}
                    style={isToday ? { background: 'var(--accent)', color: '#08080f' } : {}}
                  >
                    {day}
                  </span>

                  {/* Team color dots */}
                  {hasGames && (
                    <div className="flex gap-0.5 mt-1 flex-wrap justify-center px-1">
                      {entry!.colors.slice(0, 3).map((color, i) => (
                        <span key={i} className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                      ))}
                    </div>
                  )}

                  {/* Game count badge for 2+ */}
                  {hasGames && entry!.count > 1 && (
                    <span className="font-display text-[9px] font-700 text-zinc-500 mt-0.5">{entry!.count}</span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Day game sheet */}
      {selectedDate && (
        <div className="fixed inset-0 z-50 flex items-end" onClick={() => setSelectedDate(null)}>
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" />
          <div
            className="relative w-full rounded-t-3xl max-h-[78dvh] overflow-hidden lg:max-w-2xl lg:mx-auto animate-slide-up"
            style={{ background: 'var(--surface)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="w-10 h-1 rounded-full bg-white/15 mx-auto mt-3 mb-0" />
            <div
              className="sticky top-0 px-5 py-3.5 flex items-center justify-between"
              style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}
            >
              <div>
                <div className="font-display text-[18px] font-800 text-white uppercase tracking-tight">
                  {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                </div>
                <div className="font-display text-[11px] font-600 text-zinc-500 uppercase tracking-widest">
                  {selectedGames.length} Game{selectedGames.length !== 1 ? 's' : ''}
                </div>
              </div>
              <button
                onClick={() => setSelectedDate(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm"
                style={{ background: 'rgba(255,255,255,0.08)' }}
              >✕</button>
            </div>
            <div className="overflow-y-auto" style={{ maxHeight: '65dvh', paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}>
              {selectedGames.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="text-4xl mb-3">🗓️</div>
                  <div className="font-display text-[14px] font-700 text-zinc-400 uppercase tracking-wide">No games this day</div>
                  <div className="text-zinc-600 text-[12px] mt-1">Try another date or check upcoming games on Home</div>
                </div>
              ) : (
                <div className="py-2">
                  {selectedGames.map(g => <GameCard key={g.id} game={g} />)}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
