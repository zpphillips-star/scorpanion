'use client'
import { useState, useEffect } from 'react'
import { SEATTLE_TEAMS } from '@/lib/teams'

const STORAGE_KEY = 'seattle-sports-teams'

export function useSelectedTeams() {
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        // Filter out any stale team IDs that no longer exist
        const validTeamIds = SEATTLE_TEAMS.map(t => t.id)
        const filtered = parsed.filter((id: string) => validTeamIds.includes(id))
        // If we filtered any out, update localStorage
        if (filtered.length !== parsed.length) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered))
        }
        setSelectedTeamIds(filtered)
      } else {
        // No stored selection — start empty, user picks their teams
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
      // Notify SportsDataContext so it can refetch with the new team selection
      window.dispatchEvent(new CustomEvent('scorpanion:teams-changed', { detail: next }))
      return next
    })
  }

  return { selectedTeamIds, toggleTeam, loaded }
}
