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
        setSelectedTeamIds(JSON.parse(stored))
      } else {
        setSelectedTeamIds(SEATTLE_TEAMS.map(t => t.id))
      }
    } catch {
      setSelectedTeamIds(SEATTLE_TEAMS.map(t => t.id))
    }
    setLoaded(true)
  }, [])

  const toggleTeam = (id: string) => {
    setSelectedTeamIds(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }

  return { selectedTeamIds, toggleTeam, loaded }
}
