'use client'
import { useState, useEffect } from 'react'
import { SEATTLE_TEAMS } from '@/lib/teams'
import { ALL_PRO_TEAMS } from '@/lib/allProTeams'

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
      const seattleIds = new Set(SEATTLE_TEAMS.map(t => t.id))
      const proIds = new Set(ALL_PRO_TEAMS.map(t => t.id))

      const seattleStored = localStorage.getItem(STORAGE_KEY)
      let seattleList: string[] = []
      if (seattleStored === null) {
        // First visit — seed with Seattle pro teams + golf tours
        seattleList = DEFAULT_SEED_IDS
        localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_SEED_IDS))
      } else {
        const parsed = JSON.parse(seattleStored) as string[]
        seattleList = parsed.filter(id => (seattleIds.has(id) || proIds.has(id)) && !COLLEGE_IDS.includes(id))
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
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      window.dispatchEvent(new CustomEvent('scorpanion:teams-changed', { detail: next }))
      return next
    })
  }

  return { selectedTeamIds, toggleTeam, loaded }
}
