'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { Game, ScoreUpdate } from '@/lib/types'
import { SEATTLE_TEAMS, getTeamLogoUrl } from '@/lib/teams'
import { useSelectedTeams } from '@/hooks/useSelectedTeams'
import { useTeamClickCounts } from '@/hooks/useTeamClickCounts'
import GameCard from '@/components/GameCard'
import TeamLogo from '@/components/TeamLogo'
import TeamFilterBar, { getCollegeGroupKey } from '@/components/TeamFilterBar'

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

  // Adaptive polling: 2s when live, 30s otherwise (mirrors wcscores behavior)
  const liveScoresRef = useRef(liveScores)
  useEffect(() => { liveScoresRef.current = liveScores }, [liveScores])

  useEffect(() => {
    fetchLiveScores()
    let interval = setInterval(fetchLiveScores, 30_000)
    const adaptivePoller = setInterval(() => {
      const hasLive = Object.values(liveScoresRef.current).some(s => s.status === 'live')
      const newRate = hasLive ? 2_000 : 30_000
      clearInterval(interval)
      interval = setInterval(fetchLiveScores, newRate)
    }, 5_000)
    return () => { clearInterval(interval); clearInterval(adaptivePoller) }
  }, [fetchLiveScores])

  const mergedGames = games.map(g => {
    const update = liveScores[g.id]
    if (!update) return g
    return { ...g, status: update.status, seattleScore: update.seattleScore, opponentScore: update.opponentScore }
  })

  const filteredGames = (() => {
    if (activeTeamFilter === 'all') return mergedGames
    // College group: match any sport variant
    const item = SEATTLE_TEAMS.find(t => t.id === activeTeamFilter)
    if (!item) return mergedGames
    const gk = getCollegeGroupKey(activeTeamFilter)
    if (gk) {
      const ids = SEATTLE_TEAMS.filter(t => getCollegeGroupKey(t.id) === gk).map(t => t.id)
      return mergedGames.filter(g => ids.includes(g.seattleTeamId))
    }
    return mergedGames.filter(g => g.seattleTeamId === activeTeamFilter)
  })()

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

  const followedTeams = SEATTLE_TEAMS.filter(t => selectedTeamIds.includes(t.id))

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-[#00d4ff] border-t-transparent rounded-full animate-spin" />
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

      {/* Team logo filter bar */}
      <TeamFilterBar
        selectedTeamIds={selectedTeamIds}
        activeFilter={activeTeamFilter}
        onFilterChange={setActiveTeamFilter}
        teamClickCounts={teamClickCounts}
        recordClick={recordTeamClick}
      />

      {/* Live Now — wcscores style live banner */}
      {liveGames.length > 0 && (
        <div className="relative overflow-hidden border-b border-red-500/20">
          <div className="absolute inset-0 bg-gradient-to-r from-red-950/60 via-red-900/30 to-transparent" />
          <div className="relative flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2.5">
              <div className="relative flex-shrink-0">
                <span className="absolute inset-0 rounded-full bg-red-500/30 animate-ping" />
                <span className="relative block w-2.5 h-2.5 rounded-full bg-red-500" />
              </div>
              <div className="flex flex-col">
                <span className="text-[13px] font-bold text-white leading-tight">
                  {liveGames.length === 1 ? '1 game live' : `${liveGames.length} games live`}
                </span>
                <span className="text-[10px] text-red-400/80 leading-tight">Scores updating every 2s</span>
              </div>
            </div>
            <span className="text-[10px] font-bold text-red-400 bg-red-500/15 border border-red-500/25 px-2.5 py-1 rounded-full uppercase tracking-widest">
              Live
            </span>
          </div>
          <div className="px-2 pb-2">
            {liveGames.map(g => <GameCard key={g.id} game={g} />)}
          </div>
        </div>
      )}

      {/* Recent Results */}
      {recentGames.length > 0 && (
        <div className="mb-3">
          <div
            className="sticky top-[53px] z-20 px-4 py-2.5 flex items-center gap-3"
            style={{ background: 'rgba(10,10,15,0.96)', backdropFilter: 'blur(8px)' }}
          >
            <span className="text-[12px] uppercase tracking-widest font-bold text-white">Recent Results</span>
            <div className="flex-1 h-px bg-zinc-800" />
          </div>
          {recentGames.map(g => <GameCard key={g.id} game={g} />)}
        </div>
      )}

      {/* Today's Games */}
      {todayGames.length > 0 && (
        <div className="mb-3">
          <div
            className="sticky top-[53px] z-20 px-4 py-2.5 flex items-center gap-3"
            style={{ background: 'rgba(10,10,15,0.96)', backdropFilter: 'blur(8px)' }}
          >
            <span className="text-[12px] uppercase tracking-widest font-bold text-[#00d4ff]">{formatDateHeader(todayStr)}</span>
            <span className="text-[9px] font-bold uppercase tracking-wider text-[#00d4ff] bg-[#00d4ff]/10 px-2 py-0.5 rounded-full">Today</span>
            <div className="flex-1 h-px bg-zinc-800" />
          </div>
          {todayGames.map(g => <GameCard key={g.id} game={g} />)}
        </div>
      )}

      {/* No games message */}
      {liveGames.length === 0 && recentGames.length === 0 && todayGames.length === 0 && sortedUpcomingDates.length === 0 && (
        <div className="mx-3 mt-6 rounded-2xl overflow-hidden text-center py-10 px-6" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <div className="text-5xl mb-3">📅</div>
          <div className="font-display text-[16px] font-700 text-zinc-300 uppercase tracking-wide mb-1">No games in schedule</div>
          {selectedTeamIds.length === 0 ? (
            <p className="text-zinc-500 text-sm">Go to the Teams tab and follow some teams.</p>
          ) : (
            <p className="text-zinc-500 text-sm">Your teams may be in off-season. Check back closer to the season.</p>
          )}
        </div>
      )}

      {/* Upcoming grouped by date */}
      {sortedUpcomingDates.map(dateStr => (
        <div key={dateStr}>
          <div
            className="sticky top-[53px] z-20 px-4 py-2.5 flex items-center gap-3"
            style={{ background: 'rgba(10,10,15,0.96)', backdropFilter: 'blur(8px)' }}
          >
            <span className="text-[12px] uppercase tracking-widest font-bold text-white">{formatDateHeader(dateStr)}</span>
            <div className="flex-1 h-px bg-zinc-800" />
          </div>
          {groupedUpcoming.get(dateStr)!.map(g => <GameCard key={g.id} game={g} />)}
        </div>
      ))}
    </div>
  )

  return (
    <>
      <div className="sticky top-0 z-30 glass-header px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="font-display text-[26px] font-800 text-white leading-none tracking-tight uppercase">Schedule</h1>
        </div>
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
