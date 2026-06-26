'use client'

/**
 * Drapeau de pays en image réelle (flagcdn.com), rendu en cercle.
 * Les emojis drapeaux ne s'affichent pas sur Windows : on utilise donc des
 * images pour un rendu cohérent sur toutes les plateformes.
 */
export function CountryFlag({
  code,
  size = 24,
  className = '',
}: {
  code: string
  size?: number
  className?: string
}) {
  const lower = code.toLowerCase()
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/10 ring-1 ring-white/15 ${className}`}
      style={{ width: size, height: size }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`https://flagcdn.com/w160/${lower}.png`}
        srcSet={`https://flagcdn.com/w320/${lower}.png 2x`}
        alt={`Drapeau ${code}`}
        width={size}
        height={size}
        loading="lazy"
        className="h-full w-full object-cover"
      />
    </span>
  )
}
