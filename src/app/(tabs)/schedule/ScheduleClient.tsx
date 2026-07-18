'use client'
import { useState, useEffect, useRef, useMemo } from 'react'
import { Game } from '@/lib/types'
import { SEATTLE_TEAMS, getTeamLogoUrl } from '@/lib/teams'
import { ALL_PRO_TEAMS } from '@/lib/allProTeams'
import { useTeamClickCounts } from '@/hooks/useTeamClickCounts'
import { useSportsData } from '@/context/SportsDataContext'
import TeamLogo from '@/components/TeamLogo'
import TeamFilterBar, { getCollegeGroupKey } from '@/components/TeamFilterBar'
import PageHeader from '@/components/PageHeader'
import GameDetailSheet from '@/components/GameDetailSheet'
import { SEASON_START_MONTH, LEAGUE_DISPLAY } from '@/lib/seasonStatus'
import { getActivePlayoffInfo, formatPlayoffDate, PlayoffDateInfo } from '@/lib/playoffDates'
import { getApproxNextSeason } from '@/lib/seasonDates'

// Map league ID to canonical standings-API key (for leagues that have standings)
const STANDINGS_LEAGUE_KEY: Record<string, string> = {
  nhl: 'nhl', nba: 'nba', mlb: 'mlb', wnba: 'wnba', nfl: 'nfl', 'usa.1': 'mls',
}

interface SeasonInfo { status: string; nextStartApprox: string | null; label: string }

