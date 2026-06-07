import { SeattleTeam } from './types'

export const SEATTLE_TEAMS: SeattleTeam[] = [
  // NFL
  { id: 'seahawks', name: 'Seattle Seahawks', shortName: 'Seahawks', abbr: 'SEA', 
    sport: 'football', league: 'nfl', espnId: '26',
    primaryColor: '#002244', secondaryColor: '#69BE28', emoji: '🏈' },
  // MLB
  { id: 'mariners', name: 'Seattle Mariners', shortName: 'Mariners', abbr: 'SEA',
    sport: 'baseball', league: 'mlb', espnId: '21',
    primaryColor: '#0C2C56', secondaryColor: '#005C5C', emoji: '⚾' },
  // NHL
  { id: 'kraken', name: 'Seattle Kraken', shortName: 'Kraken', abbr: 'SEA',
    sport: 'hockey', league: 'nhl', espnId: '55',
    primaryColor: '#001628', secondaryColor: '#99D9D9', emoji: '🏒' },
  // MLS
  { id: 'sounders', name: 'Seattle Sounders FC', shortName: 'Sounders', abbr: 'SEA',
    sport: 'soccer', league: 'usa.1', espnId: '9',
    primaryColor: '#5D9732', secondaryColor: '#002244', emoji: '⚽' },
  // NWSL
  { id: 'reign', name: 'Seattle Reign FC', shortName: 'Reign', abbr: 'SEA',
    sport: 'soccer', league: 'nwsl', espnId: '19',
    primaryColor: '#5D2D91', secondaryColor: '#FFFFFF', emoji: '⚽' },
  // WNBA — verified: ESPN ID 14 returns Seattle Storm schedule (46 events)
  { id: 'storm', name: 'Seattle Storm', shortName: 'Storm', abbr: 'SEA',
    sport: 'basketball', league: 'wnba', espnId: '14',
    primaryColor: '#2C5235', secondaryColor: '#FEF200', emoji: '🏀' },
  // College Football
  { id: 'uw-football', name: 'Washington Huskies', shortName: 'Huskies', abbr: 'UW',
    sport: 'football', league: 'college-football', espnId: '264',
    primaryColor: '#33006F', secondaryColor: '#B7A57A', emoji: '🏈' },
  // UW Men's Basketball
  { id: 'uw-basketball', name: 'Washington Huskies', shortName: 'Huskies (MBB)', abbr: 'UW',
    sport: 'basketball', league: 'mens-college-basketball', espnId: '264',
    primaryColor: '#33006F', secondaryColor: '#B7A57A', emoji: '🏀' },
  // UW Women's Basketball — verified: ID 264 returns 33 events
  { id: 'uw-wbb', name: 'Washington Huskies', shortName: 'Huskies (WBB)', abbr: 'UW',
    sport: 'basketball', league: 'womens-college-basketball', espnId: '264',
    primaryColor: '#33006F', secondaryColor: '#B7A57A', emoji: '🏀' },
  // UW Volleyball — verified: ID 264 returns 30 events
  { id: 'uw-volleyball', name: 'Washington Huskies', shortName: 'Huskies (VB)', abbr: 'UW',
    sport: 'volleyball', league: 'womens-college-volleyball', espnId: '264',
    primaryColor: '#33006F', secondaryColor: '#B7A57A', emoji: '🏐' },
  // UW Baseball — verified: ID 133 returns 57 events
  { id: 'uw-baseball', name: 'Washington Huskies', shortName: 'Huskies (BB)', abbr: 'UW',
    sport: 'baseball', league: 'college-baseball', espnId: '133',
    primaryColor: '#33006F', secondaryColor: '#B7A57A', emoji: '⚾' },
  // WSU Football
  { id: 'wsu-football', name: 'Washington State Cougars', shortName: 'Cougars', abbr: 'WSU',
    sport: 'football', league: 'college-football', espnId: '265',
    primaryColor: '#981E32', secondaryColor: '#C0C0C0', emoji: '🏈' },
  // WSU Women's Basketball — verified: ID 265 returns 34 events
  { id: 'wsu-wbb', name: 'Washington State Cougars', shortName: 'Cougars (WBB)', abbr: 'WSU',
    sport: 'basketball', league: 'womens-college-basketball', espnId: '265',
    primaryColor: '#981E32', secondaryColor: '#C0C0C0', emoji: '🏀' },
  // WSU Baseball — verified: ID 134 returns 31 events
  { id: 'wsu-baseball', name: 'Washington State Cougars', shortName: 'Cougars (BB)', abbr: 'WSU',
    sport: 'baseball', league: 'college-baseball', espnId: '134',
    primaryColor: '#981E32', secondaryColor: '#C0C0C0', emoji: '⚾' },
  // Seattle University — verified: ID 2547 returns 33 events
  { id: 'seattleu', name: 'Seattle University Redhawks', shortName: 'Redhawks', abbr: 'SU',
    sport: 'basketball', league: 'mens-college-basketball', espnId: '2547',
    primaryColor: '#AA0000', secondaryColor: '#FFFFFF', emoji: '🏀' },
]

export const SPORT_COLORS: Record<string, string> = {
  football: '#4CAF50',
  baseball: '#2196F3',
  hockey: '#00BCD4',
  soccer: '#FFC107',
  basketball: '#FF9800',
  volleyball: '#E91E63',
}

export function getTeamLogoUrl(team: SeattleTeam): string {
  switch (team.id) {
    case 'seahawks': return 'https://a.espncdn.com/i/teamlogos/nfl/500/sea.png'
    case 'mariners': return 'https://a.espncdn.com/i/teamlogos/mlb/500/sea.png'
    case 'kraken': return 'https://a.espncdn.com/i/teamlogos/nhl/500/sea.png'
    case 'sounders': return 'https://a.espncdn.com/i/teamlogos/soccer/500/9.png'
    case 'reign': return 'https://a.espncdn.com/i/teamlogos/soccer/500/19.png'
    case 'storm': return 'https://a.espncdn.com/i/teamlogos/wnba/500/sea.png'
    case 'uw-football':
    case 'uw-basketball':
    case 'uw-wbb':
    case 'uw-volleyball':
    case 'uw-baseball': return 'https://a.espncdn.com/i/teamlogos/ncaa/500/264.png'
    case 'wsu-football':
    case 'wsu-wbb':
    case 'wsu-baseball': return 'https://a.espncdn.com/i/teamlogos/ncaa/500/265.png'
    case 'seattleu': return 'https://a.espncdn.com/i/teamlogos/ncaa/500/2547.png'
    default: return ''
  }
}
