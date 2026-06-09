'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { Game, ScoreUpdate } from '@/lib/types'
import { SEATTLE_TEAMS, getTeamLogoUrl } from '@/lib/teams'
import { useSelectedTeams } from '@/hooks/useSelectedTeams'
import { useTeamClickCounts } from '@/hooks/useTeamClickCounts'
import TeamLogo from '@/components/TeamLogo'
import TeamFilterBar, { getCollegeGroupKey } from '@/components/TeamFilterBar'
import PageHeader from '@/components/PageHeader'
import GameDetailSheet from '@/components/GameDetailSheet'

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
  const today = new Date().toLocaleDateString('en-CA')
  const tomorrow = new Date(Date.now() + 86400000).toLocaleDateString('en-CA')
  if (dateStr === today) return 'Today'
  if (dateStr === tomorrow) return 'Tomorrow'
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

function ScheduleRow({ game, isToday, onTap }: { game: Game; isToday: boolean; onTap: () => void }) {
  const color = game.seattleTeam.primaryColor
  const isFt = game.status === 'ft'
  const isLive = game.status === 'live'
  const hasScore = isFt || isLive
  const seattleWon = hasScore && (game.seattleScore ?? 0) > (game.opponentScore ?? 0)
  const seattleLost = hasScore && (game.seattleScore ?? 0) < (game.opponentScore ?? 0)
  const seattleLogoUrl = getTeamLogoUrl(game.seattleTeam)

  return (
    <button
      className="w-full text-left active:bg-white/5 transition-colors"
      onClick={onTap}
    >
      <div
        className="flex items-center px-4 py-3.5 gap-3"
        style={{
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          ...(isToday ? { borderLeft: `3px solid ${color}`, paddingLeft: '13px' } : {}),
        }}
      >
        {/* Seattle team */}
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <TeamLogo src={seattleLogoUrl} emoji={game.seattleTeam.emoji} abbr={game.seattleTeam.abbr} size={32} />
          <span className={`font-display text-[15px] font-700 truncate ${seattleLost ? 'text-zinc-500' : 'text-white'}`}>
            {game.seattleTeam.shortName}
          </span>
        </div>

        {/* Center: score or time */}
        <div className="flex flex-col items-center flex-shrink-0 min-w-[80px]">
          {hasScore ? (
            <>
              <span className="font-display text-[20px] font-800 tabular-nums leading-none text-white">
                <span className={seattleLost ? 'text-zinc-500' : ''}>{game.seattleScore}</span>
                <span className="text-zinc-600 mx-1 text-[16px]">–</span>
                <span className={seattleWon ? 'text-zinc-500' : ''}>{game.opponentScore}</span>
              </span>
              {isLive ? (
                <span className="flex items-center gap-1 mt-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                  <span className="font-display text-[10px] font-700 text-red-400 uppercase tracking-widest">Live</span>
                </span>
              ) : (
                <span className={`font-display text-[11px] font-700 uppercase tracking-wider mt-0.5 ${seattleWon ? 'text-emerald-400' : seattleLost ? 'text-red-400' : 'text-zinc-500'}`}>
                  {seattleWon ? 'W' : seattleLost ? 'L' : 'T'} · Final
                </span>
              )}
            </>
          ) : (
            <>
              <span className="font-display text-[13px] font-600 text-zinc-400 leading-none">vs</span>
              <span className="font-display text-[14px] font-700 text-white mt-0.5">{formatTime(game.kickoff)}</span>
            </>
          )}
        </div>

        {/* Opponent */}
        <div className="flex items-center gap-2.5 flex-1 min-w-0 justify-end">
          <span className={`font-display text-[15px] font-700 truncate text-right ${seattleWon ? 'text-zinc-500' : 'text-white'}`}>
            {game.opponent.shortName || game.opponent.name}
          </span>
          {game.opponent.logo
            ? <img src={game.opponent.logo} alt={game.opponent.abbr} width={32} height={32} className="object-contain flex-shrink-0" />
            : <div className="w-8 h-8 rounded-full bg-white/10 flex-shrink-0" />
          }
        </div>
      </div>
    </button>
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
  const [selectedGame, setSelectedGame] = useState<Game | null>(null)

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
        fetches.push(fetch('/api/pwhl').then(r => r.ok ? r.json() : []))
      }

      if (WHL_TEAM_IDS.some(id => selectedTeamIds.includes(id))) {
        fetches.push(
          fetch('/api/whl').then(r => r.ok ? r.json() as Promise<Game[]> : [])
            .then(gs => gs.filter(g => selectedTeamIds.includes(g.seattleTeamId)))
        )
      }

      if (NCAA_TEAM_IDS.some(id => selectedTeamIds.includes(id))) {
        fetches.push(
          fetch('/api/ncaa', { signal: AbortSignal.timeout(8000) })
            .then(r => r.ok ? r.json() as Promise<Game[]> : [])
            .then(gs => gs.filter(g => selectedTeamIds.includes(g.seattleTeamId)))
            .catch(() => [])
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
    if (loaded) { setLoading(true); fetchSchedule() }
  }, [loaded, fetchSchedule])

  const liveScoresRef = useRef(liveScores)
  useEffect(() => { liveScoresRef.current = liveScores }, [liveScores])

  useEffect(() => {
    fetchLiveScores()
    let interval = setInterval(fetchLiveScores, 30_000)
    const adaptivePoller = setInterval(() => {
      const hasLive = Object.values(liveScoresRef.current).some(s => s.status === 'live')
      clearInterval(interval)
      interval = setInterval(fetchLiveScores, hasLive ? 2_000 : 30_000)
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
    const item = SEATTLE_TEAMS.find(t => t.id === activeTeamFilter)
    if (!item) return mergedGames
    const gk = getCollegeGroupKey(activeTeamFilter)
    if (gk) {
      const ids = SEATTLE_TEAMS.filter(t => getCollegeGroupKey(t.id) === gk).map(t => t.id)
      return mergedGames.filter(g => ids.includes(g.seattleTeamId))
    }
    return mergedGames.filter(g => g.seattleTeamId === activeTeamFilter)
  })()

  const todayStr = new Date().toLocaleDateString('en-CA')
  const grouped = groupGamesByDate(filteredGames)
  // Sort: past dates first, then today, then future
  const sortedDates = [...grouped.keys()].sort()
  const hasLiveGames = filteredGames.some(g => g.status === 'live')

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-[#00d4ff] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <>
      <PageHeader title="Schedule">
        <TeamFilterBar
          selectedTeamIds={selectedTeamIds}
          activeFilter={activeTeamFilter}
          onFilterChange={setActiveTeamFilter}
          teamClickCounts={teamClickCounts}
          recordClick={recordTeamClick}
        />
      </PageHeader>

      <div className="pb-24">
        {error && (
          <div className="mx-4 mt-4 p-3 bg-red-900/30 border border-red-500/30 rounded-lg text-red-300 text-sm">{error}</div>
        )}

        {/* Live banner */}
        {hasLiveGames && (
          <div className="flex items-center gap-2.5 px-4 py-2.5 border-b border-red-500/20 bg-red-950/30">
            <span className="relative flex h-2 w-2 flex-shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
            </span>
            <span className="font-display text-[12px] font-700 text-red-400 uppercase tracking-widest">Games in progress — updating live</span>
          </div>
        )}

        {filteredGames.length === 0 ? (
          <div className="mx-3 mt-6 rounded-2xl text-center py-10 px-6" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <div className="text-5xl mb-3">📅</div>
            <div className="font-display text-[16px] font-700 text-zinc-300 uppercase tracking-wide mb-1">No games scheduled</div>
            <p className="text-zinc-500 text-sm">{selectedTeamIds.length === 0 ? 'Go to Teams and follow some teams.' : 'Your teams may be off-season. Check back closer to the season.'}</p>
          </div>
        ) : (
          sortedDates.map(dateStr => {
            const isToday = dateStr === todayStr
            const label = formatDateHeader(dateStr)
            return (
              <div key={dateStr}>
                {/* Date header */}
                <div
                  className="sticky top-[53px] z-20 flex items-center gap-3 px-4 py-2.5"
                  style={{
                    background: isToday ? 'rgba(0,212,255,0.08)' : 'rgba(8,8,15,0.95)',
                    backdropFilter: 'blur(8px)',
                    borderBottom: isToday ? '1px solid rgba(0,212,255,0.2)' : '1px solid rgba(255,255,255,0.05)',
                  }}
                >
                  <span
                    className={`font-display uppercase tracking-widest font-800 ${isToday ? 'text-[15px]' : 'text-[12px] text-zinc-400'}`}
                    style={isToday ? { color: 'var(--accent)' } : {}}
                  >
                    {label}
                  </span>
                  {isToday && (
                    <span className="relative flex h-2 w-2 ml-1">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60" style={{ background: 'var(--accent)' }} />
                      <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: 'var(--accent)' }} />
                    </span>
                  )}
                </div>

                {/* Game rows */}
                {grouped.get(dateStr)!.map(g => (
                  <ScheduleRow
                    key={g.id}
                    game={g}
                    isToday={isToday}
                    onTap={() => setSelectedGame(g)}
                  />
                ))}
              </div>
            )
          })
        )}
      </div>

      {selectedGame && (
        <GameDetailSheet game={selectedGame} onClose={() => setSelectedGame(null)} />
      )}
    </>
  )
}
