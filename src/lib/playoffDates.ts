/**
 * playoffDates.ts — Re-exports and helpers derived from LEAGUE_SEASON.
 *
 * PlayoffDateInfo is kept for backward compatibility with any components
 * that import it directly. New code should prefer LEAGUE_SEASON from seasonDates.ts.
 */
import { LEAGUE_SEASON } from './seasonDates'

export interface PlayoffDateInfo {
  regularSeasonEnd:  string
  bracketLockDate?:  string
  playoffStart:      string
  playoffEnd:        string
  playoffLabel:      string
  championship:      string
  tbd?:              boolean
}

/** Keyed by the `league` field on the Game object (matches SeattleTeam.league). */
export const PLAYOFF_DATES: Record<string, PlayoffDateInfo> = Object.fromEntries(
  Object.entries(LEAGUE_SEASON).map(([league, s]) => [
    league,
    {
      regularSeasonEnd: s.regularEnd,
      playoffStart:     s.playoffStart,
      playoffEnd:       s.playoffEnd,
      playoffLabel:     s.playoffLabel,
      championship:     s.championship,
      tbd:              s.tbd,
    } satisfies PlayoffDateInfo,
  ])
)

/**
 * Returns the PlayoffDateInfo for a league only if the card should currently
 * be displayed — i.e., playoffs have not yet started.
 */
export function getActivePlayoffInfo(league: string, todayStr: string): PlayoffDateInfo | null {
  const info = PLAYOFF_DATES[league]
  if (!info) return null
  if (todayStr >= info.playoffStart) return null
  return info
}

/** Format a YYYY-MM-DD date string for display, e.g. "Thu, Oct 1, 2026" */
export function formatPlayoffDate(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    weekday: 'short',
    month:   'short',
    day:     'numeric',
    year:    'numeric',
  })
}

