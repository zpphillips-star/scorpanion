'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Game, ScoreUpdate } from '@/lib/types'
import { SEATTLE_TEAMS, getTeamLogoUrl } from '@/lib/teams'
import { useSelectedTeams } from '@/hooks/useSelectedTeams'
import { useTeamClickCounts } from '@/hooks/useTeamClickCounts'
import GameCard from '@/components/GameCard'
import TeamLogo from '@/components/TeamLogo'

function groupGamesByDate(games: Game[]): Map<string, Game[]> {
  const groups = new Map<string, Game[]>()
  for (const game of games) {
    const d = new Date(game.kickoff)
    const key = d.toLocaleDateString('en-CA')
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

function isWithinLastDays(dateStr: string, days: number): boolean {
  const date = new Date(dateStr + 'T00:00:00')
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)
  cutoff.setHours(0, 0, 0, 0)
  return date >= cutoff && date < new Date(new Date().toLocaleDateString('en-CA') + 'T00:00:00')
}

function AuthButton() {
  const [user, setUser] = useState<{ email?: string } | null>(null)
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (!supabaseUrl || supabaseUrl.includes('placeholder')) {
      setChecked(true)
      return
    }
    import('@/lib/supabase').then(({ createClient }) => {
      const supabase = createClient()
      supabase.auth.getUser().then(({ data }) => {
        setUser(data.user ? { email: data.user.email } : null)
        setChecked(true)
      })
    })
  }, [])

  if (!checked) return null

  if (user) {
    return (
      <Link href="/auth/login" className="w-8 h-8 rounded-full bg-blue-600/30 border border-blue-500/40 flex items-center justify-center text-blue-400 text-sm font-bold hover:bg-blue-600/50 transition-colors" title={user.email}>
        {user.email?.[0]?.toUpperCase() ?? '?'}
      </Link>
    )
  }

  return (
    <Link href="/auth/login" className="text-xs text-gray-500 hover:text-gray-300 transition-colors flex items-center gap-1">
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
      Sign in
    </Link>
  )
}

