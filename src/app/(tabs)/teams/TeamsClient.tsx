'use client'
import { useState, useMemo } from 'react'
import Image from 'next/image'
import { SEATTLE_TEAMS, getTeamLogoUrl } from '@/lib/teams'
import { useSelectedTeams } from '@/hooks/useSelectedTeams'
import TeamLogo from '@/components/TeamLogo'
import { SeattleTeam } from '@/lib/types'
import USCanadaMap from '@/components/USCanadaMap'
import StateTeamsSheet from '@/components/StateTeamsSheet'
import { ALL_PRO_TEAMS } from '@/lib/allProTeams'

const PRO_TEAM_IDS = ['seahawks', 'mariners', 'kraken', 'sounders', 'storm', 'reign', 'torrent', 'thunderbirds', 'silvertips']
const OTHER_IDS = ['seattleu']

type DrillDownItem =
  | { type: 'team'; teamId: string }
  | { type: 'unavailable'; label: string; emoji: string; link: string }

const UW_DRILLDOWN: DrillDownItem[] = [
  { type: 'team', teamId: 'uw-football' },
  { type: 'team', teamId: 'uw-basketball' },
  { type: 'team', teamId: 'uw-wbb' },
  { type: 'team', teamId: 'uw-baseball' },
  { type: 'team', teamId: 'uw-softball' },
  { type: 'team', teamId: 'uw-volleyball' },
  { type: 'team', teamId: 'uw-soccer' },
  { type: 'unavailable', label: "Women's Gymnastics", emoji: '🤸', link: 'https://gohuskies.com' },
  { type: 'unavailable', label: "Men's Gymnastics", emoji: '🤸', link: 'https://gohuskies.com' },
  { type: 'team', teamId: 'uw-lacrosse' },
  { type: 'unavailable', label: 'Swimming & Diving', emoji: '🏊', link: 'https://gohuskies.com' },
  { type: 'unavailable', label: 'Track & Field', emoji: '🏃', link: 'https://gohuskies.com' },
  { type: 'unavailable', label: 'Tennis', emoji: '🎾', link: 'https://gohuskies.com' },
  { type: 'unavailable', label: 'Rowing', emoji: '🚣', link: 'https://gohuskies.com' },
  { type: 'unavailable', label: 'Golf', emoji: '⛳', link: 'https://gohuskies.com' },
]

const WSU_DRILLDOWN: DrillDownItem[] = [
  { type: 'team', teamId: 'wsu-football' },
  { type: 'team', teamId: 'wsu-mbb' },
  { type: 'team', teamId: 'wsu-wbb' },
  { type: 'team', teamId: 'wsu-baseball' },
  { type: 'unavailable', label: 'Softball', emoji: '🥎', link: 'https://wsucougars.com' },
  { type: 'team', teamId: 'wsu-volleyball' },
  { type: 'unavailable', label: "Women's Soccer", emoji: '⚽', link: 'https://wsucougars.com' },
  { type: 'unavailable', label: 'Swimming & Diving', emoji: '🏊', link: 'https://wsucougars.com' },
  { type: 'unavailable', label: 'Track & Field', emoji: '🏃', link: 'https://wsucougars.com' },
  { type: 'unavailable', label: 'Tennis', emoji: '🎾', link: 'https://wsucougars.com' },
  { type: 'unavailable', label: 'Golf', emoji: '⛳', link: 'https://wsucougars.com' },
  { type: 'unavailable', label: 'Rowing', emoji: '🚣', link: 'https://wsucougars.com' },
]

const byIds = (ids: string[]) => ids.map(id => SEATTLE_TEAMS.find(t => t.id === id)!).filter(Boolean)

interface DrillDownConfig {
  school: 'uw' | 'wsu'
  title: string
  logoSrc: string
  items: DrillDownItem[]
  unavailableLink: string
}

const UW_CONFIG: DrillDownConfig = {
  school: 'uw',
  title: 'University of Washington',
  logoSrc: 'https://a.espncdn.com/i/teamlogos/ncaa/500/264.png',
  items: UW_DRILLDOWN,
  unavailableLink: 'https://gohuskies.com',
}

const WSU_CONFIG: DrillDownConfig = {
  school: 'wsu',
  title: 'Washington State Cougars',
  logoSrc: 'https://a.espncdn.com/i/teamlogos/ncaa/500/265.png',
  items: WSU_DRILLDOWN,
  unavailableLink: 'https://wsucougars.com',
}

