'use client'
import { useState, useEffect } from 'react'
import { SEATTLE_TEAMS } from '@/lib/teams'

const STORAGE_KEY = 'seattle-sports-teams'

// College team IDs — removed from the app for now; strip them from any stored selection
const COLLEGE_IDS = [
  'uw-football','uw-basketball','uw-wbb','uw-volleyball','uw-baseball','uw-lacrosse','uw-softball','uw-soccer',
  'wsu-football','wsu-mbb','wsu-wbb','wsu-baseball','wsu-volleyball',
  'seattleu',
]

export function useSelectedTeams() {
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        // Filter out college IDs and any stale team IDs
        const validTeamIds = SEATTLE_TEAMS.map(t => t.id)
        const filtered = parsed.filter((id: string) => validTeamIds.includes(id) && !COLLEGE_IDS.includes(id))
        if (filtered.length !== parsed.length) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered))
        }
        setSelectedTeamIds(filtered)
      } else {
        setSelectedTeamIds([])
      }
    } catch {
      setSelectedTeamIds([])
    }
    setLoaded(true)
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
