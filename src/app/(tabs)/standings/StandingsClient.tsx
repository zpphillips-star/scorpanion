'use client'
import { useState, useEffect } from 'react'
import Image from 'next/image'
import { SEATTLE_TEAMS } from '@/lib/teams'

interface StandingsEntry {
  teamId: string
  teamName: string
  abbr: string
  logo: string
  wins: number
  losses: number
  ties?: number
  winPct: number
  gamesBehind: number | string
  isSeattle: boolean
}

interface Division {
  name: string
  entries: StandingsEntry[]
}

interface LeagueStandings {
  divisions: Division[]
}

const LEAGUE_TABS = [
  { id: 'mlb', label: 'MLB' },
  { id: 'nhl', label: 'NHL' },
  { id: 'nba', label: 'NBA' },
  { id: 'wnba', label: 'WNBA' },
  { id: 'mls', label: 'MLS' },
  { id: 'nfl', label: 'NFL' },
]

// ESPN IDs for Seattle teams by league
const SEATTLE_ESPN_IDS: Record<string, string[]> = {
  mlb: ['21'],       // Mariners
  nhl: ['55'],       // Kraken
  nba: [],           // No NBA team
  wnba: ['14'],      // Storm
  mls: ['9'],        // Sounders
  nfl: ['26'],       // Seahawks
}

function formatPct(pct: number): string {
  if (pct >= 1) return '1.000'
  return pct.toFixed(3).replace(/^0/, '')
}

function TeamLogoImg({ src, abbr }: { src: string; abbr: string }) {
  const [err, setErr] = useState(false)
  if (err || !src) {
    return (
      <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-[9px] font-bold text-gray-400">
        {abbr.slice(0, 3)}
      </div>
    )
  }
  return (
    <Image
      src={src}
      alt={abbr}
      width={28}
      height={28}
      className="object-contain w-7 h-7"
      onError={() => setErr(true)}
      unoptimized
    />
  )
}

function DivisionTable({ division }: { division: Division }) {
  return (
    <div className="mb-4">
      <div className="px-4 py-2 bg-white/5">
        <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider">{division.name}</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[340px]">
          <thead>
            <tr className="border-b border-white/5">
              <th className="text-left pl-4 pr-2 py-2 text-gray-500 text-xs font-medium w-8">#</th>
              <th className="text-left px-2 py-2 text-gray-500 text-xs font-medium">Team</th>
              <th className="text-center px-2 py-2 text-gray-500 text-xs font-medium">W</th>
              <th className="text-center px-2 py-2 text-gray-500 text-xs font-medium">L</th>
              <th className="text-center px-2 py-2 text-gray-500 text-xs font-medium">PCT</th>
              <th className="text-center px-2 py-2 pr-4 text-gray-500 text-xs font-medium">GB</th>
            </tr>
          </thead>
          <tbody>
            {division.entries.map((entry, idx) => (
              <tr
                key={entry.teamId}
                className={`border-b border-white/5 ${entry.isSeattle ? 'relative' : ''}`}
                style={entry.isSeattle ? {
                  backgroundColor: 'rgba(59,130,246,0.08)',
                  boxShadow: 'inset 2px 0 0 #3b82f6',
                } : {}}
              >
                <td className="pl-4 pr-2 py-2.5 text-gray-500 text-sm">{idx + 1}</td>
                <td className="px-2 py-2.5">
                  <div className="flex items-center gap-2">
                    <TeamLogoImg src={entry.logo} abbr={entry.abbr} />
                    <div>
                      <div className={`text-sm font-medium ${entry.isSeattle ? 'text-blue-300' : 'text-white'}`}>
                        {entry.teamName}
                      </div>
                      <div className="text-gray-500 text-xs">{entry.abbr}</div>
                    </div>
                  </div>
                </td>
                <td className="text-center px-2 py-2.5 text-white text-sm">{entry.wins}</td>
                <td className="text-center px-2 py-2.5 text-white text-sm">{entry.losses}</td>
                <td className="text-center px-2 py-2.5 text-gray-300 text-sm">{formatPct(entry.winPct)}</td>
                <td className="text-center px-2 py-2.5 pr-4 text-gray-300 text-sm">
                  {entry.gamesBehind === 0 || entry.gamesBehind === '0' || entry.gamesBehind === '-' ? '—' : entry.gamesBehind}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function StandingsClient() {
  const [activeLeague, setActiveLeague] = useState('mlb')
  const [standings, setStandings] = useState<LeagueStandings | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    setStandings(null)
    fetch(`/api/standings?league=${activeLeague}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then((data: LeagueStandings) => setStandings(data))
      .catch(() => setError('Unable to load standings'))
      .finally(() => setLoading(false))
  }, [activeLeague])

  // Only show tabs for leagues where we track a Seattle team
  const visibleTabs = LEAGUE_TABS.filter(tab => (SEATTLE_ESPN_IDS[tab.id] || []).length > 0 || true)

  return (
    <div className="pb-4">
      <div className="sticky top-0 z-30 px-4 py-3 bg-[#0a0a0f]/95 backdrop-blur-md border-b border-white/10">
        <h1 className="text-xl lg:text-2xl font-bold text-white">Standings</h1>
      </div>

      {/* League tabs */}
      <div className="overflow-x-auto scrollbar-hide border-b border-white/10">
        <div className="flex min-w-max px-4 gap-1 pt-2">
          {visibleTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveLeague(tab.id)}
              className={`px-4 py-2 text-sm font-semibold rounded-t-lg transition-colors ${
                activeLeague === tab.id
                  ? 'text-blue-400 bg-blue-500/10 border-b-2 border-blue-400'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {error && (
        <div className="mx-4 mt-4 p-3 bg-red-900/30 border border-red-500/30 rounded-lg text-red-300 text-sm">
          {error}
        </div>
      )}

      {standings && !loading && (
        <div className="mt-2">
          {standings.divisions.map(div => (
            <DivisionTable key={div.name} division={div} />
          ))}
        </div>
      )}
    </div>
  )
}
