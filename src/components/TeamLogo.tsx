interface TeamLogoProps {
  src?: string
  emoji: string
  abbr: string
  size?: number
  className?: string
}

/**
 * Converts ESPN CDN logo URLs to the combiner format for consistent delivery.
 */
function normalizeLogoUrl(url: string, size: number): string {
  if (!url || !url.includes('espncdn.com')) return url
  if (url.includes('/combiner/i')) {
    const base = url.split('?')[0]
    const params = new URLSearchParams(url.split('?')[1] ?? '')
    params.set('w', String(size))
    params.set('h', String(size))
    return `${base}?${params.toString()}`
  }
  const imgPath = url.replace('https://a.espncdn.com', '')
  return `https://a.espncdn.com/combiner/i?img=${imgPath}&w=${size}&h=${size}`
}

export default function TeamLogo({ src, emoji, abbr, size = 32, className = '' }: TeamLogoProps) {
  if (src) {
    const resolvedSrc = normalizeLogoUrl(src, size)
    const isEspn = src.includes('espncdn.com')

    // ESPN logos have varying amounts of transparent padding baked into the PNG
    // (WNBA ~20% padding, MLB ~5%, etc.). To equalise visual size across leagues,
    // we render the image at 130% inside a clipped fixed-size container so the
    // transparent edges are cropped away and the actual logo fills the space.
    if (isEspn) {
      const innerSize = Math.round(size * 1.3)
      return (
        <div
          style={{ width: size, height: size, overflow: 'hidden', display: 'flex',
                   alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
          className={className}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={resolvedSrc}
            alt={abbr}
            width={innerSize}
            height={innerSize}
            loading="eager"
            decoding="async"
            style={{ objectFit: 'contain', flexShrink: 0 }}
            onError={(e) => {
              const target = e.target as HTMLImageElement
              const wrapper = target.parentElement
              if (wrapper) {
                wrapper.innerHTML = `<span style="width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;font-size:${Math.round(size*0.32)}px;font-weight:800;letter-spacing:-0.5px;background:rgba(255,255,255,0.16);border-radius:50%;color:#fff;" title="${abbr}">${abbr}</span>`
              }
            }}
          />
        </div>
      )
    }

    // Non-ESPN logos (WHL, PWHL, etc.) — render normally, no zoom
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
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


