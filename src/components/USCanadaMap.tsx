'use client'
import { useState, useRef, useCallback } from 'react'
import { ComposableMap, Geographies, Geography, GeoFeature } from 'react-simple-maps'

interface Props {
  selectedState: string | null
  onStateSelect: (abbr: string) => void
  teamsPerState: Record<string, number>
}

const US_GEO = 'https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json'

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

const CANADA_PROVINCES = [
  { abbr: 'BC', label: 'BC' }, { abbr: 'AB', label: 'AB' },
  { abbr: 'SK', label: 'SK' }, { abbr: 'MB', label: 'MB' },
  { abbr: 'ON', label: 'ON' }, { abbr: 'QC', label: 'QC' },
  { abbr: 'NB', label: 'NB' }, { abbr: 'NS', label: 'NS' },
  { abbr: 'PE', label: 'PE' }, { abbr: 'NL', label: 'NL' },
]

// react-simple-maps default SVG canvas: 800×600, projection translate=[400,300].
// geoAlbersUsa at scale=680 in this canvas places content at:
//   continental US top  ≈ y=128  (Maine / northern WA)
//   continental US btm  ≈ y=383  (Florida / southern TX)
//   Alaska/Hawaii insets bottom ≈ y=445
// Start viewport at y=115 (13px breathing room above US top) and h=335 so the
// bottom lands at y=450, safely containing all insets.
const FULL_VB = { x: 0, y: 128, w: 800, h: 322 }
const MIN_W = 80; const MAX_W = 800

type VB = { x: number; y: number; w: number; h: number }

function clampVB(vb: VB): VB {
  const w = Math.max(MIN_W, Math.min(MAX_W, vb.w))
  const h = w * (FULL_VB.h / FULL_VB.w) // keep zoomed viewBox in same aspect ratio as cropped full view
  const x = Math.max(0, Math.min(800 - w, vb.x))
  const y = Math.max(0, Math.min(450 - h, vb.y))
  return { x, y, w, h }
}

function getFill(abbr: string, selected: string | null, teamsPerState: Record<string, number>) {
  if (selected === abbr) return 'rgba(217,92,23,0.35)'
  if ((teamsPerState[abbr] || 0) > 0) return 'rgba(255,255,255,0.11)'
  return 'rgba(255,255,255,0.03)'
}
function getStroke(abbr: string, selected: string | null) {
  return selected === abbr ? '#D95C17' : 'rgba(255,255,255,0.15)'
}

type ComposableMapWithViewBox = React.ComponentType<
  React.ComponentProps<typeof ComposableMap> & { viewBox?: string }
>
const ComposableMapVB = ComposableMap as ComposableMapWithViewBox

