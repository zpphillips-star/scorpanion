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
  // Source: MLB official schedule
  // Opening Night: Mar 25 (SF @ NYY). Opening Day (full slate): Mar 26.
  // Wild Card: Sep 29. World Series Game 1: Oct 23, Game 7: Oct 31.
  mlb: {
    preseasonStart:    '2026-02-20',  // Spring Training games begin
    preseasonEnd:      '2026-03-24',  // Day before Opening Night
    regularStart:      '2026-03-26',  // Opening Day (full slate)
    regularEnd:        '2026-09-27',  // Last day of regular season
    playoffStart:      '2026-09-29',  // Wild Card Round begins
    championshipStart: '2026-10-23',  // World Series Game 1
    playoffEnd:        '2026-10-31',  // World Series Game 7 (if needed)
    playoffLabel:      'Wild Card Round',
    championship:      'World Series',
  },

  // ── NFL 2026-27 ───────────────────────────────────────────────────────────
  // Source: NFL official calendar
  // Kickoff: Sep 9 (Patriots @ Seahawks). Regular season ends Week 18: Jan 10, 2027.
  // Wild Card: Jan 16-18. Divisional: Jan 23-24. Conf. Champs: Jan 31.
  // Super Bowl LXI: Feb 14, 2027 (Valentine's Day) at SoFi Stadium, Inglewood CA.
  nfl: {
    preseasonStart:    '2026-07-22',  // Training camp opens (~varies by team)
    preseasonEnd:      '2026-09-07',  // Last preseason game (~Labor Day weekend)
    regularStart:      '2026-09-09',  // NFL Kickoff (Patriots @ Seahawks)
    regularEnd:        '2027-01-10',  // Week 18 final games
    playoffStart:      '2027-01-16',  // Wild Card Weekend (Sat)
    championshipStart: '2027-02-14',  // Super Bowl LXI — Valentine's Day
    playoffEnd:        '2027-02-14',
    playoffLabel:      'Wild Card Weekend',
    championship:      'Super Bowl LXI',
  },

  // ── NBA 2026-27 ───────────────────────────────────────────────────────────
  // Source: NBA official (partial). Regular season start TBD (schedule releases Aug 2026).
  // Preseason international games in Macau: Oct 9-11.
  // All-Star: Feb 21, 2027 (Phoenix). NBA Finals: ~June 2027.
  nba: {
    preseasonStart:    '2026-09-28',  // Training camp opens
    preseasonEnd:      '2026-10-18',  // Approx end of preseason
    regularStart:      '2026-10-22',  // Approx — official date TBD
    regularEnd:        '2027-04-12',  // Approx
    playoffStart:      '2027-04-18',  // Approx (Play-In: Apr 14-17)
    championshipStart: '2027-06-05',  // NBA Finals begin ~early June
    playoffEnd:        '2027-06-22',  // NBA Finals end ~late June
    playoffLabel:      'NBA Playoffs',
    championship:      'NBA Finals',
    tbd:               true,
  },

  // ── NHL 2026-27 ───────────────────────────────────────────────────────────
  // Source: NHL official. NEW: 84-game regular season (first since 1993-94).
  // Season opens Sep 29. Heritage Classic: Oct 25. Winter Classic: Dec 31.
  // All-Star: Feb 7, 2027. Regular season ends Apr 10, 2027.
  nhl: {
    preseasonStart:    '2026-09-17',  // Training camp opens
    preseasonEnd:      '2026-09-28',  // Day before regular season
    regularStart:      '2026-09-29',  // Official puck drop (84-game season)
    regularEnd:        '2027-04-10',  // Official end of regular season
    playoffStart:      '2027-04-12',  // Approx (day after season ends)
    championshipStart: '2027-06-02',  // Stanley Cup Finals begin ~early June
    playoffEnd:        '2027-06-22',  // Stanley Cup Finals end ~late June
    playoffLabel:      'NHL Playoffs',
    championship:      'Stanley Cup Finals',
    tbd:               true,
  },

  // ── MLS 2026 ──────────────────────────────────────────────────────────────
  // Source: MLS official. LAST spring-fall season (shifts to summer-spring 2027-28).
  // 7-week World Cup break: May 25 – Jul 16. Decision Day: Nov 7.
  // MLS Cup Final: Dec 18.
  'usa.1': {
    preseasonStart:    '2026-02-01',  // Approx preseason start
    preseasonEnd:      '2026-02-20',  // Day before regular season
    regularStart:      '2026-02-21',  // Official MLS season opener
    regularEnd:        '2026-11-07',  // Decision Day
    playoffStart:      '2026-11-18',  // MLS Cup Playoffs begin
    championshipStart: '2026-12-18',  // MLS Cup Final
    playoffEnd:        '2026-12-18',
    playoffLabel:      'MLS Cup Playoffs',
    championship:      'MLS Cup',
  },

  // ── WNBA 2026 ─────────────────────────────────────────────────────────────
  // Source: WNBA official. 15-team season (Portland Fire + Toronto Tempo debut).
  // Preseason: Apr 25. Regular season: May 8. Finals window ends Sep 24.
  wnba: {
    preseasonStart:    '2026-04-25',  // Preseason begins
    preseasonEnd:      '2026-05-07',  // Day before regular season
    regularStart:      '2026-05-08',  // Official regular season opener
    regularEnd:        '2026-09-06',  // Approx regular season end (before playoffs)
    playoffStart:      '2026-09-10',  // Approx playoffs begin
    championshipStart: '2026-09-18',  // WNBA Finals begin ~mid-Sep
    playoffEnd:        '2026-09-24',  // Official window closes
    playoffLabel:      'WNBA Playoffs',
    championship:      'WNBA Finals',
  },

  // ── NWSL 2026 ─────────────────────────────────────────────────────────────
  // Source: NWSL official schedule.
  // Regular season: Mar 13 – Nov 1. Playoffs: Nov 6. Championship: Nov 21.
  'usa.nwsl': {
    preseasonStart:    '2026-02-15',  // Approx preseason / camp start
    preseasonEnd:      '2026-03-12',  // Day before regular season
    regularStart:      '2026-03-13',  // Official regular season opener
    regularEnd:        '2026-11-01',  // Regular season ends
    playoffStart:      '2026-11-06',  // NWSL Playoffs begin
    championshipStart: '2026-11-21',  // NWSL Championship
    playoffEnd:        '2026-11-21',
    playoffLabel:      'NWSL Playoffs',
    championship:      'NWSL Championship',
  },

  // ── WHL 2026-27 ───────────────────────────────────────────────────────────
  // Source: WHL official schedule (confirmed).
  // Preseason: Aug 30. Regular season: Sep 18 – Mar 28. Playoffs: Mar 31.
  // Ed Chynoweth Cup: May 7-17. Memorial Cup (Guelph): May 21-30.
  whl: {
    preseasonStart:    '2026-08-30',  // First preseason game
    preseasonEnd:      '2026-09-17',  // Day before regular season
    regularStart:      '2026-09-18',  // Regular season opens
    regularEnd:        '2027-03-28',  // Regular season ends
    playoffStart:      '2027-03-31',  // WHL Playoffs begin
    championshipStart: '2027-05-07',  // Ed Chynoweth Cup (WHL Final) begins
    playoffEnd:        '2027-05-17',  // Ed Chynoweth Cup ends
    playoffLabel:      'WHL Playoffs',
    championship:      'Ed Chynoweth Cup',
  },

  // ── PWHL 2026-27 ──────────────────────────────────────────────────────────
  // Source: PWHL (schedule NOT yet released as of Jul 2026).
  // League expanding from 8 → 12 teams (Detroit, Hamilton, Las Vegas, San Jose).
  // Official schedule expected Aug–Oct 2026. All dates are projections.
  pwhl: {
    regularStart:      '2026-11-21',  // Projected — TBD
    regularEnd:        '2027-04-06',  // Projected — TBD
    playoffStart:      '2027-04-10',  // Projected — TBD
    championshipStart: '2027-05-15',  // Walter Cup Finals — projected
    playoffEnd:        '2027-05-25',  // Projected — TBD
    playoffLabel:      'PWHL Playoffs',
    championship:      'Walter Cup',
    tbd:               true,
  },

  // ── PGA Tour 2026 ─────────────────────────────────────────────────────────
  // Source: PGA Tour official. Calendar-year 2026 season.
  // Note: The Sentry was canceled Oct 2025 — Sony Open (Jan 15) is the real opener.
  // Majors: Masters Apr 9-12, PGA Champ May 14-17, US Open Jun 18-21, Open Jul 16-19.
  // FedEx Playoffs: St. Jude Aug 13-16, BMW Aug 20-23, Tour Championship Aug 27-30.
  pga: {
    regularStart:      '2026-01-15',  // Sony Open (true 2026 season opener)
    regularEnd:        '2026-08-09',  // Last event before FedEx Playoffs
    playoffStart:      '2026-08-13',  // FedEx St. Jude (Playoff #1)
    championshipStart: '2026-08-27',  // Tour Championship (FedEx Cup Final)
    playoffEnd:        '2026-08-30',  // Tour Championship ends
    playoffLabel:      'FedEx Cup Playoffs',
    championship:      'FedEx Cup',
  },

  // ── LPGA Tour 2026 ────────────────────────────────────────────────────────
  // Source: LPGA official. 31 events, $132M purse.
  // Season opener: HGV Tournament of Champions Jan 29 – Feb 1.
  // Majors: Chevron Apr 23-26, US Women's Open Jun 4-7, KPMG Jun 25-28,
  //         Evian Jul 9-12, AIG Women's Open Jul 30 – Aug 2.
  // Solheim Cup (Netherlands): Sep 11-13.
  // Season finale: CME Group Tour Championship Nov 19-22.
  lpga: {
    regularStart:      '2026-01-29',  // HGV Tournament of Champions
    regularEnd:        '2026-11-15',  // Last event before CME finale
    playoffStart:      '2026-11-19',  // CME Group Tour Championship begins
    championshipStart: '2026-11-19',  // Same event = playoff + championship
    playoffEnd:        '2026-11-22',  // CME Group Tour Championship ends
    playoffLabel:      'Race to CME Globe',
    championship:      'CME Tour Championship',
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

