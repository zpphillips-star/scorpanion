'use client'
import { useState } from 'react'
import Image from 'next/image'
import { SEATTLE_TEAMS, getTeamLogoUrl } from '@/lib/teams'
import { useSelectedTeams } from '@/hooks/useSelectedTeams'
import TeamLogo from '@/components/TeamLogo'
import { SeattleTeam } from '@/lib/types'

const PRO_TEAM_IDS = ['seahawks', 'mariners', 'kraken', 'sounders', 'storm', 'reign', 'torrent']
const OTHER_IDS = ['seattleu']

type DrillDownItem =
  | { type: 'team'; teamId: string }
  | { type: 'unavailable'; label: string; emoji: string; link: string }

const UW_DRILLDOWN: DrillDownItem[] = [
  { type: 'team', teamId: 'uw-football' },
  { type: 'team', teamId: 'uw-basketball' },
  { type: 'team', teamId: 'uw-wbb' },
  { type: 'team', teamId: 'uw-baseball' },
  { type: 'unavailable', label: 'Softball', emoji: '🥎', link: 'https://gohuskies.com' },
  { type: 'team', teamId: 'uw-volleyball' },
  { type: 'unavailable', label: "Women's Soccer", emoji: '⚽', link: 'https://gohuskies.com' },
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

  if (!loaded) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const TeamCard = ({ team }: { team: SeattleTeam }) => {
    const selected = selectedTeamIds.includes(team.id)
    return (
      <button
        onClick={() => toggleTeam(team.id)}
        className="relative flex flex-col items-center gap-2 p-4 rounded-xl border transition-all"
        style={{
          borderColor: selected ? team.primaryColor : 'rgba(255,255,255,0.08)',
          backgroundColor: selected ? `${team.primaryColor}22` : 'rgba(255,255,255,0.03)',
        }}
      >
        {selected && (
          <div
            className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center"
            style={{ backgroundColor: team.primaryColor }}
          >
            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )}
        <TeamLogo src={getTeamLogoUrl(team)} emoji={team.emoji} abbr={team.abbr} size={48} />
        <div className="text-center">
          <div className="text-white text-sm font-semibold leading-tight">{team.shortName}</div>
          <div className="text-gray-500 text-xs mt-0.5 capitalize">{team.sport}</div>
        </div>
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

      {/* Sports list */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
        {config.items.map((item, idx) => {
          if (item.type === 'team') {
            const team = SEATTLE_TEAMS.find(t => t.id === item.teamId)
            if (!team) return null
            return <TeamCard key={item.teamId} team={team} />
          }
          // Unavailable sport
          return (
            <a
              key={idx}
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-4 rounded-xl border border-white/08 bg-white/03 hover:bg-white/06 transition-colors"
              style={{ borderColor: 'rgba(255,255,255,0.06)', backgroundColor: 'rgba(255,255,255,0.02)' }}
            >
              <span className="text-2xl w-12 text-center">{item.emoji}</span>
              <div className="flex-1 min-w-0">
                <div className="text-gray-300 text-sm font-medium">{item.label}</div>
                <div className="text-gray-600 text-xs mt-0.5">Schedule not available — visit official site</div>
              </div>
              <svg className="w-4 h-4 text-gray-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          )
        })}
      </div>
    </div>
  )

  return (
    <div className="pb-4">
      <div className="sticky top-0 z-30 px-4 py-3 bg-[#0a0a0f]/95 backdrop-blur-md border-b border-white/10">
        <h1 className="text-xl font-bold text-white">Teams</h1>
        <p className="text-gray-400 text-sm mt-0.5">
          Following {selectedTeamIds.length} team{selectedTeamIds.length !== 1 ? 's' : ''}
        </p>
      </div>

      <div className="px-4 mt-4">
        <h2 className="text-gray-400 text-xs uppercase tracking-wider font-semibold mb-3">Pro Teams</h2>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {byIds(PRO_TEAM_IDS).map(team => <TeamCard key={team.id} team={team} />)}
        </div>
      </div>

      <div className="px-4 mt-6">
        <h2 className="text-gray-400 text-xs uppercase tracking-wider font-semibold mb-3">University of Washington</h2>
        <UniversityCard config={UW_CONFIG} />
      </div>

      <div className="px-4 mt-6">
        <h2 className="text-gray-400 text-xs uppercase tracking-wider font-semibold mb-3">Washington State</h2>
        <UniversityCard config={WSU_CONFIG} />
      </div>

      <div className="px-4 mt-6">
        <h2 className="text-gray-400 text-xs uppercase tracking-wider font-semibold mb-3">Other</h2>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {byIds(OTHER_IDS).map(team => <TeamCard key={team.id} team={team} />)}
        </div>
      </div>

      {/* Drill-down panel */}
      {drillDown && <DrillDownPanel config={drillDown} />}
    </div>
  )
}