export default function USCanadaMap({ selectedState, onStateSelect, teamsPerState }: Props) {
  const [vb, setVb] = useState<VB>(FULL_VB)
  const containerRef = useRef<HTMLDivElement>(null)
  const touchRef = useRef<{ touches: { clientX: number; clientY: number }[]; vb: VB } | null>(null)
  // Track whether a drag occurred so we don't fire a tap after a pan
  const didDragRef = useRef(false)

  const provinceStyle = (abbr: string): React.CSSProperties => {
    const has = (teamsPerState[abbr] || 0) > 0
    const sel = selectedState === abbr
    if (sel) return { background: 'rgba(217,92,23,0.25)', border: '2px solid #D95C17', color: '#D95C17' }
    if (has) return { background: 'rgba(255,255,255,0.11)', border: '1px solid rgba(255,255,255,0.22)', color: '#e5e7eb' }
    return { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.12)', color: '#4b5563' }
  }

  const resetZoom = useCallback(() => setVb(FULL_VB), [])

  function onTouchStart(e: React.TouchEvent) {
    didDragRef.current = false
    touchRef.current = { touches: Array.from(e.touches).map(t => ({ clientX: t.clientX, clientY: t.clientY })), vb: { ...vb } }
  }

  function onTouchMove(e: React.TouchEvent) {
    if (!touchRef.current || !containerRef.current) return
    e.preventDefault()
    const rect = containerRef.current.getBoundingClientRect()
    const sv = touchRef.current.vb

    if (e.touches.length === 1 && touchRef.current.touches.length >= 1) {
      // Pan
      const dx = e.touches[0].clientX - touchRef.current.touches[0].clientX
      const dy = e.touches[0].clientY - touchRef.current.touches[0].clientY
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) didDragRef.current = true
      const sx = sv.w / rect.width
      const sy = sv.h / rect.height
      setVb(clampVB({ ...sv, x: sv.x - dx * sx, y: sv.y - dy * sy }))
    } else if (e.touches.length === 2 && touchRef.current.touches.length >= 2) {
      // Pinch zoom
      didDragRef.current = true
      const t1 = e.touches[0]; const t2 = e.touches[1]
      const s1 = touchRef.current.touches[0]; const s2 = touchRef.current.touches[1]
      const curDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY)
      const startDist = Math.hypot(s2.clientX - s1.clientX, s2.clientY - s1.clientY)
      const scale = startDist / curDist
      const newW = Math.max(MIN_W, Math.min(MAX_W, sv.w * scale))
      const newH = newW * (450 / 800)
      // Zoom toward pinch center
      const pcx = (t1.clientX + t2.clientX) / 2 - rect.left
      const pcy = (t1.clientY + t2.clientY) / 2 - rect.top
      const svgX = sv.x + (pcx / rect.width) * sv.w
      const svgY = sv.y + (pcy / rect.height) * sv.h
      setVb(clampVB({
        x: svgX - (pcx / rect.width) * newW,
        y: svgY - (pcy / rect.height) * newH,
        w: newW, h: newH,
      }))
    }
  }

  function onTouchEnd() {
    touchRef.current = null
  }

  const isZoomed = vb.w < MAX_W * 0.98

  return (
    <div style={{ width: '100%', overflow: 'hidden' }}>
      {/* Canada province pill row */}
      <div style={{ marginBottom: 6 }}>
        <div style={{ fontSize: 9, color: '#4b5563', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>
          Canada
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
          {CANADA_PROVINCES.map(({ abbr, label }) => (
            <button key={abbr} onClick={() => onStateSelect(abbr)}
              style={{ padding: '3px 7px', borderRadius: 4, fontSize: 10, fontWeight: 700, cursor: 'pointer', userSelect: 'none', transition: 'all 0.1s', ...provinceStyle(abbr) }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Map container — full aspect ratio, no maxHeight cap */}
      <div
        ref={containerRef}
        style={{ width: '100%', position: 'relative', aspectRatio: '800/335', overflow: 'hidden', touchAction: 'none', cursor: isZoomed ? 'grab' : 'default' }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <ComposableMapVB
          projection="geoAlbersUsa"
          projectionConfig={{ scale: 680 }}
          viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}
          style={{ width: '100%', height: '100%', display: 'block' }}
        >
          <Geographies geography={US_GEO}>
            {({ geographies }: { geographies: GeoFeature[] }) =>
              geographies.map((geo) => {
                const abbr = FIPS_TO_ABBR[geo.id] ?? ''
                const isSelected = selectedState === abbr
                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    onClick={() => {
                      if (didDragRef.current) return // ignore tap after pan/zoom
                      if (abbr) onStateSelect(abbr)
                    }}
                    tabIndex={abbr ? 0 : -1}
                    style={{
                      default: {
                        fill: getFill(abbr, selectedState, teamsPerState),
                        stroke: getStroke(abbr, selectedState),
                        strokeWidth: isSelected ? 1.5 : 0.5,
                        outline: 'none',
                        cursor: abbr ? 'pointer' : 'default',
                        filter: isSelected ? 'drop-shadow(0 0 4px rgba(217,92,23,0.7))' : undefined,
                        transition: 'fill 0.1s',
                      },
                      hover: {
                        fill: isSelected ? 'rgba(217,92,23,0.45)' : (teamsPerState[abbr] || 0) > 0 ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.11)',
                        stroke: isSelected ? '#D95C17' : 'rgba(255,255,255,0.3)',
                        strokeWidth: isSelected ? 1.5 : 0.7,
                        outline: 'none',
                        cursor: 'pointer',
                      },
                      pressed: { fill: 'rgba(217,92,23,0.2)', stroke: '#D95C17', strokeWidth: 1, outline: 'none' },
                    }}
                  />
                )
              })
            }
          </Geographies>
        </ComposableMapVB>

        {/* Reset zoom button — only visible when zoomed in */}
        {isZoomed && (
          <button
            onClick={resetZoom}
            style={{
              position: 'absolute', bottom: 6, right: 6, zIndex: 3,
              background: 'rgba(12,27,49,0.9)', border: '1px solid rgba(255,255,255,0.2)',
              color: '#9ca3af', borderRadius: 6, padding: '4px 10px',
              fontSize: 11, fontWeight: 700, cursor: 'pointer',
            }}
          >
            ↺ Reset
          </button>
        )}
      </div>

      {/* Hint + legend */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 5, fontSize: 10 }}>
        <span style={{ color: '#4b5563' }}>Pinch to zoom · drag to pan</span>
        <span style={{ display: 'flex', gap: 10 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: 'rgba(255,255,255,0.11)', border: '1px solid rgba(255,255,255,0.22)' }} />
            <span style={{ color: '#9ca3af' }}>Has teams</span>
          </span>
        </span>
      </div>
    </div>
  )
}

