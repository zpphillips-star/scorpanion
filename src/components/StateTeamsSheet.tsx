'use client'
import { useFollowedOtherTeams } from '@/hooks/useFollowedOtherTeams'
import { getTeamsByState, ProTeam } from '@/lib/allProTeams'

interface Props {
  stateAbbr: string
  onClose: () => void
}

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

const LEAGUE_COLORS: Record<string, string> = {
  NFL: '#013369',
  NBA: '#006BB6',
  NHL: '#010101',
  MLB: '#002D72',
  WNBA: '#FF6900',
  MLS: '#002B5C',
  NWSL: '#00A9E0',
}

const LEAGUE_ORDER = ['NFL', 'NBA', 'NHL', 'MLB', 'WNBA', 'MLS', 'NWSL'] as const

function groupByLeague(teams: ProTeam[]): Map<string, ProTeam[]> {
  const map = new Map<string, ProTeam[]>()
  for (const league of LEAGUE_ORDER) {
    const group = teams.filter(t => t.league === league)
    if (group.length > 0) map.set(league, group)
  }
  return map
}

export default function StateTeamsSheet({ stateAbbr, onClose }: Props) {
  const { followedIds, toggleFollow } = useFollowedOtherTeams()
  const teams = getTeamsByState(stateAbbr)
  const grouped = groupByLeague(teams)
  const stateName = STATE_NAMES[stateAbbr] ?? stateAbbr

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-sm z-40"
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 rounded-t-xl animate-slide-up overflow-y-auto"
        style={{
          background: 'var(--surface, #111118)',
          maxHeight: '82vh',
        }}
      >
        {/* Drag handle */}
        <div className="w-10 h-1 rounded-full bg-white/15 mx-auto mt-3 mb-1" />

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3">
          <div>
            <h2 className="font-display text-xl font-800 text-white uppercase tracking-tight leading-tight">
              {stateName}
            </h2>
            <p className="text-zinc-500 text-xs mt-0.5">
              {teams.length} pro team{teams.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:bg-white/10 transition-colors text-lg leading-none"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Team list */}
        <div className="px-4 pb-8">
          {teams.length === 0 ? (
            <p className="text-zinc-600 text-sm text-center py-8">No pro teams in {stateName}</p>
          ) : (
            Array.from(grouped.entries()).map(([league, leagueTeams]) => (
              <div key={league} className="mb-4">
                {/* League header */}
                <p
                  className="text-[10px] font-700 uppercase tracking-widest mb-2"
                  style={{ color: '#71717a' }}
                >
                  {league}
                </p>

                {/* Teams */}
                <div className="space-y-1">
                  {leagueTeams.map(team => {
                    const isFollowed = followedIds.includes(team.id)
                    return (
                      <div
                        key={team.id}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                        style={{ background: 'rgba(255,255,255,0.03)' }}
                      >
                        {/* Logo */}
                        <div className="w-8 h-8 rounded-lg overflow-hidden bg-white/5 flex items-center justify-center shrink-0">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={team.logo}
                            alt={team.name}
                            width={32}
                            height={32}
                            style={{ objectFit: 'contain' }}
                          />
                        </div>

                        {/* Name */}
                        <div className="flex-1 min-w-0">
                          <div className="text-white text-sm font-semibold truncate">{team.name}</div>
                          <div className="text-zinc-500 text-xs truncate">{team.city}</div>
                        </div>

                        {/* League badge */}
                        <span
                          className="text-[9px] font-800 uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0"
                          style={{
                            background: LEAGUE_COLORS[league] ?? '#333',
                            color: '#fff',
                          }}
                        >
                          {league}
                        </span>

                        {/* Follow button */}
                        <button
                          onClick={() => toggleFollow(team.id)}
                          className="shrink-0 px-3 py-1 rounded-full text-xs font-semibold transition-all"
                          style={
                            isFollowed
                              ? { background: '#00d4ff', color: '#000' }
                              : { background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: '#9ca3af' }
                          }
                        >
                          {isFollowed ? 'Following' : '+ Follow'}
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  )
}
