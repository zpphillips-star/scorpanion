'use client'
import { SEATTLE_TEAMS, getTeamLogoUrl } from '@/lib/teams'
import { useSelectedTeams } from '@/hooks/useSelectedTeams'
import TeamLogo from '@/components/TeamLogo'

const PRO_TEAMS = SEATTLE_TEAMS.filter(t => !['college-football', 'mens-college-basketball'].includes(t.league))
const COLLEGE_TEAMS = SEATTLE_TEAMS.filter(t => ['college-football', 'mens-college-basketball'].includes(t.league))

export default function TeamsClient() {
  const { selectedTeamIds, toggleTeam, loaded } = useSelectedTeams()

  if (!loaded) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const TeamCard = ({ team }: { team: typeof SEATTLE_TEAMS[0] }) => {
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

  return (
    <div className="pb-4">
      <div className="sticky top-0 z-30 px-4 py-3 bg-[#0a0a0f]/95 backdrop-blur-md border-b border-white/10">
        <h1 className="text-xl font-bold text-white">Teams</h1>
        <p className="text-gray-400 text-sm mt-0.5">
          Following {selectedTeamIds.length} team{selectedTeamIds.length !== 1 ? 's' : ''}
        </p>
      </div>

      <div className="px-4 mt-4">
        <h2 className="text-gray-400 text-xs uppercase tracking-wider font-semibold mb-3">Pro Sports</h2>
        <div className="grid grid-cols-2 gap-3">
          {PRO_TEAMS.map(team => <TeamCard key={team.id} team={team} />)}
        </div>
      </div>

      <div className="px-4 mt-6">
        <h2 className="text-gray-400 text-xs uppercase tracking-wider font-semibold mb-3">College Sports</h2>
        <div className="grid grid-cols-2 gap-3">
          {COLLEGE_TEAMS.map(team => <TeamCard key={team.id} team={team} />)}
        </div>
      </div>
    </div>
  )
}
