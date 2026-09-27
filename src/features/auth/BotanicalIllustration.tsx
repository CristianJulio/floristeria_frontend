// Decorative bouquet for the login panel, drawn in the Tallo greens with petal pinks.
// Coordinates are in a 400×520 box; every stem starts from the same point at the bottom,
// and leaves are placed on the stem's own curve so they grow out of it.

const STEM = '#1f4a36'
const LEAF_DARK = '#255c43'
const LEAF = '#4f8a6c'
const LEAF_LIGHT = '#8fb59d'
const PETAL = '#f7e1e8'
const PETAL_DEEP = '#d99aae'
const PETAL_INK = '#9b3f5c'
const POLLEN = '#fdf0d5'

type Point = [number, number]
type Curve = [Point, Point, Point, Point]

const ORIGIN: Point = [200, 540]

// Point and direction (degrees) at t on a cubic curve
function pointOn([p0, p1, p2, p3]: Curve, t: number) {
  const u = 1 - t
  const at = (i: 0 | 1) => u ** 3 * p0[i] + 3 * u * u * t * p1[i] + 3 * u * t * t * p2[i] + t ** 3 * p3[i]
  const slope = (i: 0 | 1) =>
    3 * u * u * (p1[i] - p0[i]) + 6 * u * t * (p2[i] - p1[i]) + 3 * t * t * (p3[i] - p2[i])
  return { x: at(0), y: at(1), angle: (Math.atan2(slope(1), slope(0)) * 180) / Math.PI }
}

type Bloom = { kind: 'flower'; size: number; petals: number; deep?: boolean; turn?: number } | { kind: 'bud'; size: number }

type StemSpec = {
  curve: Curve
  width: number
  bloom: Bloom
  // Where leaves grow (0 = bottom, 1 = tip), alternating sides
  leaves: { t: number; size: number; color: string }[]
}

const STEMS: StemSpec[] = [
  {
    curve: [ORIGIN, [196, 440], [234, 330], [210, 214]],
    width: 3.2,
    bloom: { kind: 'flower', size: 1.55, petals: 8 },
    leaves: [
      { t: 0.3, size: 1.5, color: LEAF_DARK },
      { t: 0.45, size: 1.4, color: LEAF },
      { t: 0.65, size: 1.1, color: LEAF_LIGHT },
    ],
  },
  {
    curve: [ORIGIN, [170, 452], [110, 380], [96, 290]],
    width: 3,
    bloom: { kind: 'flower', size: 1.15, petals: 5, turn: 12 },
    leaves: [
      { t: 0.35, size: 1.3, color: LEAF },
      { t: 0.6, size: 1.1, color: LEAF_LIGHT },
    ],
  },
  {
    curve: [ORIGIN, [236, 456], [314, 396], [326, 318]],
    width: 3,
    bloom: { kind: 'flower', size: 1.05, petals: 6, deep: true, turn: 15 },
    leaves: [
      { t: 0.35, size: 1.3, color: LEAF_DARK },
      { t: 0.62, size: 1.05, color: LEAF },
    ],
  },
  {
    curve: [ORIGIN, [220, 450], [290, 250], [302, 150]],
    width: 2.6,
    bloom: { kind: 'bud', size: 1.2 },
    leaves: [
      { t: 0.55, size: 1, color: LEAF_LIGHT },
      { t: 0.78, size: 0.8, color: LEAF },
    ],
  },
  {
    curve: [ORIGIN, [178, 450], [140, 250], [146, 132]],
    width: 2.6,
    bloom: { kind: 'bud', size: 1.25 },
    leaves: [
      { t: 0.5, size: 1, color: LEAF },
      { t: 0.75, size: 0.8, color: LEAF_LIGHT },
    ],
  },
  {
    curve: [ORIGIN, [150, 470], [60, 440], [34, 372]],
    width: 2.4,
    bloom: { kind: 'flower', size: 0.8, petals: 6, deep: true },
    leaves: [{ t: 0.45, size: 1.1, color: LEAF_LIGHT }],
  },
  {
    curve: [ORIGIN, [260, 476], [350, 452], [370, 390]],
    width: 2.4,
    bloom: { kind: 'flower', size: 0.85, petals: 5, turn: -8 },
    leaves: [{ t: 0.45, size: 1.1, color: LEAF }],
  },
  {
    curve: [ORIGIN, [208, 420], [262, 300], [250, 262]],
    width: 2.2,
    bloom: { kind: 'flower', size: 0.7, petals: 5, deep: true, turn: 30 },
    leaves: [],
  },
]

