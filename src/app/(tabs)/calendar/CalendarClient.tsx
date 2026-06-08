'use client'
import { useState, useEffect, useCallback } from 'react'
import { Game } from '@/lib/types'
import { SEATTLE_TEAMS } from '@/lib/teams'
import { useSelectedTeams } from '@/hooks/useSelectedTeams'
import GameCard from '@/components/GameCard'

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay()
}

interface MonthCalendarProps {
  year: number
  month: number
  games: Game[]
  onDayClick: (dateStr: string) => void
  selectedDate: string | null
  onPrev: () => void
  onNext: () => void
}

function MonthCalendar({ year, month, games, onDayClick, selectedDate, onPrev, onNext }: MonthCalendarProps) {
  const daysInMonth = getDaysInMonth(year, month)
  const firstDay = getFirstDayOfMonth(year, month)
  const today = new Date().toLocaleDateString('en-CA')

  // Map date → unique team primary colors
  const gamesByDay = new Map<string, { games: Game[]; colors: string[] }>()
  for (const g of games) {
    const d = new Date(g.kickoff)
    if (d.getFullYear() === year && d.getMonth() === month) {
      const key = d.toLocaleDateString('en-CA')
      if (!gamesByDay.has(key)) gamesByDay.set(key, { games: [], colors: [] })
      const entry = gamesByDay.get(key)!
      entry.games.push(g)
      const color = g.seattleTeam.primaryColor
      if (!entry.colors.includes(color)) entry.colors.push(color)
    }
  }

  const monthName = new Date(year, month, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)
  const blanks = Array.from({ length: firstDay }, (_, i) => i)

  return (
    <div className="mb-2">
      {/* Month header with navigation */}
      <div className="flex items-center justify-between px-4 py-3">
        <button
          onClick={onPrev}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h2 className="text-white font-semibold text-base">{monthName}</h2>
        <button
          onClick={onNext}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 px-4 mb-1">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
          <div key={d} className="text-center text-gray-500 text-xs py-1">{d}</div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 px-4 gap-y-1">
        {blanks.map(i => <div key={`blank-${i}`} />)}
        {days.map(day => {
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const entry = gamesByDay.get(dateStr)
          const hasGames = !!entry && entry.games.length > 0
          const isToday = dateStr === today
          const isSelected = dateStr === selectedDate

          return (
            <button
              key={day}
              onClick={() => hasGames && onDayClick(dateStr)}
              className={`relative flex flex-col items-center justify-start pt-1 pb-1.5 rounded-lg min-h-[44px] transition-colors ${
                isSelected ? 'bg-blue-600/30' : isToday ? 'bg-white/10' : hasGames ? 'hover:bg-white/5 cursor-pointer' : 'cursor-default'
              }`}
            >
              <span className={`text-sm w-7 h-7 flex items-center justify-center rounded-full ${
                isToday ? 'bg-blue-500 text-white font-bold' : 'text-gray-300'
              }`}>
                {day}
              </span>
              {hasGames && (
                <div className="flex gap-0.5 mt-0.5 flex-wrap justify-center">
                  {entry!.colors.slice(0, 3).map((color, idx) => (
                    <span
                      key={idx}
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default function CalendarClient() {
  const { selectedTeamIds, loaded } = useSelectedTeams()
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  const now = new Date()
  const [viewYear, setViewYear] = useState(now.getFullYear())
  const [viewMonth, setViewMonth] = useState(now.getMonth())

  const fetchSchedule = useCallback(async () => {
    if (!loaded || selectedTeamIds.length === 0) return
    try {
      const WHL_TEAM_IDS = ['thunderbirds', 'silvertips']
      const NCAA_TEAM_IDS = ['uw-softball', 'uw-soccer']
      const espnTeamIds = selectedTeamIds.filter(
        id => id !== 'torrent' && !WHL_TEAM_IDS.includes(id) && !NCAA_TEAM_IDS.includes(id)
      )

      const fetches: Promise<Game[]>[] = []

      if (espnTeamIds.length > 0) {
        fetches.push(
          fetch(`/api/schedule?teams=${espnTeamIds.join(',')}`).then(r => r.ok ? r.json() : [])
        )
      }
      if (selectedTeamIds.includes('torrent')) {
        fetches.push(fetch('/api/pwhl').then(r => r.ok ? r.json() : []))
      }
      if (WHL_TEAM_IDS.some(id => selectedTeamIds.includes(id))) {
        fetches.push(
          fetch('/api/whl').then(r => r.ok ? r.json() as Promise<Game[]> : []).then(games =>
            games.filter(g => selectedTeamIds.includes(g.seattleTeamId))
          )
        )
      }
      if (NCAA_TEAM_IDS.some(id => selectedTeamIds.includes(id))) {
        fetches.push(
          fetch('/api/ncaa', { signal: AbortSignal.timeout(8000) }).then(r => r.ok ? r.json() as Promise<Game[]> : []).then(games =>
            games.filter(g => selectedTeamIds.includes(g.seattleTeamId))
          ).catch(() => [])
        )
      }

      const results = await Promise.all(fetches)
      setGames(results.flat())
    } catch {}
    finally { setLoading(false) }
  }, [loaded, selectedTeamIds])

  useEffect(() => {
    if (loaded) fetchSchedule()
  }, [loaded, fetchSchedule])

  // Filter games to only those from followed teams
  const filteredGames = games.filter(g => selectedTeamIds.includes(g.seattleTeamId))

  const selectedGames = selectedDate
    ? filteredGames.filter(g => new Date(g.kickoff).toLocaleDateString('en-CA') === selectedDate)
    : []

  function prevMonth() {
    if (viewMonth === 0) {
      setViewMonth(11)
      setViewYear(y => y - 1)
    } else {
      setViewMonth(m => m - 1)
    }
    setSelectedDate(null)
  }

  function nextMonth() {
    if (viewMonth === 11) {
      setViewMonth(0)
      setViewYear(y => y + 1)
    } else {
      setViewMonth(m => m + 1)
    }
    setSelectedDate(null)
  }

  return (
    <div className="pb-4">
      <div className="sticky top-0 z-30 px-4 py-3 bg-[#0a0a0f]/95 backdrop-blur-md border-b border-white/10">
        <h1 className="text-xl lg:text-2xl font-bold text-white">Calendar</h1>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="mt-2 max-w-2xl mx-auto">
          <MonthCalendar
            year={viewYear}
            month={viewMonth}
            games={filteredGames}
            onDayClick={setSelectedDate}
            selectedDate={selectedDate}
            onPrev={prevMonth}
            onNext={nextMonth}
          />

          {/* Legend */}
          {selectedTeamIds.length > 0 && (
            <div className="px-4 mt-2 flex flex-wrap gap-x-4 gap-y-1">
              {SEATTLE_TEAMS.filter(t => selectedTeamIds.includes(t.id)).map(team => (
                <div key={team.id} className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: team.primaryColor }} />
                  <span className="text-gray-500 text-xs">{team.shortName}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Day sheet */}
      {selectedDate && (
        <div className="fixed inset-0 z-50 flex items-end" onClick={() => setSelectedDate(null)}>
          <div className="absolute inset-0 bg-black/60" />
          <div
            className="relative w-full rounded-t-2xl max-h-[70vh] overflow-y-auto lg:max-w-2xl lg:mx-auto"
            style={{ background: '#0f0f1a' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-[#0f0f1a] px-4 py-3 border-b border-white/10 flex items-center justify-between">
              <span className="text-white font-semibold">
                {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </span>
              <button onClick={() => setSelectedDate(null)} className="text-gray-400 hover:text-white">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {selectedGames.length === 0 ? (
              <div className="p-6 text-center text-gray-500">No games on this day</div>
            ) : (
              selectedGames.map(g => <GameCard key={g.id} game={g} />)
            )}
          </div>
        </div>
      )}
    </div>
  )
}
