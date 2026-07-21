interface TeamLogoProps {
  src?: string
  emoji: string
  abbr: string
  size?: number
  className?: string
}

/**
 * Converts an ESPN CDN logo URL to use the ESPN combiner with exact crop dimensions.
 * ESPN logo PNGs vary in how much transparent padding is baked in (WNBA has ~20% padding,
 * MLB fills the frame). The combiner's scale=crop removes that whitespace so all logos
 * render at the same visual size regardless of league.
 */
function normalizeLogoUrl(url: string, size: number): string {
  if (!url || !url.includes('espncdn.com')) return url
  // Already using combiner — just ensure size params are set
  if (url.includes('/combiner/i')) {
    const base = url.split('?')[0]
    const params = new URLSearchParams(url.split('?')[1] ?? '')
    params.set('w', String(size))
    params.set('h', String(size))
    params.set('scale', 'crop')
    return `${base}?${params.toString()}`
  }
  // Direct ESPN CDN URL — convert to combiner
  const imgPath = url.replace('https://a.espncdn.com', '')
  return `https://a.espncdn.com/combiner/i?img=${imgPath}&w=${size}&h=${size}&scale=crop`
}

export default function TeamLogo({ src, emoji, abbr, size = 32, className = '' }: TeamLogoProps) {
  if (src) {
    const resolvedSrc = normalizeLogoUrl(src, size)
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={resolvedSrc}
        alt={abbr}
        width={size}
        height={size}
        loading="eager"
        decoding="async"
        className={`object-contain ${className}`}
        onError={(e) => {
          const target = e.target as HTMLImageElement
          target.style.display = 'none'
          const parent = target.parentElement
          if (parent) {
            // Professional fallback: colored circle with abbreviation
            parent.innerHTML = `<span style="width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;font-size:${Math.round(size*0.32)}px;font-weight:800;letter-spacing:-0.5px;background:rgba(255,255,255,0.16);border-radius:50%;color:#fff;" title="${abbr}">${abbr}</span>`
          }
        }}
      />
    )
  }
  // No src — render emoji with consistent sizing
  return (
    <span
      style={{ fontSize: size * 0.72, lineHeight: 1, display: 'inline-block' }}
      title={abbr}
      role="img"
      aria-label={abbr}
      className={className}
    >
      {emoji}
    </span>
  )
}

