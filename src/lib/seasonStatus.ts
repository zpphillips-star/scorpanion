export type SeasonStatus = 'regular' | 'playoffs' | 'offseason' | 'preseason'

export interface SeasonMeta {
  status: SeasonStatus
  nextStartApprox: string | null // e.g. "October 2026"
  label: string
}

// Approximate next season start months per league
export const SEASON_START_MONTH: Record<string, string> = {
  mlb:  'April',
  nhl:  'October',
  nba:  'October',
  wnba: 'May',
  mls:  'February',
  nfl:  'September',
  // aliases
  'usa.1':    'February',
  'usa.nwsl': 'March',
  whl:        'October',
  pwhl:       'January',
}

export interface LeagueDisplayInfo {
  name: string
  emoji: string
}

export const LEAGUE_DISPLAY: Record<string, LeagueDisplayInfo> = {
  mlb:        { name: 'MLB',  emoji: '⚾' },
  nhl:        { name: 'NHL',  emoji: '🏒' },
  nba:        { name: 'NBA',  emoji: '🏀' },
  wnba:       { name: 'WNBA', emoji: '🏀' },
  nfl:        { name: 'NFL',  emoji: '🏈' },
  'usa.1':    { name: 'MLS',  emoji: '⚽' },
  'usa.nwsl': { name: 'NWSL', emoji: '⚽' },
  whl:        { name: 'WHL',  emoji: '🏒' },
  pwhl:       { name: 'PWHL', emoji: '🏒' },
  'college-football':          { name: 'College Football', emoji: '🏈' },
  'mens-college-basketball':   { name: 'College Basketball', emoji: '🏀' },
  'womens-college-basketball': { name: 'College Basketball', emoji: '🏀' },
  'college-baseball':          { name: 'College Baseball', emoji: '⚾' },
}

/**
 * Compute the approximate next season year for a league given the season year.
 * E.g. if NHL 2025-26 season just ended in June 2026, next season starts October 2026.
 */
export function getNextSeasonYear(leagueId: string, seasonYear: number): number {
  const month = new Date().getMonth() // 0-indexed
  const startMonth = SEASON_START_MONTH[leagueId] || ''
  // Sports that start in the fall (Aug-Dec): next season starts later this year or next year
  const fallStartLeagues = ['nhl', 'nba', 'nfl', 'college-football', 'mens-college-basketball',
    'womens-college-basketball', 'whl']
  if (fallStartLeagues.includes(leagueId)) {
    // If we're Jan-Jun, next season starts later this year
    // If we're Jul-Dec, next season starts next year
    return month >= 6 ? seasonYear + 1 : seasonYear
  }
  // Spring/summer start leagues: next season is same year or next
  return month >= 8 ? seasonYear + 1 : seasonYear
}

export function nextSeasonApprox(leagueId: string, seasonYear: number): string | null {
  const month = SEASON_START_MONTH[leagueId]
  if (!month) return null
  return `${month} ${getNextSeasonYear(leagueId, seasonYear)}`
}
