'use client'
/**
 * SportsDataContext — single source of truth for schedule + live scores.
 *
 * Mounted once at the (tabs) layout level so Home and Schedule tabs share:
 *  • One schedule fetch (re-runs only when selectedTeamIds change)
 *  • One adaptive live-score poller (2 s when a game is live, 30 s otherwise)
 *
 * Team selection is owned here (reads localStorage on mount, stays in sync via
 * the 'scorpanion:teams-changed' custom event dispatched by useSelectedTeams).
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  ReactNode,
} from 'react'
import { Game, ScoreUpdate } from '@/lib/types'
import { SEATTLE_TEAMS } from '@/lib/teams'

const STORAGE_KEY       = 'seattle-sports-teams'
const OTHER_STORAGE_KEY = 'followed_other_teams'

/**
 * Default followed teams for first-time visitors (null stored value = never set).
 * Seeds Seattle's five pro teams plus both golf tours so the app looks populated
 * on first open. Users can deselect any of these at any time.
 */
const DEFAULT_SEED_IDS = [
  'seahawks',  // NFL
  'mariners',  // MLB
  'kraken',    // NHL
  'sounders',  // MLS
  'storm',     // WNBA
  'pga',       // PGA Tour
  'lpga',      // LPGA Tour
]

const WHL_IDS  = ['thunderbirds', 'silvertips'] as const
const NCAA_IDS = ['uw-softball', 'uw-soccer']   as const

// ── Context shape ────────────────────────────────────────────────────────────

interface SportsDataContextValue {
  /** Ordered list of team IDs the user follows (from localStorage). */
  selectedTeamIds: string[]
  /** True once selectedTeamIds has been read from storage. */
  loaded: boolean

  /** Raw scheduled games (all followed teams, sorted by kickoff). */
  games: Game[]
  /** Latest live-score snapshot from /api/live-scores. */
  liveScores: Record<string, ScoreUpdate>
  /** games with live-score fields (status/scores/clock/period) merged in. */
  allGames: Game[]

  /** True while the initial schedule fetch (or a refetch) is in flight. */
  loading: boolean
  /** Non-null if the most recent schedule fetch failed. */
  error: string | null
  /** Force a schedule re-fetch (e.g. after pull-to-refresh). */
  refetch: () => void
}

const defaultCtx: SportsDataContextValue = {
  selectedTeamIds: [],
  loaded: false,
  games: [],
  liveScores: {},
  allGames: [],
  loading: true,
  error: null,
  refetch: () => {},
}

const SportsDataContext = createContext<SportsDataContextValue>(defaultCtx)

// ── Provider ─────────────────────────────────────────────────────────────────

