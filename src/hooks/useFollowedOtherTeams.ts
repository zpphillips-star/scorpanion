'use client'
import { useState, useEffect } from 'react'

const STORAGE_KEY = 'followed_other_teams'

export function useFollowedOtherTeams() {
  const [followedIds, setFollowedIds] = useState<string[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) setFollowedIds(JSON.parse(stored))
    } catch {}
    setLoaded(true)
  }, [])

  const toggleFollow = (id: string) => {
    setFollowedIds(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }

  return { followedIds, toggleFollow, loaded }
}
