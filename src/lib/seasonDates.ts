/**
 * seasonDates.ts — Single source of truth for all league season dates.
 *
 * LEAGUE_SEASON contains the full calendar per league:
 *   regularStart    – first game of the regular season
 *   regularEnd      – last game of the regular season
 *   playoffStart    – first playoff game
 *   playoffEnd      – championship / finals end (last possible date)
 *   playoffLabel    – label for the first playoff round
 *   championship    – name of the championship event (e.g. "World Series")
 *   tbd             – true when the next season's dates aren't confirmed yet
 *
 * All dates are YYYY-MM-DD. Rough accuracy is fine for display — they are not
 * used as hard gates for live data fetching.
 *
 * For league display names / status logic see seasonStatus.ts.
 */

import { SEASON_START_MONTH } from './seasonStatus'

export interface LeagueSeason {
  regularStart:      string
  regularEnd:        string
  playoffStart:      string
  championshipStart: string   // when the championship round begins
  playoffEnd:        string
  playoffLabel:      string
  championship:      string
  tbd?:              boolean
  preseasonStart?:   string
  preseasonEnd?:     string
}

export const LEAGUE_SEASON: Record<string, LeagueSeason> = {
  // ── MLB 2026 ──────────────────────────────────────────────────────────────
  mlb: {
    preseasonStart:    '2026-02-12',  // Spring Training opens
    preseasonEnd:      '2026-03-25',
    regularStart:      '2026-03-26',
    regularEnd:        '2026-09-28',
    playoffStart:      '2026-10-01',  // Wild Card
    championshipStart: '2026-10-24',  // World Series begins
    playoffEnd:        '2026-11-04',  // World Series ends ~early Nov
    playoffLabel:      'Wild Card Round',
    championship:      'World Series',
  },

  // ── NFL 2026-27 ───────────────────────────────────────────────────────────
  nfl: {
    preseasonStart:    '2026-07-22',  // Training camp opens
    preseasonEnd:      '2026-09-08',
    regularStart:      '2026-09-10',
    regularEnd:        '2027-01-04',  // end of Week 18
    playoffStart:      '2027-01-10',  // Wild Card Weekend
    championshipStart: '2027-02-08',  // Super Bowl LXI
    playoffEnd:        '2027-02-08',
    playoffLabel:      'Wild Card Weekend',
    championship:      'Super Bowl LXI',
  },

  // ── NBA 2026-27 ───────────────────────────────────────────────────────────
  nba: {
    preseasonStart:    '2026-09-29',  // Training camp opens
    preseasonEnd:      '2026-10-21',
    regularStart:      '2026-10-22',
    regularEnd:        '2027-04-13',
    playoffStart:      '2027-04-19',
    championshipStart: '2027-06-05',  // NBA Finals begin ~early June
    playoffEnd:        '2027-06-22',
    playoffLabel:      'NBA Playoffs',
    championship:      'NBA Finals',
    tbd:               true,
  },

  // ── NHL 2026-27 ───────────────────────────────────────────────────────────
  nhl: {
    preseasonStart:    '2026-09-18',  // Training camp opens
    preseasonEnd:      '2026-10-07',
    regularStart:      '2026-10-08',
    regularEnd:        '2027-04-18',
    playoffStart:      '2027-04-19',
    championshipStart: '2027-06-02',  // Stanley Cup Finals begin ~early June
    playoffEnd:        '2027-06-20',
    playoffLabel:      'NHL Playoffs',
    championship:      'Stanley Cup Finals',
    tbd:               true,
  },

  // ── MLS 2026 ──────────────────────────────────────────────────────────────
  'usa.1': {
    preseasonStart:    '2026-02-01',
    preseasonEnd:      '2026-02-27',
    regularStart:      '2026-02-28',
    regularEnd:        '2026-10-18',
    playoffStart:      '2026-11-01',
    championshipStart: '2026-12-05',  // MLS Cup final weekend
    playoffEnd:        '2026-12-07',
    playoffLabel:      'MLS Cup Playoffs',
    championship:      'MLS Cup',
  },

  // ── WNBA 2026 ─────────────────────────────────────────────────────────────
  wnba: {
    preseasonStart:    '2026-05-01',
    preseasonEnd:      '2026-05-15',
    regularStart:      '2026-05-16',
    regularEnd:        '2026-09-14',
    playoffStart:      '2026-09-17',
    championshipStart: '2026-10-10',  // WNBA Finals begin ~mid Oct
    playoffEnd:        '2026-10-20',
    playoffLabel:      'WNBA Playoffs',
    championship:      'WNBA Finals',
  },

  // ── NWSL 2026 ─────────────────────────────────────────────────────────────
  'usa.nwsl': {
    preseasonStart:    '2026-02-15',
    preseasonEnd:      '2026-03-13',
    regularStart:      '2026-03-14',
    regularEnd:        '2026-10-25',
    playoffStart:      '2026-11-07',
    championshipStart: '2026-11-22',  // NWSL Championship
    playoffEnd:        '2026-11-22',
    playoffLabel:      'NWSL Playoffs',
    championship:      'NWSL Championship',
  },

  // ── WHL 2026-27 ───────────────────────────────────────────────────────────
  whl: {
    regularStart:      '2026-09-19',
    regularEnd:        '2027-03-21',
    playoffStart:      '2027-03-25',
    championshipStart: '2027-05-10',  // Ed Chynoweth Cup finals
    playoffEnd:        '2027-05-18',
    playoffLabel:      'WHL Playoffs',
    championship:      'Ed Chynoweth Cup',
    tbd:               true,
  },

  // ── PWHL 2026-27 ──────────────────────────────────────────────────────────
  pwhl: {
    regularStart:      '2027-01-08',
    regularEnd:        '2027-03-30',
    playoffStart:      '2027-04-05',
    championshipStart: '2027-05-01',  // PWHL Championship finals
    playoffEnd:        '2027-05-10',
    playoffLabel:      'PWHL Playoffs',
    championship:      'PWHL Championship',
    tbd:               true,
  },

  // ── PGA Tour 2025-26 ──────────────────────────────────────────────────────
  pga: {
    regularStart:      '2025-09-04',   // PGA Tour season starts early Sep
    regularEnd:        '2026-08-16',   // Regular season ends at Tour Championship
    playoffStart:      '2026-08-20',   // FedEx Cup Playoffs
    championshipStart: '2026-09-04',   // Tour Championship (final event)
    playoffEnd:        '2026-09-07',
    playoffLabel:      'FedEx Cup Playoffs',
    championship:      'FedEx Cup',
  },

  // ── LPGA Tour 2026 ────────────────────────────────────────────────────────
  lpga: {
    regularStart:      '2026-01-22',
    regularEnd:        '2026-10-25',
    playoffStart:      '2026-10-22',   // CME Group Tour Championship
    championshipStart: '2026-11-18',   // CME final tournament
    playoffEnd:        '2026-11-22',
    playoffLabel:      'Race to CME Globe',
    championship:      'CME Group Tour Championship',
  },
}

