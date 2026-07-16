/**
 * Hardcoded 2026 playoff date lookup per league.
 *
 * Bracket lock date: when the playoff field / seeding is locked.
 *   - If omitted or equal to regularSeasonEnd, they're the same event.
 * Playoff start date: first day of actual playoff games.
 * tbd: set true when 2026-27 dates are not yet announced; shows a "TBD" card.
 *
 * Sources / notes:
 *   MLB   – regular season ~Sep 28, Wild Card Oct 1, bracket locks end of RS
 *   NFL   – Week 18 ends ~Jan 4 2027, Wild Card weekend Jan 10-11 2027
 *   NBA   – 2025-26 season ended Apr 12, playoffs started Apr 19; 2026-27 TBD
 *   NHL   – 2025-26 regular season ended Apr 18, playoffs started Apr 19; 2026-27 TBD
 *   MLS   – regular season ~Oct 18, MLS Cup Playoffs start Nov 1 2026
 *   WNBA  – regular season ~Sep 14, playoffs start Sep 17 2026
 *   NWSL  – regular season ~Oct 25, NWSL playoffs start Nov 7 2026
 */
export interface PlayoffDateInfo {
  /** Last day of the regular season (YYYY-MM-DD) */
  regularSeasonEnd: string
  /** When the playoff field/seeding is locked. Only shown if it differs from regularSeasonEnd. */
  bracketLockDate?: string
  /** First day of playoff games (YYYY-MM-DD) */
  playoffStart: string
  /** Short label shown in the card, e.g. "Wild Card Round" */
  playoffLabel: string
  /** If true, the playoff start date for the upcoming season is not yet announced */
  tbd?: boolean
}

/** Keyed by the `league` field on the Game object (matches SeattleTeam.league). */
export const PLAYOFF_DATES: Record<string, PlayoffDateInfo> = {
  // ── MLB 2026 ────────────────────────────────────────────────────────────────
  mlb: {
    regularSeasonEnd: '2026-09-28',
    // Bracket locks same day regular season ends (no bracket-lock date needed)
    playoffStart: '2026-10-01',
    playoffLabel: 'Wild Card Round',
  },

  // ── NFL 2026-27 ─────────────────────────────────────────────────────────────
  nfl: {
    regularSeasonEnd: '2027-01-04',   // end of Week 18
    // Bracket (seedings) locks at end of Week 18 — same day
    playoffStart: '2027-01-10',       // Wild Card Saturday
    playoffLabel: 'Wild Card Weekend',
  },

  // ── NBA 2025-26 (current cycle; 2026-27 TBD) ─────────────────────────────
  // These dates are in the past — the card won't render once today > playoffStart.
  // We keep them so the data is complete. The 2026-27 entry is separate.
  nba: {
    regularSeasonEnd: '2026-04-12',
    playoffStart: '2026-04-19',
    playoffLabel: 'NBA Playoffs',
  },

  // ── NHL 2025-26 (current cycle; 2026-27 TBD) ─────────────────────────────
  nhl: {
    regularSeasonEnd: '2026-04-18',
    playoffStart: '2026-04-19',
    playoffLabel: 'NHL Playoffs',
  },

  // ── MLS 2026 ────────────────────────────────────────────────────────────────
  'usa.1': {
    regularSeasonEnd: '2026-10-18',
    playoffStart: '2026-11-01',
    playoffLabel: 'MLS Cup Playoffs',
  },

  // ── WNBA 2026 ───────────────────────────────────────────────────────────────
  wnba: {
    regularSeasonEnd: '2026-09-14',
    playoffStart: '2026-09-17',
    playoffLabel: 'WNBA Playoffs',
  },

  // ── NWSL 2026 ───────────────────────────────────────────────────────────────
  'usa.nwsl': {
    regularSeasonEnd: '2026-10-25',
    playoffStart: '2026-11-07',
    playoffLabel: 'NWSL Championship Series',
  },
}

/**
 * Returns the PlayoffDateInfo for a league only if the card should currently
 * be displayed — i.e., playoffs have not yet started.
 */
export function getActivePlayoffInfo(league: string, todayStr: string): PlayoffDateInfo | null {
  const info = PLAYOFF_DATES[league]
  if (!info) return null
  // Don't show the card once playoffs are underway
  if (todayStr >= info.playoffStart) return null
  return info
}

/** Format a YYYY-MM-DD date string for display, e.g. "Thu, Oct 1, 2026" */
export function formatPlayoffDate(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}
