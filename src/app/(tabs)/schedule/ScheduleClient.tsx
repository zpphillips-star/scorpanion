'use client'
import { useState, useEffect, useCallback } from 'react'
import { Game, ScoreUpdate } from '@/lib/types'
import { useSelectedTeams } from '@/hooks/useSelectedTeams'
import GameCard from '@/components/GameCard'

function groupGamesByDate(games: Game[]): Map<string, Game[]> {
  const groups = new Map<string, Game[]>()
  for (const game of games) {
    const d = new Date(game.kickoff)
    const key = d.toLocaleDateString('en-CA') // YYYY-MM-DD
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(game)
  }
  return groups
}

function formatDateHeader(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
}

function isToday(dateStr: string): boolean {
  return dateStr === new Date().toLocaleDateString('en-CA')
}

export default function ScheduleClient() {
  const { selectedTeamIds, loaded } = useSelectedTeams()
  const [games, setGames] = useState<Game[]>([])
  const [liveScores, setLiveScores] = useState<Record<string, ScoreUpdate>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSchedule = useCallback(async () => {
    if (!loaded || selectedTeamIds.length === 0) return
    try {
      const res = await fetch(`/api/schedule?teams=${selectedTeamIds.join(',')}`)
      if (!res.ok) throw new Error('Failed to fetch schedule')
      const data: Game[] = await res.json()
      setGames(data)
      setError(null)
    } catch {
      setError('Unable to load schedule. Check your connection.')
    } finally {
      setLoading(false)
    }
  }, [loaded, selectedTeamIds])

  const fetchLiveScores = useCallback(async () => {
    try {
      const res = await fetch('/api/live-scores')
      if (!res.ok) return
      const data: Record<string, ScoreUpdate> = await res.json()
      setLiveScores(data)
    } catch {}
  }, [])

  useEffect(() => {
    if (loaded) {
      setLoading(true)
      fetchSchedule()
    }
  }, [loaded, fetchSchedule])

  useEffect(() => {
    fetchLiveScores()
    const hasLive = Object.values(liveScores).some(s => s.status === 'live')
    const interval = setInterval(fetchLiveScores, hasLive ? 5000 : 30000)
    return () => clearInterval(interval)
  }, [fetchLiveScores, liveScores])

  const mergedGames = games.map(g => {
    const update = liveScores[g.id]
    if (!update) return g
    return { ...g, status: update.status, seattleScore: update.seattleScore, opponentScore: update.opponentScore }
  })

  const liveGames = mergedGames.filter(g => g.status === 'live')
  const grouped = groupGamesByDate(mergedGames)
  const sortedDates = [...grouped.keys()].sort()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="pb-4">
      <div className="sticky top-0 z-30 px-4 py-3 bg-[#0a0a0f]/95 backdrop-blur-md border-b border-white/10">
        <h1 className="text-xl font-bold text-white">Schedule</h1>
      </div>

      {error && (
        <div className="mx-4 mt-4 p-3 bg-red-900/30 border border-red-500/30 rounded-lg text-red-300 text-sm">
          {error}
        </div>
      )}

      {liveGames.length > 0 && (
        <div className="mx-4 mt-3 p-3 bg-red-900/20 border border-red-500/20 rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
            <span className="text-red-300 font-semibold text-sm">{liveGames.length} Live Game{liveGames.length !== 1 ? 's' : ''}</span>
          </div>
          {liveGames.map(g => <GameCard key={g.id} game={g} />)}
        </div>
      )}

      {sortedDates.length === 0 && !loading && (
        <div className="text-center py-16 text-gray-500">
          <p className="text-4xl mb-3">🏟️</p>
          <p>No games scheduled</p>
          <p className="text-sm mt-1">Select teams on the Teams tab</p>
        </div>
      )}

      {sortedDates.map(dateStr => (
        <div key={dateStr}>
          <div className="sticky top-[53px] z-20 px-4 py-2 bg-[#0a0a0f]/90 backdrop-blur-sm border-b border-white/5 flex items-center gap-2">
            <span className="text-gray-300 text-sm font-semibold">{formatDateHeader(dateStr)}</span>
            {isToday(dateStr) && (
              <span className="text-[10px] bg-blue-500 text-white px-1.5 py-0.5 rounded-full font-bold uppercase">Today</span>
            )}
          </div>
          {grouped.get(dateStr)!.map(g => <GameCard key={g.id} game={g} />)}
        </div>
      ))}
    </div>
  )
}
