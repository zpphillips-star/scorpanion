'use client'
import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
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
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
  for (const game of games) {
    const key = new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(new Date(game.kickoff))
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(game)
  }
  return groups
}

function getTodayStr(): string {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(new Date())
}

function formatDateHeader(dateStr: string): string {
  const today = getTodayStr()
  const tomorrow = (() => {
    const d = new Date(); d.setDate(d.getDate() + 1)
    return new Intl.DateTimeFormat('en-CA', { timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone }).format(d)
  })()
  if (dateStr === today) return 'Today'
  if (dateStr === tomorrow) return 'Tomorrow'
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

function DateStrip({
  sortedDates, todayStr, onSelect,
}: { sortedDates: string[]; todayStr: string; onSelect: (d: string) => void }) {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
  const stripRef = useRef<HTMLDivElement>(null)
  const todayBtnRef = useRef<HTMLButtonElement>(null)

  const stripDates = useMemo(() => {
    const dates: string[] = []
    for (let i = -7; i <= 21; i++) {
      const d = new Date()
      d.setDate(d.getDate() + i)
      dates.push(new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(d))
    }
    return dates
  }, [tz])

  useEffect(() => {
    if (todayBtnRef.current && stripRef.current) {
      const btn = todayBtnRef.current
      const strip = stripRef.current
      strip.scrollLeft = btn.offsetLeft - strip.offsetWidth / 2 + btn.offsetWidth / 2
    }
  }, [])

  return (
    <div ref={stripRef} className="overflow-x-auto no-scrollbar px-3 pb-2 pt-0.5 border-t border-zinc-800/60">
      <div className="flex gap-0.5 min-w-max">
        {stripDates.map(dateStr => {
          const isToday = dateStr === todayStr
          const hasGames = sortedDates.includes(dateStr)
          const [y, m, d] = dateStr.split('-').map(Number)
          const dayLetter = new Date(y, m - 1, d).toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 1)
          return (
            <button
              key={dateStr}
              ref={isToday ? todayBtnRef : undefined}
              onClick={() => onSelect(dateStr)}
              disabled={!hasGames}
              className="flex flex-col items-center px-2.5 py-1.5 rounded-xl flex-shrink-0 min-w-[38px] transition-all active:scale-95"
              style={{
                background: isToday ? 'rgba(0,212,255,0.15)' : 'transparent',
                border: isToday ? '1px solid rgba(0,212,255,0.35)' : '1px solid transparent',
                opacity: hasGames || isToday ? 1 : 0.22,
              }}
            >
              <span className="text-[9px] font-bold uppercase tracking-wide leading-tight" style={{ color: isToday ? '#00d4ff' : '#52525b' }}>{dayLetter}</span>
              <span className="text-[15px] font-bold leading-tight" style={{ color: isToday ? '#00d4ff' : hasGames ? '#e4e4e7' : '#3f3f46' }}>{d}</span>
              <div className="w-1 h-1 rounded-full mt-0.5" style={{ background: isToday ? '#00d4ff' : hasGames ? '#52525b' : 'transparent' }} />
            </button>
          )
        })}
      </div>
    </div>
  )
}

