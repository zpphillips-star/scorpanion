/**
 * seasonDates.ts — Centralized season metadata for all supported leagues.
 *
 * Provides:
 *  • REGULAR_SEASON_START — approximate start date per league (YYYY-MM-DD)
 *  • OFFSEASON_DISPLAY    — label / detail / icon shown in off-season cards
 *  • getApproxNextSeason  — returns "Month YYYY" string for the next season start
 *
 * For playoff dates (regularSeasonEnd, playoffStart, etc.) see playoffDates.ts.
 * For league display names and season status logic see seasonStatus.ts.
 */

import { SEASON_START_MONTH } from './seasonStatus'

// ── Regular season approximate start dates (YYYY-MM-DD) ─────────────────────
// These are used for display purposes — not hard gates — so rough accuracy is fine.
export const REGULAR_SEASON_START: Record<string, string> = {
  mlb:          '2026-03-26',
  nfl:          '2026-09-10',
  nba:          '2026-10-22',
  nhl:          '2026-10-08',
  'usa.1':      '2026-02-28',   // MLS
  wnba:         '2026-05-16',
  'usa.nwsl':   '2026-03-14',   // NWSL
  whl:          '2026-09-19',
  pwhl:         '2027-01-08',
  'college-football':          '2026-08-29',
  'mens-college-basketball':   '2026-11-03',
  'womens-college-basketball': '2026-11-03',
  'college-baseball':          '2027-02-13',
}

// ── Off-season display info (used by Home and Schedule off-season cards) ─────
export interface OffseasonDisplay {
  /** Short headline for the "what comes next" card, e.g. "Spring Training" */
  label: string
  /** Supplemental detail, e.g. "Opens mid-February" */
  detail: string
  /** Single emoji representing the sport */
  icon: string
}

export const OFFSEASON_DISPLAY: Record<string, OffseasonDisplay> = {
  mlb:          { label: 'Spring Training',    detail: 'Opens mid-February',       icon: '⚾' },
  nfl:          { label: 'Training Camp',       detail: 'Opens late July',          icon: '🏈' },
  nba:          { label: 'New Season',          detail: 'Begins mid-October',       icon: '🏀' },
  nhl:          { label: 'New Season',          detail: 'Begins early October',     icon: '🏒' },
  'usa.1':      { label: 'New Season',          detail: 'Begins late February',     icon: '⚽' },  // MLS
  wnba:         { label: 'New Season',          detail: 'Begins mid-May',           icon: '🏀' },
  'usa.nwsl':   { label: 'New Season',          detail: 'Begins mid-March',         icon: '⚽' },  // NWSL
  'college-football':          { label: 'Fall Season', detail: 'Begins late August',    icon: '🏈' },
  'mens-college-basketball':   { label: 'New Season',  detail: 'Begins November',       icon: '🏀' },
  'womens-college-basketball': { label: 'New Season',  detail: 'Begins November',       icon: '🏀' },
  whl:          { label: 'New Season',          detail: 'Begins late September',    icon: '🏒' },
  pwhl:         { label: 'New Season',          detail: 'Begins January',           icon: '🏒' },
}

// ── Utility: approximate "Month YYYY" for next season ───────────────────────
/**
 * Returns a human-readable string like "October 2026" indicating when the
 * next season for this league is expected to start.
 *
 * Mirrors the logic previously duplicated in ScheduleClient.
 */
export function getApproxNextSeason(leagueId: string): string | null {
  const month = SEASON_START_MONTH[leagueId]
  if (!month) return null

  const now  = new Date()
  const m    = now.getMonth() // 0-indexed
  const year = now.getFullYear()

  // Fall-start leagues increment the year once we're past June
  const fallStart = [
    'nhl', 'nba', 'nfl', 'whl',
    'college-football',
    'mens-college-basketball',
    'womens-college-basketball',
  ]
  const nextYear = fallStart.includes(leagueId) && m >= 6 ? year + 1 : year
  return `${month} ${nextYear}`
}
