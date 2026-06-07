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
      <img
        src={src}
        alt={abbr}
        width={size}
        height={size}
        className={`object-contain ${className}`}
        onError={(e) => {
          const target = e.target as HTMLImageElement
          target.style.display = 'none'
          const parent = target.parentElement
          if (parent) {
            parent.innerHTML = `<span style="font-size:${size * 0.75}px" title="${abbr}">${emoji}</span>`
          }
        }}
      />
    )
  }
  return (
    <span style={{ fontSize: size * 0.75 }} title={abbr} className={className}>
      {emoji}
    </span>
  )
}
