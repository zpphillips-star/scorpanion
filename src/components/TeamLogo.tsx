interface TeamLogoProps {
  src?: string
  emoji: string
  abbr: string
  size?: number
  className?: string
}

export default function TeamLogo({ src, emoji, abbr, size = 32, className = '' }: TeamLogoProps) {
  if (src) {
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
            // Professional fallback: colored circle with abbreviation
            parent.innerHTML = `<span style="width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;font-size:${Math.round(size*0.32)}px;font-weight:800;letter-spacing:-0.5px;background:rgba(255,255,255,0.12);border-radius:50%;color:#fff;" title="${abbr}">${abbr}</span>`
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