// ── Backward-compat: REGULAR_SEASON_START (used by standings API) ────────────
export const REGULAR_SEASON_START: Record<string, string> = Object.fromEntries(
  Object.entries(LEAGUE_SEASON).map(([k, v]) => [k, v.regularStart])
)

// ── Off-season display info (used by Home and Schedule off-season cards) ─────
export interface OffseasonDisplay {
  label:  string
  detail: string
  icon:   string
}

export const OFFSEASON_DISPLAY: Record<string, OffseasonDisplay> = {
  mlb:          { label: 'Spring Training',  detail: 'Opens mid-February',     icon: '⚾' },
  nfl:          { label: 'Training Camp',    detail: 'Opens late July',        icon: '🏈' },
  nba:          { label: 'New Season',       detail: 'Begins mid-October',     icon: '🏀' },
  nhl:          { label: 'New Season',       detail: 'Begins early October',   icon: '🏒' },
  'usa.1':      { label: 'New Season',       detail: 'Begins late February',   icon: '⚽' },
  wnba:         { label: 'New Season',       detail: 'Begins mid-May',         icon: '🏀' },
  'usa.nwsl':   { label: 'New Season',       detail: 'Begins mid-March',       icon: '⚽' },
  'college-football':          { label: 'Fall Season', detail: 'Begins late August',  icon: '🏈' },
  'mens-college-basketball':   { label: 'New Season',  detail: 'Begins November',     icon: '🏀' },
  'womens-college-basketball': { label: 'New Season',  detail: 'Begins November',     icon: '🏀' },
  whl:          { label: 'New Season',       detail: 'Begins late September',  icon: '🏒' },
  pwhl:         { label: 'New Season',       detail: 'Begins January',         icon: '🏒' },
}

// ── Utility helpers ──────────────────────────────────────────────────────────

/** Format a YYYY-MM-DD date as "Month D" (no year), e.g. "Sep 28" */
export function fmtShort(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

/** Format a YYYY-MM-DD date as "Month D, YYYY", e.g. "September 10, 2026" */
export function fmtFull(iso: string): string {
  const d = new Date(iso + 'T12:00:00Z')
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
}

/**
 * Returns a human-readable string like "October 2026" indicating when the
 * next season for this league is expected to start.
 */
export function getApproxNextSeason(leagueId: string): string | null {
  const month = SEASON_START_MONTH[leagueId]
  if (!month) return null

  const now  = new Date()
  const m    = now.getMonth() // 0-indexed
  const year = now.getFullYear()

  const fallStart = [
    'nhl', 'nba', 'nfl', 'whl',
    'college-football',
    'mens-college-basketball',
    'womens-college-basketball',
  ]
  const nextYear = fallStart.includes(leagueId) && m >= 6 ? year + 1 : year
  return `${month} ${nextYear}`
}

