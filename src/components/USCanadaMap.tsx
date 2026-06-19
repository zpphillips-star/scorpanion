'use client'
import { useState } from 'react'
import { ComposableMap, Geographies, Geography, GeoFeature } from 'react-simple-maps'

interface Props {
  selectedState: string | null
  onStateSelect: (abbr: string) => void
  teamsPerState: Record<string, number>
}

// US states TopoJSON from CDN (includes AK + HI as insets via geoAlbersUsa)
const US_GEO = 'https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json'

// FIPS numeric ID → state abbreviation
const FIPS_TO_ABBR: Record<string, string> = {
  '01':'AL','02':'AK','04':'AZ','05':'AR','06':'CA','08':'CO','09':'CT',
  '10':'DE','11':'DC','12':'FL','13':'GA','15':'HI','16':'ID','17':'IL',
  '18':'IN','19':'IA','20':'KS','21':'KY','22':'LA','23':'ME','24':'MD',
  '25':'MA','26':'MI','27':'MN','28':'MS','29':'MO','30':'MT','31':'NE',
  '32':'NV','33':'NH','34':'NJ','35':'NM','36':'NY','37':'NC','38':'ND',
  '39':'OH','40':'OK','41':'OR','42':'PA','44':'RI','45':'SC','46':'SD',
  '47':'TN','48':'TX','49':'UT','50':'VT','51':'VA','53':'WA','54':'WV',
  '55':'WI','56':'WY',
}

// Canada province buttons (keep as a simple pill row — no free TopoJSON needed)
const CANADA_PROVINCES = [
  { abbr: 'BC', label: 'BC' },
  { abbr: 'AB', label: 'AB' },
  { abbr: 'SK', label: 'SK' },
  { abbr: 'MB', label: 'MB' },
  { abbr: 'ON', label: 'ON' },
  { abbr: 'QC', label: 'QC' },
  { abbr: 'NB', label: 'NB' },
  { abbr: 'NS', label: 'NS' },
  { abbr: 'PE', label: 'PE' },
  { abbr: 'NL', label: 'NL' },
]

function getFill(abbr: string, selected: string | null, teamsPerState: Record<string, number>): string {
  if (selected === abbr) return 'rgba(0,212,255,0.28)'
  if ((teamsPerState[abbr] || 0) > 0) return 'rgba(255,255,255,0.11)'
  return 'rgba(255,255,255,0.03)'
}

function getStroke(abbr: string, selected: string | null): string {
  if (selected === abbr) return '#00d4ff'
  return 'rgba(255,255,255,0.15)'
}

function getHoverFill(abbr: string, selected: string | null, teamsPerState: Record<string, number>): string {
  if (selected === abbr) return 'rgba(0,212,255,0.35)'
  if ((teamsPerState[abbr] || 0) > 0) return 'rgba(255,255,255,0.2)'
  return 'rgba(255,255,255,0.09)'
}

// react-simple-maps v3 spreads extra props onto the underlying <svg>, but
// ComposableMapProps doesn't declare viewBox.  Cast to let TypeScript through.
type ComposableMapWithViewBox = React.ComponentType<
  React.ComponentProps<typeof ComposableMap> & { viewBox?: string }
>
const ComposableMapVB = ComposableMap as ComposableMapWithViewBox

// ─── East coast zoom ─────────────────────────────────────────────────────────
const VIEWBOX_FULL     = '0 0 800 450'
const VIEWBOX_EAST     = '540 15 265 295'  // crops to east coast TN-northward

// States that are too small to tap at full zoom.
// Rule: TN and north, eastern half only. Everything south of TN or west → select directly.
const ZOOM_STATES = new Set([
  // New England (tiny)
  'ME','NH','VT','MA','RI','CT',
  // Mid-Atlantic (small)
  'NY','NJ','PA','DE','MD','DC',
  // Upper South / Appalachia (still small on screen)
  'VA','WV','KY','TN',
  // Great Lakes (hard to distinguish borders)
  'OH','IN','MI',
])


