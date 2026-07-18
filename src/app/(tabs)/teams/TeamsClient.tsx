'use client'
import { useState, useMemo } from 'react'
import Image from 'next/image'
import { SEATTLE_TEAMS, getTeamLogoUrl } from '@/lib/teams'
import { useSelectedTeams } from '@/hooks/useSelectedTeams'
import { useFollowedOtherTeams } from '@/hooks/useFollowedOtherTeams'
import TeamLogo from '@/components/TeamLogo'
import { SeattleTeam } from '@/lib/types'
import USCanadaMap from '@/components/USCanadaMap'
import { ALL_PRO_TEAMS, ProTeam, getTeamsByState } from '@/lib/allProTeams'

// ── Sport filter tabs ────────────────────────────────────────────────────────
const SPORT_TABS = [
  { id: 'ALL',  label: 'All' },
  { id: 'NFL',  label: 'NFL' },
  { id: 'NBA',  label: 'NBA' },
  { id: 'NHL',  label: 'NHL' },
  { id: 'MLB',  label: 'MLB' },
  { id: 'WNBA', label: 'WNBA' },
  { id: 'MLS',  label: 'MLS' },
  { id: 'NWSL', label: 'NWSL' },
  { id: 'GOLF', label: 'Golf' },
] as const
type SportTab = typeof SPORT_TABS[number]['id']

// Seattle teams have state = 'WA'
const SEATTLE_STATE = 'WA'

// ── Seattle-only team IDs (for the existing "My Teams" section) ──────────────
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

// ── Shared league badge colours ───────────────────────────────────────────────
const LEAGUE_BADGE: Record<string, string> = {
  NFL: '#013369', NBA: '#006BB6', NHL: '#010101',
  MLB: '#002D72', WNBA: '#FF6900', MLS: '#002B5C', NWSL: '#00A9E0',
}

// ── State full names ──────────────────────────────────────────────────────────
const STATE_NAMES: Record<string, string> = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
  CO: 'Colorado', CT: 'Connecticut', DC: 'Washington D.C.', DE: 'Delaware',
  FL: 'Florida', GA: 'Georgia', HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois',
  IN: 'Indiana', IA: 'Iowa', KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana',
  ME: 'Maine', MD: 'Maryland', MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota',
  MS: 'Mississippi', MO: 'Missouri', MT: 'Montana', NE: 'Nebraska', NV: 'Nevada',
  NH: 'New Hampshire', NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York',
  NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma', OR: 'Oregon',
  PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina', SD: 'South Dakota',
  TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont', VA: 'Virginia',
  WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
  BC: 'British Columbia', AB: 'Alberta', SK: 'Saskatchewan', MB: 'Manitoba',
  ON: 'Ontario', QC: 'Québec', NB: 'New Brunswick', NS: 'Nova Scotia',
  PE: 'Prince Edward Island', NL: 'Newfoundland',
}