function OffseasonEmptyState({ leagues }: { leagues: string[] }) {
  if (leagues.length === 0) return null
  return (
    <div className="space-y-4 mx-3 mt-6">
      {leagues.map(league => {
        const display = LEAGUE_DISPLAY[league]
        const name = display?.name ?? league.toUpperCase()
        const emoji = display?.emoji ?? '🏟️'
        const next = getApproxNextSeason(league)
        return (
          <div key={league} className="rounded-2xl text-center py-10 px-6" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <div className="text-5xl mb-3">{emoji}</div>
            <div className="font-display text-[16px] font-700 text-zinc-300 uppercase tracking-wide mb-1">{name} Offseason</div>
            <p className="text-zinc-500 text-sm">The season has concluded.</p>
            {next && (
              <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
                <span className="text-[12px]">📅</span>
                <span className="text-[12px] text-zinc-400">Next season begins <span className="text-white font-semibold">{next}</span></span>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function OffseasonBanner({ leagues }: { leagues: string[] }) {
  if (leagues.length === 0) return null
  return (
    <div className="space-y-2 mx-3 mt-3">
      {leagues.map(league => {
        const display = LEAGUE_DISPLAY[league]
        const name = display?.name ?? league.toUpperCase()
        const emoji = display?.emoji ?? '🏟️'
        const next = getApproxNextSeason(league)
        return (
          <div key={league} className="flex items-center gap-3 px-4 py-3 rounded-2xl" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <span className="text-xl">{emoji}</span>
            <div className="min-w-0 flex-1">
              <div className="font-display text-[12px] font-700 text-zinc-300 uppercase tracking-widest">{name} — Season Complete</div>
              {next && <div className="font-display text-[11px] text-zinc-500 mt-0.5">Next season begins <span className="text-zinc-300">{next}</span></div>}
            </div>
          </div>
        )
      })}
    </div>
  )
}

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
              className="flex flex-col items-center px-2.5 py-1.5 rounded-lg flex-shrink-0 min-w-[38px] transition-all active:scale-95"
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

// ─── Playoff Milestone Card ──────────────────────────────────────────────────
// Rendered after the last regular-season game date for leagues that have
// upcoming playoffs.  Shows bracket-lock date (if it differs) + playoff start.

function PlayoffMilestoneCard({ league, info }: { league: string; info: PlayoffDateInfo }) {
  const display = LEAGUE_DISPLAY[league]
  const leagueName = display?.name ?? league.toUpperCase()

  // Show bracket-lock row only when it's a distinct date from regularSeasonEnd
  const showBracketLock =
    !!info.bracketLockDate &&
    info.bracketLockDate !== info.regularSeasonEnd &&
    info.bracketLockDate !== info.playoffStart

  return (
    <div className="mx-3 my-4">
      {/* Divider with trophy icon */}
      <div className="flex items-center gap-3 mb-3">
        <div
          className="flex-1 h-px"
          style={{ background: 'linear-gradient(to right, transparent, rgba(251,191,36,0.45))' }}
        />
        <span className="text-base select-none">🏆</span>
        <span
          className="font-display text-[11px] font-800 uppercase tracking-widest"
          style={{ color: '#fbbf24' }}
        >
          {leagueName} Playoffs
        </span>
        <div
          className="flex-1 h-px"
          style={{ background: 'linear-gradient(to left, transparent, rgba(251,191,36,0.45))' }}
        />
      </div>

      {/* Info card */}
      <div
        className="rounded-xl px-4 py-3 space-y-2.5"
        style={{
          background: 'rgba(251,191,36,0.05)',
          border: '1px solid rgba(251,191,36,0.2)',
        }}
      >
        {showBracketLock && (
          <div className="flex items-center gap-3">
            <span className="text-sm w-5 text-center select-none flex-shrink-0">🔒</span>
            <span className="font-display text-[12px] text-zinc-400 flex-1">Bracket locks</span>
            <span className="font-display text-[13px] font-700 text-zinc-200">
              {formatPlayoffDate(info.bracketLockDate!)}
            </span>
          </div>
        )}
        <div className="flex items-center gap-3">
          <span className="text-sm w-5 text-center select-none flex-shrink-0">📅</span>
          <span className="font-display text-[12px] text-zinc-400 flex-1">
            {info.playoffLabel} begins
          </span>
          <span className="font-display text-[13px] font-700 text-white">
            {formatPlayoffDate(info.playoffStart)}
          </span>
        </div>
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
      className="flex items-center px-4 py-3 border-b border-zinc-800/50 hover:bg-zinc-800/20 active:bg-zinc-800/30 transition-colors cursor-pointer select-none"
      style={isLive ? { background: "rgba(239,68,68,0.05)" } : undefined}
      onClick={onTap}
    >
      {/* Left: status/time — fixed 72px, indented from edge */}
      <div className="w-[72px] flex-shrink-0 flex flex-col justify-center gap-0.5 pl-2">
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

      {/* Left = AWAY team */}
      <div className="flex-1 flex items-center justify-end gap-2 min-w-0">
        <span className={`text-[13px] font-semibold truncate text-right ${game.isHome ? (seattleWon ? 'text-zinc-500' : 'text-white') : (seattleLost ? 'text-zinc-500' : 'text-white')}`}>
          {game.isHome ? (game.opponent.shortName || game.opponent.name) : game.seattleTeam.shortName}
        </span>
        {game.isHome
          ? (game.opponent.logo
              ? <img src={game.opponent.logo} alt={game.opponent.abbr} width={28} height={28} className="object-contain flex-shrink-0" />
              : <div className="w-6 h-6 rounded-full bg-white/10 flex-shrink-0" />)
          : <TeamLogo src={seattleLogoUrl} emoji={game.seattleTeam.emoji} abbr={game.seattleTeam.abbr} size={24} />
        }
      </div>

      {/* Score or vs — center */}
      <div className="w-14 flex-shrink-0 text-center">
        {hasScore ? (
          <span className={`text-[14px] font-bold tabular-nums ${isLive ? 'text-red-300' : 'text-white'}`}>
            {game.isHome ? game.opponentScore : game.seattleScore}–{game.isHome ? game.seattleScore : game.opponentScore}
          </span>
        ) : (
          <span className="text-[12px] font-medium text-zinc-500">vs</span>
        )}
      </div>

      {/* Right = HOME team */}
      <div className="flex-1 flex items-center gap-2 min-w-0">
        {game.isHome
          ? <TeamLogo src={seattleLogoUrl} emoji={game.seattleTeam.emoji} abbr={game.seattleTeam.abbr} size={24} />
          : (game.opponent.logo
              ? <img src={game.opponent.logo} alt={game.opponent.abbr} width={28} height={28} className="object-contain flex-shrink-0" />
              : <div className="w-6 h-6 rounded-full bg-white/10 flex-shrink-0" />)
        }
        <span className={`text-[13px] font-semibold truncate ${game.isHome ? (seattleLost ? 'text-zinc-500' : 'text-white') : (seattleWon ? 'text-zinc-500' : 'text-white')}`}>
          {game.isHome ? game.seattleTeam.shortName : (game.opponent.shortName || game.opponent.name)}
        </span>
      </div>
    </div>
  )
}

export default function ScheduleClient() {
  const { selectedTeamIds, allGames, loading, error } = useSportsData()
  const { counts: teamClickCounts, recordClick: recordTeamClick } = useTeamClickCounts()
  const [activeTeamFilter, setActiveTeamFilter] = useState<string>('all')
  const [selectedGame, setSelectedGame] = useState<Game | null>(null)
  const [seasonInfoByLeague, setSeasonInfoByLeague] = useState<Record<string, SeasonInfo>>({})

  const filteredGames = (() => {
    if (activeTeamFilter === 'all') return allGames
    // Check SEATTLE_TEAMS first, then ALL_PRO_TEAMS
    const item = SEATTLE_TEAMS.find(t => t.id === activeTeamFilter) ?? ALL_PRO_TEAMS.find(t => t.id === activeTeamFilter)
    if (!item) return allGames
    const gk = getCollegeGroupKey(activeTeamFilter)
    if (gk) {
      const ids = SEATTLE_TEAMS.filter(t => getCollegeGroupKey(t.id) === gk).map(t => t.id)
      return allGames.filter(g => ids.includes(g.seattleTeamId))
    }
    return allGames.filter(g => g.seattleTeamId === activeTeamFilter)
  })()

  // Detect leagues that have no upcoming games (all games are final or schedule is empty)
  // We only check leagues that have a standings API (NHL, NBA, NFL, etc.)
  const offseasonLeagues = useMemo(() => {
    // Which team IDs are visible in the current filter?
    const visibleTeamIds: string[] = activeTeamFilter === 'all'
      ? selectedTeamIds
      : (() => {
          const item = SEATTLE_TEAMS.find(t => t.id === activeTeamFilter) ?? ALL_PRO_TEAMS.find(t => t.id === activeTeamFilter)
          if (!item) return [activeTeamFilter]
          const gk = getCollegeGroupKey(activeTeamFilter)
          if (gk) return SEATTLE_TEAMS.filter(t => getCollegeGroupKey(t.id) === gk).map(t => t.id)
          return [activeTeamFilter]
        })()

    const seenLeagues = new Set<string>()
    const result: string[] = []
    for (const teamId of visibleTeamIds) {
      const team = SEATTLE_TEAMS.find(t => t.id === teamId) ?? ALL_PRO_TEAMS.find(t => t.id === teamId)
      if (!team || !STANDINGS_LEAGUE_KEY[(team as typeof SEATTLE_TEAMS[0]).league ?? (team as typeof ALL_PRO_TEAMS[0]).league?.toLowerCase()]) continue
      const leagueKey = (team as typeof SEATTLE_TEAMS[0]).league ?? (team as typeof ALL_PRO_TEAMS[0]).league?.toLowerCase()
      if (seenLeagues.has(leagueKey)) continue
      seenLeagues.add(leagueKey)

      const hasUpcoming = allGames.some(g => g.seattleTeamId === teamId && g.status !== 'ft')
      if (!hasUpcoming) result.push(leagueKey)
    }
    return result
  }, [activeTeamFilter, selectedTeamIds, allGames])

  // Fetch season status from standings API for leagues with no upcoming games
  useEffect(() => {
    if (offseasonLeagues.length === 0) return
    const leaguesToFetch = offseasonLeagues
      .map(l => STANDINGS_LEAGUE_KEY[l])
      .filter(Boolean)
      .filter(k => !seasonInfoByLeague[k])

    if (leaguesToFetch.length === 0) return

    Promise.all(leaguesToFetch.map(async key => {
      try {
        const res = await fetch(`/api/standings?league=${key}`)
        if (!res.ok) return null
        const d = await res.json()
        return d.season ? { key, season: d.season as SeasonInfo } : null
      } catch { return null }
    })).then(results => {
      const updates: Record<string, SeasonInfo> = {}
      for (const r of results) { if (r) updates[r.key] = r.season }
      if (Object.keys(updates).length > 0) {
        setSeasonInfoByLeague(prev => ({ ...prev, ...updates }))
      }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offseasonLeagues])

  // Leagues confirmed as offseason by standings API (or inferred from empty schedule)
  const confirmedOffseasonLeagues = useMemo(() => {
    return offseasonLeagues.filter(league => {
      const key = STANDINGS_LEAGUE_KEY[league]
      const info = key ? seasonInfoByLeague[key] : undefined
      // If standings API confirms offseason or playoffs, treat as season-concluded
      if (info) return info.status === 'offseason' || info.status === 'playoffs'
      // If no API data yet but the team has past games and no upcoming, assume offseason
      const team = SEATTLE_TEAMS.find(t => t.league === league && selectedTeamIds.includes(t.id))
      if (!team) return false
      return allGames.some(g => g.seattleTeamId === team.id && g.status === 'ft')
    })
  }, [offseasonLeagues, seasonInfoByLeague, allGames, selectedTeamIds])

  // Build per-league display info for offseason banners/empty states
  const offseasonDisplayLeagues = useMemo(() => {
    return confirmedOffseasonLeagues.map(league => {
      const key = STANDINGS_LEAGUE_KEY[league]
      const seasonInfo = key ? seasonInfoByLeague[key] : undefined
      const nextStart = seasonInfo?.nextStartApprox ?? getApproxNextSeason(league)
      return { league, nextStart }
    })
  }, [confirmedOffseasonLeagues, seasonInfoByLeague])

  const todayStr = getTodayStr()
  const grouped = groupGamesByDate(filteredGames)
  const sortedDates = [...grouped.keys()].sort()
  const hasLiveGames = filteredGames.some(g => g.status === 'live')
  const hasUpcomingInFilter = filteredGames.some(g => g.status !== 'ft')

  // ── Playoff milestone injection ───────────────────────────────────────────
  // For each league present in the filtered games, compute which date should
  // get a playoff milestone card rendered below it.  The card appears after the
  // last date that is on or before the regular-season end date.
  const playoffMilestonesByDate = useMemo(() => {
    const byDate = new Map<string, { league: string; info: PlayoffDateInfo }[]>()
    const leagues = [...new Set(filteredGames.map(g => g.league))]
    for (const league of leagues) {
      const info = getActivePlayoffInfo(league, todayStr)
      if (!info) continue

      // Find the last game-date that falls inside the regular season
      let insertAfterDate: string | null = null
      for (const d of sortedDates) {
        if (d <= info.regularSeasonEnd) insertAfterDate = d
      }
      // No regular-season games in view — skip
      if (!insertAfterDate) continue

      const existing = byDate.get(insertAfterDate) ?? []
      byDate.set(insertAfterDate, [...existing, { league, info }])
    }
    return byDate
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredGames, sortedDates, todayStr])

  // Always include today in the rendered date list when there are any games at all,
  // so the auto-scroll and "Today" button always land on an anchor — even on rest days.
  const datesWithToday = useMemo(() => {
    if (filteredGames.length === 0) return sortedDates
    const set = new Set(sortedDates)
    set.add(todayStr)
    return [...set].sort()
  }, [sortedDates, todayStr, filteredGames.length])

  // Refs for date section jumping
  const dateRefs = useRef<Record<string, HTMLDivElement | null>>({})

  function scrollToDate(dateStr: string) {
    const el = dateRefs.current[dateStr]
    if (!el) return
    const main = el.closest('main')
    if (main) {
      main.scrollTo({ top: el.offsetTop - 120, behavior: 'smooth' })
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
        <div className="w-8 h-8 border-2 border-[#D95C17] border-t-transparent rounded-full animate-spin" />
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
            style={{ background: "rgba(217,92,23,0.12)", border: "1px solid rgba(217,92,23,0.35)" }}
          >
            <span className="relative flex h-1.5 w-1.5 flex-shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#D95C17] opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#D95C17]" />
            </span>
            <span className="font-display text-[11px] font-800 uppercase tracking-wide" style={{ color: "#D95C17" }}>Today</span>
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
      </PageHeader>

      <div className="pb-24">
        {error && (
          <div className="mx-4 mt-4 p-3 bg-red-900/30 border border-red-500/30 rounded-md text-red-300 text-sm">{error}</div>
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

        {/* Offseason banner: season concluded but past games exist */}
        {!hasUpcomingInFilter && filteredGames.length > 0 && offseasonDisplayLeagues.length > 0 && (
          <OffseasonBanner leagues={offseasonDisplayLeagues.map(l => l.league)} />
        )}

        {filteredGames.length === 0 ? (
          offseasonDisplayLeagues.length > 0 ? (
            // Per-league offseason empty state
            <OffseasonEmptyState leagues={offseasonDisplayLeagues.map(l => l.league)} />
          ) : (
            // Generic empty state
            <div className="mx-3 mt-6 rounded-2xl text-center py-10 px-6" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <div className="text-5xl mb-3">📅</div>
              <div className="font-display text-[16px] font-700 text-zinc-300 uppercase tracking-wide mb-1">No games scheduled</div>
              <p className="text-zinc-500 text-sm">{selectedTeamIds.length === 0 ? 'Go to Teams and follow some teams.' : 'Your teams may be off-season. Check back closer to the season.'}</p>
            </div>
          )
        ) : (
          // datesWithToday always contains todayStr so the scroll-to-today anchor
          // is always present in the DOM, even on rest days.
          datesWithToday.map((dateStr, idx) => {
            const isToday = dateStr === todayStr
            const label = formatDateHeader(dateStr)
            const gamesForDate = grouped.get(dateStr) ?? []
            return (
              <div key={dateStr} ref={el => { dateRefs.current[dateStr] = el }}>
                {idx > 0 && <div className="h-3" />}
                {/* Date header — TODAY is bigger and accented */}
                {isToday ? (
                  <div
                    className="sticky top-[116px] z-20 px-4 py-2 flex items-center gap-2.5"
                    style={{ background: 'rgba(12,27,49,0.98)', backdropFilter: 'blur(10px)', borderBottom: '1px solid rgba(217,92,23,0.2)', borderTop: '2px solid rgba(217,92,23,0.25)' }}
                  >
                    <span className="font-display text-[15px] font-800 uppercase tracking-widest text-white">Today</span>
                    <span className="relative flex h-1.5 w-1.5 flex-shrink-0">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#D95C17] opacity-60" />
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#D95C17]" />
                    </span>
                    <span className="font-display text-[11px] text-zinc-500">
                      {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                    </span>
                    <div className="flex-1 h-px" style={{ background: 'rgba(217,92,23,0.2)' }} />
                  </div>
                ) : (
                  <div
                    className="sticky top-[116px] z-20 px-4 py-2 flex items-center gap-3"
                    style={{ background: 'rgba(12,27,49,0.98)', backdropFilter: 'blur(8px)' }}
                  >
                    <span className="text-[12px] uppercase tracking-widest font-bold text-white">{label}</span>
                    <div className="flex-1 h-px bg-zinc-800" />
                  </div>
                )}

                {/* Game rows — or a friendly rest-day card for today */}
                {gamesForDate.length > 0 ? (
                  gamesForDate.map(g => (
                    <ScheduleRow
                      key={g.id}
                      game={g}
                      onTap={() => setSelectedGame(g)}
                    />
                  ))
                ) : isToday ? (
                  <div className="mx-4 my-3 flex items-center gap-3 px-4 py-4 rounded-2xl"
                    style={{ background: 'rgba(0,212,255,0.04)', border: '1px solid rgba(0,212,255,0.12)' }}>
                    <span className="text-2xl select-none">😴</span>
                    <div>
                      <div className="text-[13px] font-semibold text-zinc-300">No games today</div>
                      <div className="text-[12px] text-zinc-500 mt-0.5">None of your teams play today — enjoy the rest day!</div>
                    </div>
                  </div>
                ) : null}

                {/* ── Playoff milestone cards ────────────────────────────────── */}
                {(playoffMilestonesByDate.get(dateStr) ?? []).map(({ league, info }) => (
                  <PlayoffMilestoneCard key={`playoff-${league}`} league={league} info={info} />
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
