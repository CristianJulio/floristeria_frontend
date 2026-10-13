import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { cn } from 'cn'
import { STATUS_COLORS, STATUS_DOT_CLASSES, STATUS_LABELS } from '@/features/orders/order-format'
import type { OrderStatus } from '@/features/orders/orders-api'
import { DashboardCard } from './DashboardCard'
import { fetchOrdersByStatus, type OrdersByStatus } from './dashboard-api'

// The ring is drawn in a 100 x 100 box: a circle of this radius, stroked this thick
const RADIUS = 38
const THICKNESS = 14
const CIRCUMFERENCE = 2 * Math.PI * RADIUS
// Space left between neighbouring slices
const GAP = 2

const percent = (count: number, total: number) => `${Math.round((count / total) * 100)} %`

// The ring: one arc per status that has orders, with a small gap between them. The middle shows the
// total, or the status being hovered or focused. Every value is also in the list next to it
function Donut({
  rows,
  total,
  active,
  onActive,
}: {
  rows: OrdersByStatus['rows']
  total: number
  active: OrderStatus | null
  onActive: (status: OrderStatus | null) => void
}) {
  const shown = rows.filter((row) => row.count > 0)
  const only = shown.length === 1
  let offset = 0
  const current = rows.find((row) => row.status === active)

  return (
    <div className="relative size-40 shrink-0">
      <svg viewBox="0 0 100 100" className="size-full -rotate-90" role="img" aria-label="Pedidos por estado">
        {/* The track the arcs sit on, for when the ring has few orders */}
        <circle cx="50" cy="50" r={RADIUS} fill="none" strokeWidth={THICKNESS} className="stroke-muted" />
        {shown.map((row) => {
          const length = (row.count / total) * CIRCUMFERENCE
          const visible = only ? length : Math.max(length - GAP, 0.5)
          const start = offset
          offset += length
          const isActive = active === row.status
          return (
            <circle
              key={row.status}
              cx="50"
              cy="50"
              r={RADIUS}
              fill="none"
              stroke={STATUS_COLORS[row.status]}
              strokeWidth={isActive ? THICKNESS + 3 : THICKNESS}
              strokeDasharray={`${visible} ${CIRCUMFERENCE - visible}`}
              strokeDashoffset={-start}
              tabIndex={0}
              role="img"
              aria-label={`${STATUS_LABELS[row.status]}: ${row.count} (${percent(row.count, total)})`}
              className="cursor-default outline-none transition-[stroke-width]"
              onPointerEnter={() => onActive(row.status)}
              onPointerLeave={() => onActive(null)}
              onFocus={() => onActive(row.status)}
              onBlur={() => onActive(null)}
            />
          )
        })}
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-3xl font-semibold tabular-nums">{current ? current.count : total}</span>
        <span className="max-w-24 text-xs leading-tight text-muted-foreground">
          {current
            ? `${STATUS_LABELS[current.status]} · ${percent(current.count, total)}`
            : total === 1
              ? 'pedido'
              : 'pedidos'}
        </span>
      </div>
    </div>
  )
}

// How many orders delivered in the period are in each status, as a ring with the list beside it
export function OrdersByStatusCard({ from, to }: { from: string; to: string }) {
  const [active, setActive] = useState<OrderStatus | null>(null)
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['dashboard', 'orders-by-status', from, to],
    queryFn: () => fetchOrdersByStatus(from, to),
    refetchInterval: 60_000,
  })

  return (
    <DashboardCard
      title="Pedidos por estado"
      subtitle="Pedidos según su día de entrega"
      isPending={isPending}
      isError={isError}
      onRetry={refetch}
    >
      {data &&
        (data.total === 0 ? (
          <p className="text-sm text-muted-foreground">No hay pedidos con entrega en este período.</p>
        ) : (
          <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
            <Donut rows={data.rows} total={data.total} active={active} onActive={setActive} />
            <ul className="flex min-w-48 flex-1 flex-col gap-1 text-sm">
              {data.rows.map((row) => (
                <li
                  key={row.status}
                  className={cn(
                    'flex items-center justify-between gap-2 rounded-md px-2 py-1 transition-colors',
                    active === row.status && 'bg-secondary',
                  )}
                  onPointerEnter={() => row.count > 0 && setActive(row.status)}
                  onPointerLeave={() => setActive(null)}
                >
                  <span className={cn('flex items-center gap-2', row.count === 0 && 'text-muted-foreground')}>
                    <span className={cn('size-2.5 rounded-full', STATUS_DOT_CLASSES[row.status])} aria-hidden />
                    {STATUS_LABELS[row.status]}
                  </span>
                  <span className="flex items-baseline gap-2 tabular-nums">
                    <span className={cn(row.count > 0 && 'font-medium')}>{row.count}</span>
                    <span className="w-10 text-right text-xs text-muted-foreground">
                      {row.count > 0 ? percent(row.count, data.total) : ''}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
    </DashboardCard>
  )
}
