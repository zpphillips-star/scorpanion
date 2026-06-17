'use client'
import { useEffect, useRef, useState } from 'react'

interface Tile { abbr: string; col: number; row: number }
interface Props {
  selectedState: string | null
  onStateSelect: (abbr: string) => void
  teamsPerState: Record<string, number>
}

const US_TILES: Tile[] = [
  { abbr: 'AK', col: 0, row: 0 }, { abbr: 'ME', col: 10, row: 0 },
  { abbr: 'WA', col: 0, row: 1 }, { abbr: 'MT', col: 1, row: 1 }, { abbr: 'ND', col: 2, row: 1 }, { abbr: 'MN', col: 3, row: 1 }, { abbr: 'WI', col: 5, row: 1 }, { abbr: 'MI', col: 6, row: 1 }, { abbr: 'VT', col: 9, row: 1 }, { abbr: 'NH', col: 10, row: 1 },
  { abbr: 'OR', col: 0, row: 2 }, { abbr: 'ID', col: 1, row: 2 }, { abbr: 'SD', col: 2, row: 2 }, { abbr: 'NE', col: 3, row: 2 }, { abbr: 'IA', col: 4, row: 2 }, { abbr: 'IL', col: 5, row: 2 }, { abbr: 'IN', col: 6, row: 2 }, { abbr: 'OH', col: 7, row: 2 }, { abbr: 'PA', col: 8, row: 2 }, { abbr: 'NY', col: 9, row: 2 }, { abbr: 'MA', col: 10, row: 2 }, { abbr: 'RI', col: 11, row: 2 },
  { abbr: 'CA', col: 0, row: 3 }, { abbr: 'NV', col: 1, row: 3 }, { abbr: 'WY', col: 2, row: 3 }, { abbr: 'CO', col: 3, row: 3 }, { abbr: 'KS', col: 4, row: 3 }, { abbr: 'MO', col: 5, row: 3 }, { abbr: 'KY', col: 6, row: 3 }, { abbr: 'WV', col: 7, row: 3 }, { abbr: 'VA', col: 8, row: 3 }, { abbr: 'MD', col: 9, row: 3 }, { abbr: 'NJ', col: 10, row: 3 }, { abbr: 'CT', col: 11, row: 3 }, { abbr: 'DE', col: 12, row: 3 },
  { abbr: 'AZ', col: 1, row: 4 }, { abbr: 'NM', col: 2, row: 4 }, { abbr: 'OK', col: 3, row: 4 }, { abbr: 'AR', col: 4, row: 4 }, { abbr: 'TN', col: 5, row: 4 }, { abbr: 'NC', col: 6, row: 4 }, { abbr: 'SC', col: 7, row: 4 }, { abbr: 'DC', col: 9, row: 4 },
  { abbr: 'TX', col: 3, row: 5 }, { abbr: 'LA', col: 4, row: 5 }, { abbr: 'MS', col: 5, row: 5 }, { abbr: 'AL', col: 6, row: 5 }, { abbr: 'GA', col: 7, row: 5 },
  { abbr: 'FL', col: 6, row: 6 },
  { abbr: 'HI', col: 1, row: 7 },
]

const CANADA = ['BC', 'AB', 'SK', 'MB', 'ON', 'QC', 'NB', 'NS', 'PE', 'NL']
const COLS = 13

export default function USCanadaMap({ selectedState, onStateSelect, teamsPerState }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [sz, setSz] = useState(24)
  const GAP = 2

  useEffect(() => {
    const measure = () => {
      if (!ref.current) return
      const w = ref.current.clientWidth
      setSz(Math.max(18, Math.floor((w - GAP * (COLS - 1)) / COLS)))
    }
    measure()
    const ro = new ResizeObserver(measure)
    if (ref.current) ro.observe(ref.current)
    return () => ro.disconnect()
  }, [])

  const fs = Math.max(6, Math.floor(sz * 0.33))
  const canadaSz = Math.floor((sz * COLS + GAP * (COLS - 1) - GAP * (CANADA.length - 1)) / CANADA.length)

  const style = (abbr: string): React.CSSProperties => {
    const has = (teamsPerState[abbr] || 0) > 0
    const sel = selectedState === abbr
    if (sel) return { background: 'rgba(0,212,255,0.25)', border: '2px solid #00d4ff', color: '#00d4ff', boxShadow: '0 0 6px rgba(0,212,255,0.5)' }
    if (has) return { background: 'rgba(255,255,255,0.13)', border: '1px solid rgba(255,255,255,0.22)', color: '#e5e7eb' }
    return { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', color: '#374151' }
  }

  const base = (w: number, h: number): React.CSSProperties => ({
    width: w, height: h, borderRadius: 4, fontSize: fs, fontWeight: 700,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', userSelect: 'none', flexShrink: 0, letterSpacing: '0.01em',
    transition: 'all 0.1s',
  })

  return (
    <div ref={ref} style={{ width: '100%' }}>
      <div style={{ marginBottom: 4 }}>
        <div style={{ fontSize: 8, color: '#4b5563', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 3 }}>Canada</div>
        <div style={{ display: 'flex', gap: GAP }}>
          {CANADA.map(a => (
            <button key={a} onClick={() => onStateSelect(a)} style={{ ...base(canadaSz, sz), ...style(a) }}>{a}</button>
          ))}
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${COLS}, ${sz}px)`, gap: GAP }}>
        {US_TILES.map(t => (
          <button key={t.abbr} onClick={() => onStateSelect(t.abbr)}
            style={{ ...base(sz, sz), ...style(t.abbr), gridColumn: t.col + 1, gridRow: t.row + 1 }}>
            {t.abbr}
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 12, marginTop: 8, fontSize: 10 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ display: 'inline-block', width: 9, height: 9, borderRadius: 2, background: 'rgba(255,255,255,0.13)', border: '1px solid rgba(255,255,255,0.2)' }} />
          <span style={{ color: '#9ca3af' }}>Has teams</span>
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ display: 'inline-block', width: 9, height: 9, borderRadius: 2, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }} />
          <span style={{ color: '#4b5563' }}>No teams</span>
        </span>
      </div>
    </div>
  )
}
