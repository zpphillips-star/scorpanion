'use client'
import { useState, useEffect, useCallback } from 'react'
import { Game } from '@/lib/types'
import { SPORT_COLORS } from '@/lib/teams'
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
}

function MonthCalendar({ year, month, games, onDayClick, selectedDate }: MonthCalendarProps) {
  const daysInMonth = getDaysInMonth(year, month)
  const firstDay = getFirstDayOfMonth(year, month)
  const today = new Date().toLocaleDateString('en-CA')
  
  const gamesByDay = new Map<string, Game[]>()
  for (const g of games) {
    const d = new Date(g.kickoff)
    if (d.getFullYear() === year && d.getMonth() === month) {
      const key = d.toLocaleDateString('en-CA')
      if (!gamesByDay.has(key)) gamesByDay.set(key, [])
      gamesByDay.get(key)!.push(g)
    }
  }

  const monthName = new Date(year, month, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)
  const blanks = Array.from({ length: firstDay }, (_, i) => i)

  return (
    <div className="mb-6">
      <div className="px-4 py-2">
        <h2 className="text-white font-semibold text-base">{monthName}</h2>
      </div>
      <div className="grid grid-cols-7 px-4 mb-1">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
          <div key={d} className="text-center text-gray-500 text-xs py-1">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 px-4 gap-y-1">
        {blanks.map(i => <div key={`blank-${i}`} />)}
        {days.map(day => {
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const dayGames = gamesByDay.get(dateStr) || []
          const isToday = dateStr === today
          const isSelected = dateStr === selectedDate
          
          return (
            <button
              key={day}
              onClick={() => dayGames.length > 0 && onDayClick(dateStr)}
              className={`relative flex flex-col items-center justify-start pt-1 pb-1.5 rounded-lg min-h-[44px] transition-colors ${
                isSelected ? 'bg-blue-600/30' : isToday ? 'bg-white/10' : dayGames.length > 0 ? 'hover:bg-white/5' : ''
              }`}
            >
              <span className={`text-sm w-7 h-7 flex items-center justify-center rounded-full ${
                isToday ? 'bg-blue-500 text-white font-bold' : 'text-gray-300'
              }`}>
                {day}
              </span>
              {dayGames.length > 0 && (
                <div className="flex gap-0.5 mt-0.5 flex-wrap justify-center">
                  {[...new Set(dayGames.map(g => g.sport))].slice(0, 3).map(sport => (
                    <span
                      key={sport}
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: SPORT_COLORS[sport] || '#888' }}
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

  const fetchSchedule = useCallback(async () => {
    if (!loaded || selectedTeamIds.length === 0) return
    try {
      const res = await fetch(`/api/schedule?teams=${selectedTeamIds.join(',')}`)
      if (!res.ok) return
      const data: Game[] = await res.json()
      setGames(data)
    } catch {}
    finally { setLoading(false) }
  }, [loaded, selectedTeamIds])

  useEffect(() => {
    if (loaded) fetchSchedule()
  }, [loaded, fetchSchedule])

  const now = new Date()
  const months = [0, 1, 2].map(offset => {
    const d = new Date(now.getFullYear(), now.getMonth() + offset, 1)
    return { year: d.getFullYear(), month: d.getMonth() }
  })

  const selectedGames = selectedDate
    ? games.filter(g => new Date(g.kickoff).toLocaleDateString('en-CA') === selectedDate)
    : []

  return (
    <div className="pb-4">
      <div className="sticky top-0 z-30 px-4 py-3 bg-[#0a0a0f]/95 backdrop-blur-md border-b border-white/10">
        <h1 className="text-xl font-bold text-white">Calendar</h1>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="mt-2">
          {months.map(({ year, month }) => (
            <MonthCalendar
              key={`${year}-${month}`}
              year={year}
              month={month}
              games={games}
              onDayClick={setSelectedDate}
              selectedDate={selectedDate}
            />
          ))}
        </div>
      )}

      {/* Day sheet */}
      {selectedDate && (
        <div className="fixed inset-0 z-50 flex items-end" onClick={() => setSelectedDate(null)}>
          <div className="absolute inset-0 bg-black/60" />
          <div
            className="relative w-full rounded-t-2xl max-h-[70vh] overflow-y-auto"
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
