'use client'
import { useState } from 'react'
import { Game } from '@/lib/types'
import { SPORT_COLORS, getTeamLogoUrl } from '@/lib/teams'
import TeamLogo from './TeamLogo'

interface GameCardProps {
  game: Game
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function RecordBadge({ wins, losses, ties }: { wins: number; losses: number; ties?: number }) {
  const text = ties ? `${wins}-${losses}-${ties}` : `${wins}-${losses}`
  return <span className="text-gray-500 text-[10px] ml-1">({text})</span>
}

export default function GameCard({ game }: GameCardProps) {
  const [open, setOpen] = useState(false)
  const sportColor = SPORT_COLORS[game.sport] || '#888'
  const seattleLogoUrl = getTeamLogoUrl(game.seattleTeam)
  
  const scoreDisplay = game.status !== 'upcoming' && game.seattleScore !== undefined
    ? `${game.seattleScore} - ${game.opponentScore}`
    : null

  return (
    <>
      <div
        className="flex items-center gap-3 px-4 py-3 sm:px-5 sm:py-4 border-b border-white/5 cursor-pointer hover:bg-white/5 active:bg-white/10 transition-colors"
        onClick={() => setOpen(true)}
      >
        {/* Sport color dot */}
        <div
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ backgroundColor: sportColor }}
        />
        
        {/* Time/status */}
        <div className="w-16 flex-shrink-0 text-right">
          {game.status === 'live' ? (
            <span className="text-red-400 text-xs font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse inline-block" />
              LIVE
            </span>
          ) : game.status === 'ft' ? (
            <span className="text-gray-400 text-xs">FT</span>
          ) : (
            <span className="text-gray-300 text-xs">{formatTime(game.kickoff)}</span>
          )}
          {scoreDisplay && (
            <div className="text-white text-sm font-bold mt-0.5">{scoreDisplay}</div>
          )}
        </div>
        
        {/* Seattle team */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <TeamLogo src={seattleLogoUrl} emoji={game.seattleTeam.emoji} abbr={game.seattleTeam.abbr} size={28} />
          <div className="min-w-0">
            <div className="text-white text-sm font-medium truncate flex items-center">
              {game.seattleTeam.shortName}
              {game.seattleRecord && (
                <RecordBadge wins={game.seattleRecord.wins} losses={game.seattleRecord.losses} ties={game.seattleRecord.ties} />
              )}
            </div>
            <div className="text-gray-400 text-xs flex items-center">
              {game.isHome ? 'vs' : '@'} {game.opponent.shortName}
              {game.opponentRecord && (
                <RecordBadge wins={game.opponentRecord.wins} losses={game.opponentRecord.losses} ties={game.opponentRecord.ties} />
              )}
            </div>
          </div>
        </div>
        
        {/* Opponent logo */}
        <div className="flex-shrink-0">
          <TeamLogo src={game.opponent.logo} emoji="🏟️" abbr={game.opponent.abbr} size={28} />
        </div>
        
        {/* Chevron */}
        <svg className="w-4 h-4 text-gray-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
      
      {/* Detail sheet */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end"
          onClick={() => setOpen(false)}
        >
          <div className="absolute inset-0 bg-black/60" />
          <div
            className="relative w-full rounded-t-2xl overflow-hidden lg:max-w-2xl lg:mx-auto"
            style={{ background: '#0f0f1a' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div
              className="px-6 py-5"
              style={{
                background: `linear-gradient(135deg, ${game.seattleTeam.primaryColor}cc, ${game.seattleTeam.secondaryColor}44)`,
              }}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-white/80 text-sm">{formatDate(game.kickoff)}</span>
                <button onClick={() => setOpen(false)} className="text-white/60 hover:text-white">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="flex items-center gap-4 mt-2">
                <div className="flex items-center gap-2">
                  <TeamLogo src={seattleLogoUrl} emoji={game.seattleTeam.emoji} abbr={game.seattleTeam.abbr} size={40} />
                  <div>
                    <div className="text-white font-bold">{game.seattleTeam.name}</div>
                    {game.seattleRecord && (
                      <div className="text-white/60 text-xs">{game.seattleRecord.summary || `${game.seattleRecord.wins}-${game.seattleRecord.losses}`}</div>
                    )}
                    {game.seattleScore !== undefined && (
                      <div className="text-white text-2xl font-black">{game.seattleScore}</div>
                    )}
                  </div>
                </div>
                <div className="text-white/60 font-bold text-lg">{game.isHome ? 'VS' : '@'}</div>
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <div className="text-white font-bold">{game.opponent.name}</div>
                    {game.opponentRecord && (
                      <div className="text-white/60 text-xs text-right">{game.opponentRecord.summary || `${game.opponentRecord.wins}-${game.opponentRecord.losses}`}</div>
                    )}
                    {game.opponentScore !== undefined && (
                      <div className="text-white text-2xl font-black text-right">{game.opponentScore}</div>
                    )}
                  </div>
                  <TeamLogo src={game.opponent.logo} emoji="🏟️" abbr={game.opponent.abbr} size={40} />
                </div>
              </div>
            </div>
            
            {/* Details */}
            <div className="px-6 py-4 space-y-3 pb-8">
              <div className="flex items-center gap-2 text-gray-300 text-sm">
                <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                </svg>
                <span>{game.venue.name}{game.venue.city ? `, ${game.venue.city}` : ''}{game.venue.state ? `, ${game.venue.state}` : ''}</span>
              </div>
              {game.broadcast && (
                <div className="flex items-center gap-2 text-gray-300 text-sm">
                  <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <span>{game.broadcast}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-gray-300 text-sm">
                <span
                  className="w-3 h-3 rounded-full inline-block"
                  style={{ backgroundColor: sportColor }}
                />
                <span className="capitalize">{game.sport}</span>
                <span className="text-gray-500">·</span>
                <span className="text-gray-500 uppercase text-xs">{game.league}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-300 text-sm">
                <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>
                  {game.status === 'upcoming' ? formatTime(game.kickoff) : game.status === 'ft' ? 'Final' : 'Live'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