export default function USCanadaMap({ selectedState, onStateSelect, teamsPerState }: Props) {
  const [hoveredState, setHoveredState] = useState<string | null>(null)
  const [neZoom, setNeZoom]             = useState(false)

  const provinceStyle = (abbr: string): React.CSSProperties => {
    const has = (teamsPerState[abbr] || 0) > 0
    const sel = selectedState === abbr
    if (sel) return {
      background: 'rgba(0,212,255,0.25)', border: '2px solid #00d4ff',
      color: '#00d4ff', boxShadow: '0 0 6px rgba(0,212,255,0.45)',
    }
    if (has) return {
      background: 'rgba(255,255,255,0.11)', border: '1px solid rgba(255,255,255,0.22)',
      color: '#e5e7eb',
    }
    return {
      background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
      color: '#4b5563',
    }
  }

  return (
    <div style={{ width: '100%' }}>
      {/* Canada province pill row */}
      <div style={{ marginBottom: 6 }}>
        <div style={{
          fontSize: 9, color: '#4b5563', fontWeight: 700,
          letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4,
        }}>
          Canada
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
          {CANADA_PROVINCES.map(({ abbr, label }) => (
            <button
              key={abbr}
              onClick={() => onStateSelect(abbr)}
              style={{
                padding: '3px 7px',
                borderRadius: 4,
                fontSize: 10,
                fontWeight: 700,
                cursor: 'pointer',
                userSelect: 'none',
                transition: 'all 0.1s',
                letterSpacing: '0.01em',
                ...provinceStyle(abbr),
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Real geographic US SVG map */}
      <div style={{ width: '100%', position: 'relative' }}>
        {/* Glow filter for selected state */}
        <svg width="0" height="0" style={{ position: 'absolute' }}>
          <defs>
            <filter id="state-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
        </svg>

        {/* NE zoom label — only visible when zoomed */}
        {neZoom && (
          <div style={{
            position: 'absolute', top: 6, left: 8, zIndex: 2,
            fontSize: 9, fontWeight: 700, letterSpacing: '0.07em',
            textTransform: 'uppercase', color: '#00d4ff',
            pointerEvents: 'none',
          }}>
            East coast — tap a state · tap outside to zoom out
          </div>
        )}

        <ComposableMapVB
          projection="geoAlbersUsa"
          projectionConfig={{ scale: 1000 }}
          /* viewBox crop drives the zoom — no projection change needed */
          viewBox={neZoom ? VIEWBOX_EAST : VIEWBOX_FULL}
          style={{ width: '100%', height: 'auto', display: 'block' }}
        >
          <Geographies geography={US_GEO}>
            {({ geographies }: { geographies: GeoFeature[] }) =>
              geographies.map((geo) => {
                const abbr = FIPS_TO_ABBR[geo.id] ?? ''
                const isSelected = selectedState === abbr
                const isHovered = hoveredState === abbr
                const hasTeams = (teamsPerState[abbr] || 0) > 0

                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    onClick={() => {
                      if (!abbr) return
                      if (neZoom) {
                        // While zoomed: tapping outside the colonies region zooms back out
                        if (!ZOOM_STATES.has(abbr)) {
                          setNeZoom(false)
                        } else {
                          onStateSelect(abbr)
                        }
                      } else {
                        // Not zoomed: tapping a small colonies state zooms in first
                        if (ZOOM_STATES.has(abbr)) {
                          setNeZoom(true)
                        } else {
                          onStateSelect(abbr)
                        }
                      }
                    }}
                    onMouseEnter={() => setHoveredState(abbr)}
                    onMouseLeave={() => setHoveredState(null)}
                    tabIndex={abbr ? 0 : -1}
                    style={{
                      default: {
                        fill: getFill(abbr, selectedState, teamsPerState),
                        stroke: getStroke(abbr, selectedState),
                        strokeWidth: isSelected ? 1.5 : 0.5,
                        outline: 'none',
                        cursor: abbr ? 'pointer' : 'default',
                        filter: isSelected ? 'drop-shadow(0 0 4px rgba(0,212,255,0.7))' : undefined,
                        transition: 'fill 0.15s, stroke 0.15s',
                      },
                      hover: {
                        fill: isHovered ? getHoverFill(abbr, selectedState, teamsPerState) : getFill(abbr, selectedState, teamsPerState),
                        stroke: isSelected ? '#00d4ff' : hasTeams ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.2)',
                        strokeWidth: isSelected ? 1.5 : 0.7,
                        outline: 'none',
                        cursor: 'pointer',
                      },
                      pressed: {
                        fill: 'rgba(0,212,255,0.2)',
                        stroke: '#00d4ff',
                        strokeWidth: 1,
                        outline: 'none',
                      },
                    }}
                  />
                )
              })
            }
          </Geographies>
        </ComposableMapVB>

        {/* Back button — only visible when zoomed into NE */}
        {neZoom && (
          <button
            onClick={() => setNeZoom(false)}
            aria-label="Return to full US map"
            style={{
              position: 'absolute', top: 6, right: 6, zIndex: 3,
              background: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.18)',
              color: '#9ca3af',
              borderRadius: 5, padding: '3px 8px',
              fontSize: 10, fontWeight: 700, letterSpacing: '0.03em',
              cursor: 'pointer', userSelect: 'none',
              backdropFilter: 'blur(4px)',
            }}
          >
            ← Full US
          </button>
        )}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 12, marginTop: 6, fontSize: 10 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{
            display: 'inline-block', width: 10, height: 10, borderRadius: 2,
            background: 'rgba(255,255,255,0.11)', border: '1px solid rgba(255,255,255,0.22)',
          }} />
          <span style={{ color: '#9ca3af' }}>Has teams</span>
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{
            display: 'inline-block', width: 10, height: 10, borderRadius: 2,
            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
          }} />
          <span style={{ color: '#4b5563' }}>No teams</span>
        </span>
      </div>
    </div>
  )
}