function ScheduleRow({ game, onTap }: { game: Game; onTap: () => void }) {
  const isFt = game.status === 'ft'
  const isLive = game.status === 'live'
  const hasActualScore = game.seattleScore !== undefined && game.opponentScore !== undefined
  const hasScore = (isFt || isLive) && hasActualScore
  const seattleWon = hasScore && game.seattleScore! > game.opponentScore!
  const seattleLost = hasScore && game.seattleScore! < game.opponentScore!
  const seattleLogoUrl = getTeamLogoUrl(game.seattleTeam)

  function liveDetail() {
    const p = game.period ? Number(game.period) : null
    const clk = game.clock
    if (game.sport === 'baseball' && p) {
      const half = p % 2 === 1 ? '▲' : '▼'
      const inn = Math.ceil(p / 2)
      return `${half}${inn}${clk ? ' · ' + clk : ''}`
    }
    if (game.sport === 'basketball' && p) return clk ? `Q${p} ${clk}` : `Q${p}`
    if (game.sport === 'hockey' && p) { const l = ['1st','2nd','3rd','OT'][p-1]||`P${p}`; return clk ? `${l} ${clk}` : l }
    if (game.sport === 'football' && p) { const l = ['1st','2nd','3rd','4th','OT'][p-1]||`Q${p}`; return clk ? `${l} ${clk}` : l }
    if (game.sport === 'soccer') return clk ? `${clk}′` : 'Live'
    return clk || ''
  }

  return (
    <div
      className="flex items-center px-4 py-2.5 border-b border-zinc-800/35 hover:bg-white/[0.03] active:bg-white/[0.05] transition-colors cursor-pointer select-none"
      style={isLive ? { background: "rgba(239,68,68,0.05)" } : undefined}
      onClick={onTap}
    >
      {/* Left: status/time — fixed 64px */}
      <div className="w-[64px] flex-shrink-0 flex flex-col justify-center gap-0.5">
        {isLive ? (
          <>
            <div className="flex items-center gap-1">
              <span className="relative flex h-1.5 w-1.5 flex-shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500" />
              </span>
              <span className="text-[11px] font-bold text-red-400 uppercase leading-tight">Live</span>
            </div>
            {liveDetail() && <span className="text-[10px] text-red-400/60 leading-tight">{liveDetail()}</span>}
          </>
        ) : isFt ? (
          <span className="text-[11px] text-zinc-500 uppercase tracking-wide">Final</span>
        ) : (
          <span className="text-[12px] font-medium text-zinc-300 whitespace-nowrap">
            {formatTime(game.kickoff)}
          </span>
        )}
      </div>

      {/* Seattle team — logo + abbr */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <TeamLogo src={seattleLogoUrl} emoji={game.seattleTeam.emoji} abbr={game.seattleTeam.abbr} size={24} />
        <span className={`text-[13px] font-bold w-[30px] ${seattleLost ? 'text-zinc-500' : 'text-white'}`}>
          {game.seattleTeam.abbr}
        </span>
      </div>

      {/* Score or vs — center */}
      <div className="w-14 flex-shrink-0 text-center">
        {hasScore ? (
          <span className={`text-[14px] font-bold tabular-nums ${isLive ? 'text-red-300' : seattleWon ? 'text-white' : seattleLost ? 'text-zinc-400' : 'text-white'}`}>
            {game.seattleScore}–{game.opponentScore}
          </span>
        ) : (
          <span className="text-[11px] text-zinc-600">vs</span>
        )}
      </div>

      {/* Opponent — logo + abbr + broadcast right */}
      <div className="flex-1 flex items-center gap-1.5 min-w-0">
        {game.opponent.logo
          ? <img src={game.opponent.logo} alt={game.opponent.abbr} width={24} height={24} className="object-contain flex-shrink-0" />
          : <div className="w-6 h-6 rounded-full bg-white/10 flex-shrink-0" />
        }
        <span className={`text-[13px] font-bold flex-shrink-0 ${seattleWon ? 'text-zinc-500' : 'text-white'}`}>
          {game.opponent.abbr || game.opponent.shortName}
        </span>
        {game.broadcast && !isFt && !isLive && (
          <span className="text-[10px] text-zinc-600 truncate ml-auto">{game.broadcast}</span>
        )}
      </div>
    </div>
  )
    </div>
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
    return { ...g, status: update.status, seattleScore: update.seattleScore, opponentScore: update.opponentScore, clock: update.clock, period: update.period }
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

  const todayStr = getTodayStr()
  const grouped = groupGamesByDate(filteredGames)
  const sortedDates = [...grouped.keys()].sort()
  const hasLiveGames = filteredGames.some(g => g.status === 'live')

  // Refs for date section jumping
  const dateRefs = useRef<Record<string, HTMLDivElement | null>>({})

  function scrollToDate(dateStr: string) {
    const el = dateRefs.current[dateStr]
    if (!el) return
    const main = el.closest('main')
    if (main) {
      main.scrollTo({ top: el.offsetTop - 175, behavior: 'smooth' })
    }
  }

  function scrollToToday() {
    scrollToDate(todayStr)
  }

  useEffect(() => {
    if (!loading) {
      setTimeout(() => scrollToToday(), 200)
    }
  }, [loading, activeTeamFilter])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-[#00d4ff] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <>
      <PageHeader
        title="Schedule"
        titleAction={
          <button
            onClick={scrollToToday}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full transition-all active:scale-95"
            style={{ background: "rgba(0,212,255,0.12)", border: "1px solid rgba(0,212,255,0.3)" }}
          >
            <span className="relative flex h-1.5 w-1.5 flex-shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00d4ff] opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#00d4ff]" />
            </span>
            <span className="font-display text-[11px] font-800 uppercase tracking-wide" style={{ color: "#00d4ff" }}>Today</span>
          </button>
        }
      >
        <TeamFilterBar
          selectedTeamIds={selectedTeamIds}
          activeFilter={activeTeamFilter}
          onFilterChange={setActiveTeamFilter}
          teamClickCounts={teamClickCounts}
          recordClick={recordTeamClick}
        />
        <DateStrip sortedDates={sortedDates} todayStr={todayStr} onSelect={scrollToDate} />
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
          sortedDates.map((dateStr, idx) => {
            const isToday = dateStr === todayStr
            const label = formatDateHeader(dateStr)
            return (
              <div key={dateStr} ref={el => { dateRefs.current[dateStr] = el }} style={{ borderTop: idx > 0 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                {/* Date header — TODAY is bigger and accented */}
                {isToday ? (
                  <div
                    className="sticky top-[172px] z-20 px-4 py-2 flex items-center gap-2.5"
                    style={{ background: 'rgba(8,8,15,0.97)', backdropFilter: 'blur(10px)', borderBottom: '1px solid rgba(0,212,255,0.2)', borderTop: '2px solid rgba(0,212,255,0.3)' }}
                  >
                    <span className="font-display text-[15px] font-800 uppercase tracking-widest text-[#00d4ff]">Today</span>
                    <span className="relative flex h-1.5 w-1.5 flex-shrink-0">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00d4ff] opacity-60" />
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#00d4ff]" />
                    </span>
                    <span className="font-display text-[11px] text-zinc-500">
                      {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                    </span>
                    <div className="flex-1 h-px" style={{ background: 'rgba(0,212,255,0.2)' }} />
                  </div>
                ) : (
                  <div
                    className="sticky top-[172px] z-20 px-4 py-2.5 flex items-center gap-3"
                    style={{ background: 'rgba(8,8,15,0.97)', backdropFilter: 'blur(8px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
                  >
                    <span className="text-[13px] uppercase tracking-widest font-bold text-zinc-300">{label}</span>
                    <div className="flex-1 h-px bg-zinc-700/50" />
                  </div>
                )}

                {/* Game rows */}
                {grouped.get(dateStr)!.map(g => (
                  <ScheduleRow
                    key={g.id}
                    game={g}
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
