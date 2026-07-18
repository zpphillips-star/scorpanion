'use client'
import { useState, useEffect } from 'react'
import { SEATTLE_TEAMS } from '@/lib/teams'
import { ALL_PRO_TEAMS } from '@/lib/allProTeams'

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
        // Valid = any SEATTLE_TEAMS id OR any ALL_PRO_TEAMS id, minus college IDs
        const seattleIds = new Set(SEATTLE_TEAMS.map(t => t.id))
        const proIds = new Set(ALL_PRO_TEAMS.map(t => t.id))
        const filtered = parsed.filter((id: string) =>
          (seattleIds.has(id) || proIds.has(id)) && !COLLEGE_IDS.includes(id)
        )
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