export default function ScheduleClient() {
  const { selectedTeamIds, loaded } = useSelectedTeams()
  const { counts: teamClickCounts, recordClick: recordTeamClick } = useTeamClickCounts()
  const [games, setGames] = useState<Game[]>([])
  const [liveScores, setLiveScores] = useState<Record<string, ScoreUpdate>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTeamFilter, setActiveTeamFilter] = useState<string>('all')

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
          fetch(`/api/schedule?teams=${espnTeamIds.join(',')}`).then(r => {
            if (!r.ok) throw new Error('Failed to fetch schedule')
            return r.json()
          })
        )
      }

      if (selectedTeamIds.includes('torrent')) {
        fetches.push(
          fetch('/api/pwhl').then(r => {
            if (!r.ok) return []
            return r.json()
          })
        )
      }

      if (WHL_TEAM_IDS.some(id => selectedTeamIds.includes(id))) {
        fetches.push(
          fetch('/api/whl').then(r => {
            if (!r.ok) return []
            return r.json() as Promise<Game[]>
          }).then(games =>
            games.filter(g => selectedTeamIds.includes(g.seattleTeamId))
          )
        )
      }

      if (NCAA_TEAM_IDS.some(id => selectedTeamIds.includes(id))) {
        fetches.push(
          fetch('/api/ncaa', { signal: AbortSignal.timeout(8000) }).then(r => {
            if (!r.ok) return []
            return r.json() as Promise<Game[]>
          }).then(games =>
            games.filter(g => selectedTeamIds.includes(g.seattleTeamId))
          ).catch(() => [])
        )
      }

      const results = await Promise.all(fetches)
      const merged = results.flat().sort(
        (a, b) => new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime()
      )
      setGames(merged)
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

  const filteredGames = activeTeamFilter === 'all'
    ? mergedGames
    : mergedGames.filter(g => g.seattleTeamId === activeTeamFilter)

  const liveGames = filteredGames.filter(g => g.status === 'live')
  const todayStr = new Date().toLocaleDateString('en-CA')

  const recentGames = filteredGames.filter(g =>
    g.status === 'ft' && isWithinLastDays(new Date(g.kickoff).toLocaleDateString('en-CA'), 3)
  )

  const todayGames = filteredGames.filter(g =>
    g.status !== 'live' && new Date(g.kickoff).toLocaleDateString('en-CA') === todayStr
  )

  const upcomingGames = filteredGames.filter(g => {
    const d = new Date(g.kickoff).toLocaleDateString('en-CA')
    return g.status !== 'ft' && d > todayStr && g.status !== 'live'
  })

  const groupedUpcoming = groupGamesByDate(upcomingGames)
  const sortedUpcomingDates = [...groupedUpcoming.keys()].sort()

  const followedTeams = SEATTLE_TEAMS
    .filter(t => selectedTeamIds.includes(t.id))
    .sort((a, b) => {
      const cA = teamClickCounts[a.id] || 0
      const cB = teamClickCounts[b.id] || 0
      if (cA !== cB) return cB - cA
      return a.shortName.localeCompare(b.shortName)
    })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const MainContent = () => (
    <div className="pb-4">
      {error && (
        <div className="mx-4 mt-4 p-3 bg-red-900/30 border border-red-500/30 rounded-lg text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Team filter chips */}
      <div className="overflow-x-auto scrollbar-hide">
        <div className="flex gap-2 px-4 py-3 min-w-max">
          <button
            onClick={() => setActiveTeamFilter('all')}
            className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all border"
            style={{
              backgroundColor: activeTeamFilter === 'all' ? 'rgba(59,130,246,0.3)' : 'rgba(255,255,255,0.05)',
              borderColor: activeTeamFilter === 'all' ? '#3b82f6' : 'rgba(255,255,255,0.1)',
              color: activeTeamFilter === 'all' ? '#93c5fd' : '#9ca3af',
            }}
          >
            All
          </button>
          {followedTeams.map(team => (
            <button
              key={team.id}
              onClick={() => { setActiveTeamFilter(team.id); recordTeamClick(team.id) }}
              className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all border whitespace-nowrap"
              style={{
                backgroundColor: activeTeamFilter === team.id ? `${team.primaryColor}44` : 'rgba(255,255,255,0.05)',
                borderColor: activeTeamFilter === team.id ? team.primaryColor : 'rgba(255,255,255,0.1)',
                color: activeTeamFilter === team.id ? '#fff' : '#9ca3af',
              }}
            >
              {team.shortName}
            </button>
          ))}
        </div>
      </div>

      {/* Live Now */}
      {liveGames.length > 0 && (
        <div className="mx-4 mb-3 p-3 bg-red-900/20 border border-red-500/20 rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
            <span className="text-red-300 font-semibold text-sm">{liveGames.length} Live Game{liveGames.length !== 1 ? 's' : ''}</span>
          </div>
          {liveGames.map(g => <GameCard key={g.id} game={g} />)}
        </div>
      )}

      {/* Recent Results */}
      {recentGames.length > 0 && (
        <div className="mb-3">
          <div className="px-4 py-2 flex items-center gap-2">
            <span className="text-gray-300 text-sm font-semibold">Recent Results</span>
          </div>
          {recentGames.map(g => <GameCard key={g.id} game={g} />)}
        </div>
      )}

      {/* Today's Games */}
      {todayGames.length > 0 && (
        <div className="mb-3">
          <div className="px-4 py-2 flex items-center gap-2">
            <span className="text-gray-300 text-sm font-semibold">{formatDateHeader(todayStr)}</span>
            <span className="text-[10px] bg-blue-500 text-white px-1.5 py-0.5 rounded-full font-bold uppercase">Today</span>
          </div>
          {todayGames.map(g => <GameCard key={g.id} game={g} />)}
        </div>
      )}

      {/* No games message */}
      {liveGames.length === 0 && recentGames.length === 0 && todayGames.length === 0 && sortedUpcomingDates.length === 0 && (
        <div className="text-center py-16 text-gray-500">
          <p className="text-4xl mb-3">🏟️</p>
          <p>No games scheduled</p>
          <p className="text-sm mt-1">Select teams on the Teams tab</p>
        </div>
      )}

      {/* Upcoming grouped by date */}
      {sortedUpcomingDates.map(dateStr => (
        <div key={dateStr}>
          <div className="sticky top-[53px] z-20 px-4 py-2 bg-[#0a0a0f]/90 backdrop-blur-sm border-b border-white/5 flex items-center gap-2">
            <span className="text-gray-300 text-sm font-semibold">{formatDateHeader(dateStr)}</span>
          </div>
          {groupedUpcoming.get(dateStr)!.map(g => <GameCard key={g.id} game={g} />)}
        </div>
      ))}
    </div>
  )

  return (
    <>
      <div className="sticky top-0 z-30 px-4 py-3 bg-[#0a0a0f]/95 backdrop-blur-md border-b border-white/10 flex items-center justify-between">
        <h1 className="text-xl lg:text-2xl font-bold text-white">Schedule</h1>
        <AuthButton />
      </div>

      {/* Desktop: 2/3 + 1/3 sidebar layout */}
      <div className="lg:flex lg:gap-0">
        <div className="lg:flex-1 lg:min-w-0">
          <MainContent />
        </div>

        {/* Desktop sidebar: My Teams */}
        <div className="hidden lg:block lg:w-72 xl:w-80 border-l border-white/10 shrink-0">
          <div className="sticky top-[61px] p-4">
            <h2 className="text-white font-semibold text-sm mb-3 uppercase tracking-wider">My Teams</h2>
            <div className="space-y-2">
              {followedTeams.map(team => {
                const teamGames = mergedGames.filter(g => g.seattleTeamId === team.id)
                const latestGame = teamGames.filter(g => g.status === 'ft').slice(-1)[0]
                const record = latestGame?.seattleRecord
                return (
                  <button
                    key={team.id}
                    onClick={() => setActiveTeamFilter(activeTeamFilter === team.id ? 'all' : team.id)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl transition-all border text-left"
                    style={{
                      borderColor: activeTeamFilter === team.id ? team.primaryColor : 'rgba(255,255,255,0.08)',
                      backgroundColor: activeTeamFilter === team.id ? `${team.primaryColor}22` : 'rgba(255,255,255,0.03)',
                    }}
                  >
                    <TeamLogo src={getTeamLogoUrl(team)} emoji={team.emoji} abbr={team.abbr} size={32} />
                    <div className="min-w-0 flex-1">
                      <div className="text-white text-sm font-medium truncate">{team.shortName}</div>
                      {record ? (
                        <div className="text-gray-400 text-xs">{record.wins}-{record.losses}{record.ties ? `-${record.ties}` : ''}</div>
                      ) : (
                        <div className="text-gray-600 text-xs capitalize">{team.sport}</div>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