export default function TeamsClient() {
  const { selectedTeamIds, toggleTeam, loaded } = useSelectedTeams()
  const [drillDown, setDrillDown] = useState<DrillDownConfig | null>(null)
  const [selectedMapState, setSelectedMapState] = useState<string | null>(null)

  const teamsPerState = useMemo(() => {
    const map: Record<string, number> = {}
    ALL_PRO_TEAMS.forEach(t => { map[t.state] = (map[t.state] || 0) + 1 })
    return map
  }, [])

  if (!loaded) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-[#00d4ff] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const TeamCard = ({ team }: { team: SeattleTeam }) => {
    const selected = selectedTeamIds.includes(team.id)
    return (
      <button
        onClick={() => toggleTeam(team.id)}
        className="relative flex flex-col items-center gap-2 p-3 rounded-2xl transition-all active:scale-95"
        style={{
          background: selected ? `${team.primaryColor}22` : 'rgba(255,255,255,0.04)',
          border: `2px solid ${selected ? team.primaryColor : 'rgba(255,255,255,0.08)'}`,
          boxShadow: selected ? `0 0 14px ${team.primaryColor}44` : 'none',
        }}
      >
        <TeamLogo src={getTeamLogoUrl(team)} emoji={team.emoji} abbr={team.abbr} size={44} />
        {selected && (
          <div
            className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full flex items-center justify-center"
            style={{ backgroundColor: team.primaryColor }}
          >
            <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )}
      </button>
    )
  }

  const UniversityCard = ({ config }: { config: DrillDownConfig }) => {
    const items = config.items.filter(i => i.type === 'team') as { type: 'team'; teamId: string }[]
    const followedCount = items.filter(i => selectedTeamIds.includes(i.teamId)).length
    return (
      <button
        onClick={() => setDrillDown(config)}
        className="w-full flex items-center gap-4 p-4 rounded-xl border transition-all text-left"
        style={{
          borderColor: followedCount > 0 ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.08)',
          backgroundColor: followedCount > 0 ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.03)',
        }}
      >
        <div className="w-14 h-14 rounded-full overflow-hidden bg-white/10 flex items-center justify-center shrink-0">
          <Image src={config.logoSrc} alt={config.title} width={56} height={56} className="object-contain" unoptimized />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-white font-semibold text-sm">{config.title}</div>
          <div className="text-gray-400 text-xs mt-0.5">
            {followedCount > 0
              ? `${followedCount} sport${followedCount !== 1 ? 's' : ''} followed`
              : `${config.items.length} sports — tap to explore`}
          </div>
        </div>
        <svg className="w-5 h-5 text-gray-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
    )
  }

  const DrillDownPanel = ({ config }: { config: DrillDownConfig }) => (
    <div className="fixed inset-0 z-50 bg-[#0a0a0f] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="shrink-0 flex items-center gap-3 px-4 py-4 border-b border-white/10 bg-[#0a0a0f]/95 backdrop-blur-md">
        <button
          onClick={() => setDrillDown(null)}
          className="p-2 rounded-lg hover:bg-white/10 transition-colors"
          aria-label="Close"
        >
          <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <Image src={config.logoSrc} alt={config.title} width={36} height={36} className="object-contain" unoptimized />
        <div>
          <h2 className="text-white font-bold text-base leading-tight">{config.title}</h2>
          <p className="text-gray-500 text-xs">Select sports to follow</p>
        </div>
      </div>

      {/* Sports list — team cards in 2-col grid, unavailable sports as list rows */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {/* Available team cards — grid */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          {config.items.filter(i => i.type === 'team').map((item) => {
            if (item.type !== 'team') return null
            const team = SEATTLE_TEAMS.find(t => t.id === item.teamId)
            if (!team) return null
            return <TeamCard key={item.teamId} team={team} />
          })}
        </div>
        {/* Unavailable sports — list */}
        {config.items.some(i => i.type === 'unavailable') && (
          <>
            <p className="text-[11px] uppercase tracking-widest font-bold text-zinc-600 mb-2 mt-2">Not yet available</p>
            <div className="space-y-1.5">
              {config.items.filter(i => i.type === 'unavailable').map((item, idx) => {
                if (item.type !== 'unavailable') return null
                return (
                  <a
                    key={idx}
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors hover:bg-white/5"
                    style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}
                  >
                    <span className="text-xl w-8 text-center">{item.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-zinc-400 text-sm font-medium">{item.label}</div>
                      <div className="text-zinc-600 text-xs">Visit official site →</div>
                    </div>
                  </a>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )

  return (
    <div className="pb-4">
      <div className="sticky top-0 z-30 glass-header px-4 py-3">
        <h1 className="font-display text-[26px] font-800 text-white leading-none tracking-tight uppercase">Teams</h1>
        <p className="text-zinc-500 text-sm mt-0.5">
          Following {selectedTeamIds.length} team{selectedTeamIds.length !== 1 ? 's' : ''}
        </p>
      </div>

      <div className="px-4 mt-4">
        <h2 className="font-display text-[11px] font-700 text-zinc-500 uppercase tracking-widest mb-1">Discover by Location 🗺️</h2>
        <p className="text-zinc-600 text-[11px] mb-3">Tap a state or province to see its pro teams</p>
        <USCanadaMap
          selectedState={selectedMapState}
          onStateSelect={(abbr) => setSelectedMapState(abbr)}
          teamsPerState={teamsPerState}
        />
      </div>

      {selectedMapState && (
        <StateTeamsSheet
          stateAbbr={selectedMapState}
          onClose={() => setSelectedMapState(null)}
        />
      )}

      <div className="px-4 mt-4">
        <h2 className="font-display text-[11px] font-700 text-zinc-500 uppercase tracking-widest mb-3">Pro Teams</h2>
        <div className="grid grid-cols-4 lg:grid-cols-6 gap-3">
          {byIds(PRO_TEAM_IDS).map(team => <TeamCard key={team.id} team={team} />)}
        </div>
      </div>

      <div className="px-4 mt-6">
        <h2 className="font-display text-[11px] font-700 text-zinc-500 uppercase tracking-widest mb-3">University of Washington</h2>
        <UniversityCard config={UW_CONFIG} />
      </div>

      <div className="px-4 mt-6">
        <h2 className="font-display text-[11px] font-700 text-zinc-500 uppercase tracking-widest mb-3">Washington State</h2>
        <UniversityCard config={WSU_CONFIG} />
      </div>

      <div className="px-4 mt-6">
        <h2 className="font-display text-[11px] font-700 text-zinc-500 uppercase tracking-widest mb-3">Other</h2>
        <div className="grid grid-cols-4 lg:grid-cols-6 gap-3">
          {byIds(OTHER_IDS).map(team => <TeamCard key={team.id} team={team} />)}
        </div>
      </div>

      {/* Drill-down panel */}
      {drillDown && <DrillDownPanel config={drillDown} />}
    </div>
  )
}

