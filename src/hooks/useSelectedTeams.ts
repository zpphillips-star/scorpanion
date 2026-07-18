'use client'
import { useState, useEffect } from 'react'
import { SEATTLE_TEAMS } from '@/lib/teams'

const STORAGE_KEY       = 'seattle-sports-teams'
const OTHER_STORAGE_KEY = 'followed_other_teams'

// Pre-computed set of IDs that belong in STORAGE_KEY.
// Only SEATTLE_TEAMS IDs should ever be written there; other pro teams live in OTHER_STORAGE_KEY.
const SEATTLE_ID_SET = new Set(SEATTLE_TEAMS.map(t => t.id))

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

// College team IDs — removed from the app for now; strip them from any stored selection
const COLLEGE_IDS = [
  'uw-football','uw-basketball','uw-wbb','uw-volleyball','uw-baseball','uw-lacrosse','uw-softball','uw-soccer',
  'wsu-football','wsu-mbb','wsu-wbb','wsu-baseball','wsu-volleyball',
  'seattleu',
]

export function useSelectedTeams() {
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([])
  const [loaded, setLoaded] = useState(false)

  function readFromStorage(): string[] {
    try {
      const seattleStored = localStorage.getItem(STORAGE_KEY)
      let seattleList: string[] = []
      if (seattleStored === null) {
        // True first visit (key never written) — seed with Seattle pro teams + golf tours.
        // "[]" (user cleared everything) is NOT null, so we never re-seed after the user
        // explicitly empties their selection.
        seattleList = DEFAULT_SEED_IDS
        localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_SEED_IDS))
      } else {
        const parsed = JSON.parse(seattleStored) as string[]
        // Keep only IDs that belong in this key (SEATTLE_TEAMS IDs, no college teams).
        // Any non-SEATTLE_TEAMS ID that leaked in (e.g. via an older toggleTeam bug)
        // gets pruned here so storage stays clean.
        seattleList = parsed.filter(id => SEATTLE_ID_SET.has(id) && !COLLEGE_IDS.includes(id))
        if (seattleList.length !== parsed.length) localStorage.setItem(STORAGE_KEY, JSON.stringify(seattleList))
      }

      const otherStored = localStorage.getItem(OTHER_STORAGE_KEY)
      const otherList: string[] = otherStored ? (JSON.parse(otherStored) as string[]) : []

      return [...new Set([...seattleList, ...otherList])]
    } catch {
      return []
    }
  }

  useEffect(() => {
    setSelectedTeamIds(readFromStorage())
    setLoaded(true)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Stay in sync when either storage key changes
  useEffect(() => {
    const handler = () => setSelectedTeamIds(readFromStorage())
    window.addEventListener('scorpanion:teams-changed', handler)
    return () => window.removeEventListener('scorpanion:teams-changed', handler)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const toggleTeam = (id: string) => {
    setSelectedTeamIds(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
      // Only write SEATTLE_TEAMS IDs back to STORAGE_KEY.
      // The merged `prev`/`next` may include "other" pro team IDs from OTHER_STORAGE_KEY,
      // but those must stay in their own key — mixing them here would cause SportsDataContext's
      // SEATTLE_TEAMS-only pruner to strip them on the next mount, and would also make it
      // impossible for toggleFollow to cleanly remove them later.
      const seattleNext = next.filter(x => SEATTLE_ID_SET.has(x))
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seattleNext))
      window.dispatchEvent(new CustomEvent('scorpanion:teams-changed', { detail: next }))
      return next
    })
  }

  return { selectedTeamIds, toggleTeam, loaded }
}