// Leaf drawn along +x from its base; the base sits on the stem
function Leaf({ x, y, angle, size, color }: { x: number; y: number; angle: number; size: number; color: string }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${angle}) scale(${size})`}>
      <path d="M0 0 C12 -16 34 -18 52 0 C34 18 12 16 0 0 Z" fill={color} />
      <path d="M2 0 C18 -2 34 -2 48 0" stroke={LEAF_DARK} strokeWidth={1.2} fill="none" opacity={0.6} />
    </g>
  )
}

function Flower({ x, y, size, petals, deep = false, turn = 0 }: { x: number; y: number; size: number; petals: number; deep?: boolean; turn?: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${turn}) scale(${size})`}>
      {Array.from({ length: petals }, (_, i) => (
        <ellipse
          key={i}
          cx={0}
          cy={-20}
          rx={11}
          ry={20}
          fill={deep ? PETAL_DEEP : PETAL}
          stroke={deep ? PETAL_INK : PETAL_DEEP}
          strokeWidth={1.5}
          transform={`rotate(${(360 / petals) * i})`}
        />
      ))}
      <circle r={9} fill={POLLEN} stroke={PETAL_INK} strokeWidth={1.5} />
      <circle r={3} fill={PETAL_INK} opacity={0.7} />
    </g>
  )
}

// Closed bud pointing along the stem's direction
function Bud({ x, y, angle, size }: { x: number; y: number; angle: number; size: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${angle + 90}) scale(${size})`}>
      <path d="M0 0 C-12 -8 -12 -30 0 -40 C12 -30 12 -8 0 0 Z" fill={PETAL_DEEP} />
      <path d="M0 0 C-6 -10 -4 -26 4 -34 C10 -24 8 -8 0 0 Z" fill={PETAL} opacity={0.8} />
      <path d="M-9 -4 C-6 4 6 4 9 -4 C4 0 -4 0 -9 -4 Z" fill={LEAF} />
    </g>
  )
}

export function BotanicalIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 400 520" className={className} aria-hidden focusable="false">
      {STEMS.map(({ curve: [p0, p1, p2, p3], width }, i) => (
        <path
          key={`stem-${i}`}
          d={`M${p0} C${p1} ${p2} ${p3}`}
          stroke={STEM}
          strokeWidth={width}
          strokeLinecap="round"
          fill="none"
        />
      ))}

      {STEMS.flatMap(({ curve, leaves }, i) =>
        leaves.map(({ t, size, color }, j) => {
          const { x, y, angle } = pointOn(curve, t)
          // Leaves point up and away from the stem, on alternating sides
          const side = j % 2 === 0 ? 1 : -1
          return <Leaf key={`leaf-${i}-${j}`} x={x} y={y} angle={angle + side * 40} size={size} color={color} />
        }),
      )}

      {STEMS.map(({ curve, bloom }, i) => {
        const tip = pointOn(curve, 1)
        return bloom.kind === 'bud' ? (
          <Bud key={`bloom-${i}`} x={tip.x} y={tip.y} angle={tip.angle} size={bloom.size} />
        ) : (
          <Flower
            key={`bloom-${i}`}
            x={tip.x}
            y={tip.y}
            size={bloom.size}
            petals={bloom.petals}
            {...(bloom.deep !== undefined && { deep: bloom.deep })}
            {...(bloom.turn !== undefined && { turn: bloom.turn })}
          />
        )
      })}
    </svg>
  )
}