export default function TeamsClient() {
  const { selectedTeamIds, toggleTeam, loaded } = useSelectedTeams()
  const { followedIds, toggleFollow } = useFollowedOtherTeams()
  const [drillDown, setDrillDown] = useState<DrillDownConfig | null>(null)
  const [selectedMapState, setSelectedMapState] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<SportTab>('ALL')
  const [searchQuery, setSearchQuery] = useState('')

  const teamsPerState = useMemo(() => {
    const map: Record<string, number> = {}
    ALL_PRO_TEAMS.forEach(t => { map[t.state] = (map[t.state] || 0) + 1 })
    return map
  }, [])

  // Filter + sort teams: followed first, then Seattle, then alphabetical
  const filteredTeams = useMemo(() => {
    let base = activeTab === 'ALL'
      ? ALL_PRO_TEAMS
      : ALL_PRO_TEAMS.filter(t => t.league === activeTab)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      base = base.filter(t =>
        t.name.toLowerCase().includes(q) ||
        t.city.toLowerCase().includes(q) ||
        t.shortName.toLowerCase().includes(q) ||
        t.abbr.toLowerCase().includes(q)
      )
    }
    return [...base].sort((a, b) => {
      const aF = followedIds.includes(a.id)
      const bF = followedIds.includes(b.id)
      if (aF !== bF) return aF ? -1 : 1
      const aS = a.state === SEATTLE_STATE
      const bS = b.state === SEATTLE_STATE
      if (aS !== bS) return aS ? -1 : 1
      return a.name.localeCompare(b.name)
    })
  }, [activeTab, followedIds, searchQuery])

  const proFollowedCount = followedIds.filter(id => ALL_PRO_TEAMS.some(t => t.id === id)).length
  const totalFollowed = selectedTeamIds.length + proFollowedCount

  if (!loaded) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-[#00d4ff] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // ── Seattle local-team card (existing behaviour) ─────────────────────────
  const SeattleTeamCard = ({ team }: { team: SeattleTeam }) => {
    const selected = selectedTeamIds.includes(team.id)
    return (
      <button
        onClick={() => toggleTeam(team.id)}
        className="relative flex flex-col items-center gap-2 p-3 rounded-lg transition-all active:scale-95"
        style={{
          background: selected ? 'rgba(0,212,255,0.15)' : 'rgba(255,255,255,0.04)',
          border: `2px solid ${selected ? '#00d4ff' : 'rgba(255,255,255,0.08)'}`,
          boxShadow: selected ? '0 0 16px rgba(0,212,255,0.5)' : 'none',
        }}
      >
        <TeamLogo src={getTeamLogoUrl(team)} emoji={team.emoji} abbr={team.abbr} size={44} />
        {selected && (
          <div
            className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full flex items-center justify-center"
            style={{ backgroundColor: '#00d4ff' }}
          >
            <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )}
      </button>
    )
  }

  // ── Pro-team grid card (all-leagues browse) ──────────────────────────────
  const ProTeamCard = ({ team }: { team: ProTeam }) => {
    const isFollowed = followedIds.includes(team.id)
    const isSeattle = team.state === SEATTLE_STATE
    const isStateMatch = selectedMapState !== null && team.state === selectedMapState && !isFollowed && !isSeattle
    const badgeColor = LEAGUE_BADGE[team.league] ?? '#333'

    return (
      <div
        role="button"
        tabIndex={0}
        onClick={() => toggleFollow(team.id)}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') toggleFollow(team.id) }}
        className="relative flex flex-col items-center gap-1.5 p-2.5 rounded-lg transition-all active:scale-95 cursor-pointer select-none"
        style={{
          background: isFollowed
            ? 'rgba(0,212,255,0.15)'
            : isStateMatch
            ? 'rgba(251,191,36,0.07)'
            : isSeattle
            ? 'rgba(0,212,255,0.06)'
            : 'rgba(255,255,255,0.03)',
          border: `2px solid ${
            isFollowed
              ? '#00d4ff'
              : isStateMatch
              ? 'rgba(251,191,36,0.45)'
              : isSeattle
              ? 'rgba(0,212,255,0.25)'
              : 'rgba(255,255,255,0.07)'
          }`,
          boxShadow: isFollowed
            ? '0 0 18px rgba(0,212,255,0.5)'
            : isStateMatch
            ? '0 0 8px rgba(251,191,36,0.15)'
            : 'none',
        }}
      >
        {/* Follow checkmark badge */}
        {isFollowed && (
          <div
            className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full flex items-center justify-center z-10"
            style={{ backgroundColor: '#00d4ff' }}
          >
            <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )}

        {/* Seattle star indicator */}
        {isSeattle && !isFollowed && (
          <div className="absolute top-1.5 right-1.5 text-[#00d4ff] text-[10px] leading-none">★</div>
        )}

        {/* Logo */}
        <div className="w-11 h-11 flex items-center justify-center mt-0.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={team.logo}
            alt={team.name}
            width={40}
            height={40}
            style={{ objectFit: 'contain', maxHeight: 44 }}
          />
        </div>

        {/* Name + league badge */}
        <div className="w-full text-center px-0.5">
          <div className="text-white text-[11px] font-semibold leading-tight line-clamp-2">{team.shortName}</div>
          <div
            className="text-[8px] font-700 uppercase tracking-wider mt-0.5 px-1 py-0.5 rounded inline-block"
            style={{ background: badgeColor, color: '#fff' }}
          >
            {team.league}
          </div>
        </div>
      </div>
    )
  }

  // ── State spotlight row (inline horizontal scroll below map) ────────────
  const StateSpotlightRow = ({ stateAbbr }: { stateAbbr: string }) => {
    const stateTeams = getTeamsByState(stateAbbr)
    const stateName = STATE_NAMES[stateAbbr] ?? stateAbbr
    if (stateTeams.length === 0) {
      return (
        <div
          className="mx-4 mb-2 px-4 py-3 rounded-lg flex items-center justify-between"
          style={{ background: 'rgba(0,212,255,0.05)', border: '1px solid rgba(0,212,255,0.15)' }}
        >
          <div className="flex items-center gap-2">
            <span className="text-sm">📍</span>
            <span className="font-display text-sm font-700 text-white uppercase tracking-wide">{stateName}</span>
            <span className="text-zinc-500 text-xs">No pro teams</span>
          </div>
          <button
            onClick={() => setSelectedMapState(null)}
            className="w-6 h-6 rounded-full flex items-center justify-center text-zinc-400 hover:bg-white/10 transition-colors text-xs"
            aria-label="Clear selection"
          >✕</button>
        </div>
      )
    }
    return (
      <div
        className="mb-2"
        style={{ background: 'rgba(0,212,255,0.04)', borderTop: '1px solid rgba(0,212,255,0.12)', borderBottom: '1px solid rgba(0,212,255,0.12)' }}
      >
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          <div className="flex items-center gap-2">
            <span className="text-sm">📍</span>
            <span className="font-display text-sm font-700 text-white uppercase tracking-wide">{stateName}</span>
            <span className="text-zinc-500 text-xs">{stateTeams.length} team{stateTeams.length !== 1 ? 's' : ''}</span>
          </div>
          <button
            onClick={() => setSelectedMapState(null)}
            className="w-6 h-6 rounded-full flex items-center justify-center text-zinc-400 hover:bg-white/10 transition-colors text-xs leading-none"
            aria-label="Clear state selection"
          >✕</button>
        </div>
        <div className="overflow-x-auto no-scrollbar px-4 pb-3">
          <div className="flex gap-2.5" style={{ width: 'max-content' }}>
            {stateTeams.map(team => {
              const isFollowed = followedIds.includes(team.id)
              return (
                <button
                  key={team.id}
                  onClick={() => toggleFollow(team.id)}
                  className="relative flex flex-col items-center gap-1 p-2.5 rounded-lg transition-all active:scale-95 shrink-0"
                  style={{
                    width: 76,
                    background: isFollowed ? 'rgba(0,212,255,0.15)' : 'rgba(255,255,255,0.07)',
                    border: `2px solid ${isFollowed ? '#00d4ff' : 'rgba(0,212,255,0.22)'}`,
                    boxShadow: isFollowed ? '0 0 16px rgba(0,212,255,0.5)' : '0 0 6px rgba(0,212,255,0.06)',
                  }}
                >
                  {/* Follow checkmark badge */}
                  {isFollowed && (
                    <div
                      className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full flex items-center justify-center z-10"
                      style={{ backgroundColor: '#00d4ff' }}
                    >
                      <svg className="w-2 h-2" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={team.logo} alt={team.name} width={40} height={40} style={{ objectFit: "contain", maxHeight: 40 }} />
                  <div className="text-[10px] font-semibold text-white leading-tight text-center line-clamp-2 w-full">{team.shortName}</div>
                  <span
                    className="text-[8px] font-700 uppercase px-1 py-0.5 rounded"
                    style={{ background: LEAGUE_BADGE[team.league] ?? '#333', color: '#fff' }}
                  >{team.league}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  const UniversityCard = ({ config }: { config: DrillDownConfig }) => {
    const items = config.items.filter(i => i.type === 'team') as { type: 'team'; teamId: string }[]
    const followedCount = items.filter(i => selectedTeamIds.includes(i.teamId)).length
    return (
      <button
        onClick={() => setDrillDown(config)}
        className="w-full flex items-center gap-4 p-4 rounded-lg border transition-all text-left"
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
          <div className="text-gray-300 text-xs mt-0.5">
            {followedCount > 0
              ? `${followedCount} sport${followedCount !== 1 ? 's' : ''} followed`
              : `${config.items.length} sports — tap to explore`}
          </div>
        </div>
        <svg className="w-5 h-5 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
    )
  }

  const DrillDownPanel = ({ config }: { config: DrillDownConfig }) => (
    <div className="fixed inset-0 z-50 bg-[#0c1b31] flex flex-col overflow-hidden">
      <div className="shrink-0 flex items-center gap-3 px-4 py-4 border-b border-white/10 bg-[#0c1b31]/95 backdrop-blur-md">
        <button
          onClick={() => setDrillDown(null)}
          className="p-2 rounded-md hover:bg-white/10 transition-colors"
          aria-label="Close"
        >
          <svg className="w-5 h-5 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <Image src={config.logoSrc} alt={config.title} width={36} height={36} className="object-contain" unoptimized />
        <div>
          <h2 className="text-white font-bold text-base leading-tight">{config.title}</h2>
          <p className="text-gray-400 text-xs">Select sports to follow</p>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="grid grid-cols-2 gap-3 mb-4">
          {config.items.filter(i => i.type === 'team').map((item) => {
            if (item.type !== 'team') return null
            const team = SEATTLE_TEAMS.find(t => t.id === item.teamId)
            if (!team) return null
            return <SeattleTeamCard key={item.teamId} team={team} />
          })}
        </div>
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
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors hover:bg-white/5"
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
      {/* ── DrillDown panel (full-screen overlay, rendered first so it sits on top) ── */}
      {drillDown && <DrillDownPanel config={drillDown} />}

      {/* ── Header ── */}
      <div className="sticky top-0 z-30 glass-header px-4 py-3">
        <h1 className="font-display text-[26px] font-800 text-white leading-none tracking-tight uppercase">Teams</h1>
        <p className="text-zinc-500 text-sm mt-0.5">
          {totalFollowed > 0
            ? `Following ${totalFollowed} team${totalFollowed !== 1 ? 's' : ''}`
            : 'Tap a state or team to explore'}
        </p>
      </div>

      {/* ── Map — pinned at the top, always visible ── */}
      <div className="px-4 pt-3 pb-2">
        <div className="flex items-center justify-between mb-1.5">
          <h2 className="font-display text-[11px] font-700 text-zinc-500 uppercase tracking-widest">🗺️ Discover by Location</h2>
          {selectedMapState && (
            <button
              onClick={() => setSelectedMapState(null)}
              className="text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              Clear ✕
            </button>
          )}
        </div>
        <USCanadaMap
          selectedState={selectedMapState}
          onStateSelect={(abbr) => setSelectedMapState(prev => prev === abbr ? null : abbr)}
          teamsPerState={teamsPerState}
        />
      </div>

      {/* ── State spotlight — appears immediately below map when a state is tapped ── */}
      {selectedMapState && <StateSpotlightRow stateAbbr={selectedMapState} />}

      {/* ── Search input — prominent ── */}
      <div className="px-4 pt-3 pb-2">
        <div className="relative">
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search team or city…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-10 py-3.5 rounded-2xl text-[15px] text-white placeholder-zinc-500 outline-none focus:ring-2 focus:ring-[rgba(217,92,23,0.4)]"
            style={{ background: 'var(--surface-2)', border: '1.5px solid rgba(255,255,255,0.1)' }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-colors"
              aria-label="Clear search"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* ── Sport filter tabs — bigger pills, not circles ── */}
      <div className="overflow-x-auto no-scrollbar px-4 pt-2 pb-2">
        <div className="flex gap-2 min-w-max">
          {SPORT_TABS.map(tab => {
            const active = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="px-5 py-3 rounded-2xl text-[15px] font-display font-700 uppercase tracking-wide transition-all whitespace-nowrap active:scale-95"
                style={{
                  background: active ? '#D95C17' : 'var(--surface-2)',
                  color: active ? '#ffffff' : '#9ca3af',
                  border: `1.5px solid ${active ? '#D95C17' : 'rgba(255,255,255,0.08)'}`,
                  boxShadow: active ? '0 0 16px rgba(217,92,23,0.4)' : 'none',
                  minWidth: '56px',
                }}
              >
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Pro teams grid (hidden on Golf tab) ── */}
      {activeTab !== 'GOLF' && (
        <div className="px-4 mt-3">
          {proFollowedCount > 0 && (
            <p className="font-display text-[10px] font-700 text-zinc-500 uppercase tracking-widest mb-2">
              ★ Following ({proFollowedCount})
            </p>
          )}
          {selectedMapState && !searchQuery && (
            <p className="text-[10px] text-amber-400/70 mb-2">
              ✦ Highlighted = {STATE_NAMES[selectedMapState] ?? selectedMapState} teams
            </p>
          )}
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2.5">
            {filteredTeams.map(team => (
              <ProTeamCard key={team.id} team={team} />
            ))}
          </div>
          {filteredTeams.length === 0 && (
            <p className="text-zinc-600 text-sm text-center py-8">No teams found</p>
          )}
        </div>
      )}

      {/* ── Golf tab content ── */}
      {activeTab === 'GOLF' && (
        <div className="px-4 mt-4">
          <p className="text-zinc-500 text-[13px] mb-4">Follow a tour to see live leaderboards on the Home tab.</p>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            {byIds(['pga', 'lpga']).map(team => <SeattleTeamCard key={team.id} team={team} />)}
          </div>
        </div>
      )}

      {/* ── Seattle section (local pro teams + golf tours) — hidden during search ── */}
      {activeTab === 'ALL' && !searchQuery && (
        <>
          <div className="px-4 mt-8 pb-1">
            <div className="flex items-center gap-2">
              <div className="flex-1 h-px bg-white/5" />
              <p className="font-display text-[10px] font-700 text-zinc-600 uppercase tracking-widest">Seattle Area</p>
              <div className="flex-1 h-px bg-white/5" />
            </div>
          </div>

          <div className="px-4 mt-4 pb-6">
            <h2 className="font-display text-[11px] font-700 text-zinc-500 uppercase tracking-widest mb-3">Pro Teams</h2>
            <div className="grid grid-cols-4 lg:grid-cols-6 gap-3">
              {byIds(PRO_TEAM_IDS).map(team => <SeattleTeamCard key={team.id} team={team} />)}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

