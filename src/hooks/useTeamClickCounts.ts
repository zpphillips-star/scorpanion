'use client'
import { useState, useEffect } from 'react'

const STORAGE_KEY = 'scorpanion-team-clicks'

export function useTeamClickCounts() {
  const [counts, setCounts] = useState<Record<string, number>>({})

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) setCounts(JSON.parse(stored))
    } catch {}
  }, [])

  const recordClick = (teamId: string) => {
    setCounts(prev => {
      const next = { ...prev, [teamId]: (prev[teamId] || 0) + 1 }
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      } catch {}
      return next
    })
  }

  return { counts, recordClick }
}