export function SportsDataProvider({ children }: { children: ReactNode }) {

  // ── 1. Team selection ──────────────────────────────────────────────────────
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([])
  const [loaded, setLoaded] = useState(false)

  // Read from localStorage on mount — merges both Seattle and "other" followed teams
  useEffect(() => {
    try {
      const seattleStored = localStorage.getItem(STORAGE_KEY)
      let seattleIds: string[]
      if (seattleStored === null) {
        // First visit — seed with Seattle pro teams + golf tours
        seattleIds = DEFAULT_SEED_IDS
        localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_SEED_IDS))
      } else {
        const parsed: unknown[] = JSON.parse(seattleStored)
        const validIds = new Set(SEATTLE_TEAMS.map(t => t.id))
        const filtered = (parsed as string[]).filter(id => validIds.has(id))
        // Prune stale IDs in storage
        if (filtered.length !== parsed.length) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered))
        }
        seattleIds = filtered
      }

      const otherStored= localStorage.getItem(OTHER_STORAGE_KEY)
      const otherIds: string[] = otherStored ? (JSON.parse(otherStored) as string[]) : []

      setSelectedTeamIds([...new Set([...seattleIds, ...otherIds])])
    } catch {
      setSelectedTeamIds([])
    }
    setLoaded(true)
  }, [])

  // Stay in sync when either useSelectedTeams or useFollowedOtherTeams fires the event.
  // Always re-read both keys so the merged list is always current.
  useEffect(() => {
    const handler = () => {
      try {
        const seattleStored = localStorage.getItem(STORAGE_KEY)
        const seattleIds: string[] = seattleStored
          ? (JSON.parse(seattleStored) as string[])
          : []
        const otherStored = localStorage.getItem(OTHER_STORAGE_KEY)
        const otherIds: string[] = otherStored ? (JSON.parse(otherStored) as string[]) : []
        setSelectedTeamIds([...new Set([...seattleIds, ...otherIds])])
      } catch { /* keep existing selection */ }
    }
    window.addEventListener('scorpanion:teams-changed', handler)
    return () => window.removeEventListener('scorpanion:teams-changed', handler)
  }, [])

  // ── 2. Schedule fetching ───────────────────────────────────────────────────
  const [games, setGames]     = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  const fetchSchedule = useCallback(async () => {
    if (!loaded) return
    if (selectedTeamIds.length === 0) { setLoading(false); return }
    setLoading(true)
    try {
      const espnIds = selectedTeamIds.filter(
        id => id !== 'torrent'
          && !(WHL_IDS  as readonly string[]).includes(id)
          && !(NCAA_IDS as readonly string[]).includes(id)
          && id !== 'pga'
          && id !== 'lpga'
      )
      const fetches: Promise<Game[]>[] = []

      if (espnIds.length > 0) {
        fetches.push(
          fetch(`/api/schedule?teams=${espnIds.join(',')}`).then(r => r.ok ? r.json() : [])
        )
      }
      if (selectedTeamIds.includes('torrent')) {
        fetches.push(fetch('/api/pwhl').then(r => r.ok ? r.json() : []))
      }
      if (WHL_IDS.some(id => selectedTeamIds.includes(id))) {
        fetches.push(
          fetch('/api/whl')
            .then(r => r.ok ? (r.json() as Promise<Game[]>) : [])
            .then(gs => gs.filter(g => selectedTeamIds.includes(g.seattleTeamId)))
        )
      }
      if (NCAA_IDS.some(id => selectedTeamIds.includes(id))) {
        fetches.push(
          fetch('/api/ncaa', { signal: AbortSignal.timeout(8000) })
            .then(r => r.ok ? (r.json() as Promise<Game[]>) : [])
            .then(gs => gs.filter(g => selectedTeamIds.includes(g.seattleTeamId)))
            .catch(() => [])
        )
      }

      const results = await Promise.all(fetches)
      setGames(
        results.flat().sort((a, b) => new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime())
      )
      setError(null)
    } catch {
      setError('Unable to load schedule.')
    } finally {
      setLoading(false)
    }
  }, [loaded, selectedTeamIds])

  useEffect(() => {
    if (loaded) fetchSchedule()
  }, [loaded, fetchSchedule])

  // Periodically refetch the schedule so final scores for ALL_PRO_TEAMS and
  // non-ESPN teams (WHL/PWHL/NCAA) appear without a full page reload.
  useEffect(() => {
    const timer = setInterval(fetchSchedule, 5 * 60_000)
    return () => clearInterval(timer)
  }, [fetchSchedule])

  // ── 3. Live-score polling (single shared poller) ───────────────────────────
  //
  // Uses setTimeout (not setInterval) so each poll is only scheduled AFTER the
  // previous fetch completes — prevents overlapping requests when the network is
  // slow or the 2 s live interval is tight.  A mountedRef guard ensures no new
  // timer is created after the provider unmounts (avoids orphaned timers / the
  // "Can't perform a state update on an unmounted component" warning).
  //
  // Interval logic:
  //   • Any game whose status is 'live' → 2 s
  //   • All games pre/post  → 30 s

  const [liveScores, setLiveScores] = useState<Record<string, ScoreUpdate>>({})

  const timeoutRef  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mountedRef  = useRef(false)

  const fetchLiveScores = useCallback(async () => {
    try {
      const r = await fetch('/api/live-scores')
      if (!r.ok || !mountedRef.current) return
      const data = await r.json() as Record<string, { status: string }>
      if (!mountedRef.current) return
      setLiveScores(data as Record<string, ScoreUpdate>)
      const hasLive = Object.values(data).some(s => s.status === 'live')
      timeoutRef.current = setTimeout(fetchLiveScores, hasLive ? 2_000 : 30_000)
    } catch {
      // Network hiccup — keep previous scores; retry in 30 s
      if (mountedRef.current) {
        timeoutRef.current = setTimeout(fetchLiveScores, 30_000)
      }
    }
  }, [])

  useEffect(() => {
    mountedRef.current = true
    fetchLiveScores()
    return () => {
      mountedRef.current = false
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
    }
  }, [fetchLiveScores])

  // ── 4. Merge schedule + live scores ───────────────────────────────────────
  const allGames: Game[] = games.map(g => {
    const u = liveScores[g.id]
    if (!u) return g
    return {
      ...g,
      status:        u.status,
      seattleScore:  u.seattleScore,
      opponentScore: u.opponentScore,
      clock:         u.clock,
      period:        u.period,
    }
  })

  // ── 5. Provide ────────────────────────────────────────────────────────────
  return (
    <SportsDataContext.Provider
      value={{
        selectedTeamIds,
        loaded,
        games,
        liveScores,
        allGames,
        loading,
        error,
        refetch: fetchSchedule,
      }}
    >
      {children}
    </SportsDataContext.Provider>
  )
}

// ── Consumer hook ─────────────────────────────────────────────────────────────

export function useSportsData() {
  return useContext(SportsDataContext)
}
