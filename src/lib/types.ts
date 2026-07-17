export interface SeattleTeam {
  id: string
  name: string
  shortName: string
  abbr: string
  sport: string
  league: string
  espnId: string
  primaryColor: string
  secondaryColor: string
  emoji: string
  logoUrl?: string
  /** If true, never auto-seeded into the default selection — user must explicitly follow */
  optInOnly?: boolean
}

export interface TeamRecord {
  wins: number
  losses: number
  ties?: number
  summary?: string
}

export interface Opponent {
  id: string
  name: string
  shortName: string
  abbr: string
  logo: string
  record?: TeamRecord
}

export interface GameVenue {
  name: string
  city: string
  state?: string
}

export interface Game {
  id: string
  seattleTeamId: string
  seattleTeam: SeattleTeam
  isHome: boolean
  opponent: Opponent
  kickoff: string           // ISO string
  venue: GameVenue
  status: 'upcoming' | 'live' | 'ft'
  seattleScore?: number
  opponentScore?: number
  sport: string
  league: string
  seasonType?: string
  weekLabel?: string
  broadcast?: string
  seattleRecord?: TeamRecord
  opponentRecord?: TeamRecord
  clock?: string
  period?: string
}

export interface ScoreUpdate {
  gameId: string
  seattleTeamId: string
  seattleScore: number
  opponentScore: number
  status: 'upcoming' | 'live' | 'ft'
  clock?: string
  period?: string
}
