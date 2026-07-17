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

// ── Tours that require explicit opt-in (never auto-seeded) ───────────────────
const OPT_IN_ONLY = new Set(['pga', 'lpga'])

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
      if (seattleStored) {
        const parsed: unknown[] = JSON.parse(seattleStored)
        const allValidIds = SEATTLE_TEAMS.map(t => t.id)
        const validIdSet = new Set(allValidIds)
        const filtered = (parsed as string[]).filter(id => validIdSet.has(id))
        // Auto-seed NEW teams — but NEVER auto-seed opt-in-only tours
        const storedSet = new Set(filtered)
        const newTeams = allValidIds.filter(id => !storedSet.has(id) && !OPT_IN_ONLY.has(id))
        seattleIds = [...filtered, ...newTeams]
        // One-time migration: remove any opt-in-only tours that were accidentally auto-seeded
        const beforeClean = seattleIds.length
        seattleIds = seattleIds.filter(id => {
          if (!OPT_IN_ONLY.has(id)) return true          // not a tour — always keep
          return storedSet.has(id) && !newTeams.includes(id) // tour — only keep if was already stored (explicit)
        })
        // Persist updated list if anything changed
        if (seattleIds.length !== (parsed as string[]).length) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(seattleIds))
        }
      } else {
        // Fresh install — seed all non-opt-in-only teams
        seattleIds = SEATTLE_TEAMS.map(t => t.id).filter(id => !OPT_IN_ONLY.has(id))
      }

      const otherStored = localStorage.getItem(OTHER_STORAGE_KEY)
      const otherIds: string[] = otherStored ? (JSON.parse(otherStored) as string[]) : []

      setSelectedTeamIds([...new Set([...seattleIds, ...otherIds])])
    } catch {
      setSelectedTeamIds(SEATTLE_TEAMS.map(t => t.id))
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
          : SEATTLE_TEAMS.map(t => t.id)
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
          && id !== 'pga'
          && id !== 'lpga'
          && !(WHL_IDS  as readonly string[]).includes(id)
          && !(NCAA_IDS as readonly string[]).includes(id)
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

  // ── 3. Live-score polling (single shared poller) ───────────────────────────
  const [liveScores, setLiveScores] = useState<Record<string, ScoreUpdate>>({})
  const liveScoresRef = useRef(liveScores)
  useEffect(() => { liveScoresRef.current = liveScores }, [liveScores])

  const fetchLiveScores = useCallback(async () => {
    try {
      const r = await fetch('/api/live-scores')
      if (!r.ok) return
      setLiveScores(await r.json())
    } catch { /* network hiccup — keep previous scores */ }
  }, [])

  useEffect(() => {
    fetchLiveScores()
    let interval = setInterval(fetchLiveScores, 30_000)

    // Every 5 s, adjust poll rate based on whether any game is currently live
    const adaptive = setInterval(() => {
      const hasLive = Object.values(liveScoresRef.current).some(s => s.status === 'live')
      clearInterval(interval)
      interval = setInterval(fetchLiveScores, hasLive ? 2_000 : 30_000)
    }, 5_000)

    return () => { clearInterval(interval); clearInterval(adaptive) }
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
