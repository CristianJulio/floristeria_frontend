import { cn } from 'cn'

// Shown instead of a product photo when there is none (or it fails to load):
// a single flower in the same style and colours as the login bouquet
export function ProductPlaceholder({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center justify-center overflow-hidden rounded-md bg-secondary', className)} aria-hidden>
      <svg viewBox="0 0 40 40" className="size-full">
        {/* Stem and leaf */}
        <path d="M20 40 C20 34 21 30 20 26" stroke="#2f6b4f" strokeWidth={1.6} strokeLinecap="round" fill="none" />
        <path d="M20.4 34 C23 30 28 29.5 31 31 C28 34 24 35 20.4 34 Z" fill="#6f9a80" />
        {/* Flower: five petals around a pollen centre */}
        <g transform="translate(20 16) scale(1.35)">
          {[0, 72, 144, 216, 288].map((angle) => (
            <ellipse
              key={angle}
              cx={0}
              cy={-5.5}
              rx={3.6}
              ry={5.8}
              fill="#f7e1e8"
              stroke="#d99aae"
              strokeWidth={0.9}
              transform={`rotate(${angle})`}
            />
          ))}
          <circle r={2.6} fill="#fdf0d5" stroke="#9b3f5c" strokeWidth={0.9} />
        </g>
      </svg>
    </div>
  )
}
