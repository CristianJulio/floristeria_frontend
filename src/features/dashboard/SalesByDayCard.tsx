import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { cn } from 'cn'
import { formatMoney } from '@/lib/money'
import { formatDeliveryDay } from '@/features/orders/order-format'
import { DashboardCard } from './DashboardCard'
import { fetchSalesByDay, type SalesByDay } from './dashboard-api'

const shortDate = new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short', timeZone: 'UTC' })
const monthName = new Intl.DateTimeFormat('es-CO', { month: 'long', year: 'numeric', timeZone: 'UTC' })
const compact = new Intl.NumberFormat('es-CO', { notation: 'compact', maximumFractionDigits: 1 })

const at = (date: string) => new Date(`${date}T00:00:00Z`)

// What a bar is called, in full (for the readout) and short (for the axis)
function bucketLabel(bucket: SalesByDay['bucket'], start: string) {
  if (bucket === 'day') return formatDeliveryDay(start)
  if (bucket === 'week') return `Semana del ${shortDate.format(at(start))}`
  return monthName.format(at(start))
}

function axisLabel(bucket: SalesByDay['bucket'], start: string) {
  if (bucket === 'month') return new Intl.DateTimeFormat('es-CO', { month: 'short', timeZone: 'UTC' }).format(at(start))
  return shortDate.format(at(start))
}

// A round value at or above the biggest bar, so the top gridline is a clean number
function niceMax(value: number) {
  if (value <= 0) return 1
  const magnitude = 10 ** Math.floor(Math.log10(value))
  const step = [1, 2, 2.5, 5, 10].find((candidate) => candidate * magnitude >= value)! * magnitude
  return step
}

const SUBTITLES = {
  day: 'Valor de los pedidos por día de entrega',
  week: 'Valor de los pedidos por semana de entrega',
  month: 'Valor de los pedidos por mes de entrega',
}

// What the orders delivered are worth, bar by bar: per day, or per week or month when the period is
// long. One hue, thin bars anchored to the baseline; the readout above shows the bar under the pointer
// (or the total), so no value depends on hovering. `highlight` marks the bar of the day being looked at
export function SalesByDayCard({
  from,
  to,
  highlight,
  className,
}: {
  from: string
  to: string
  highlight?: string
  className?: string
}) {
  const [active, setActive] = useState<number | null>(null)
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['dashboard', 'sales-by-day', from, to],
    queryFn: () => fetchSalesByDay(from, to),
    refetchInterval: 60_000,
  })

  const rows = data?.rows ?? []
  const max = niceMax(Math.max(...rows.map((row) => row.total), 0))
  const total = rows.reduce((sum, row) => sum + row.total, 0)
  const current = active === null ? null : rows[active]
  const ticks = [1, 0.75, 0.5, 0.25, 0]
  // Label every so many bars, so the axis never gets crowded
  const every = Math.max(1, Math.ceil(rows.length / 8))

  return (
    <DashboardCard
      title="Ventas"
      subtitle={data ? SUBTITLES[data.bucket] : SUBTITLES.day}
      isPending={isPending}
      isError={isError}
      onRetry={refetch}
      {...(className && { className })}
    >
      {data && (
        <>
          <div className="min-h-10 text-sm">
            {current ? (
              <>
                <div className="text-muted-foreground">{bucketLabel(data.bucket, current.start)}</div>
                <div>
                  <span className="text-xl font-semibold tabular-nums">{formatMoney(current.total)}</span>
                  <span className="ml-2 text-muted-foreground">
                    {current.orders} {current.orders === 1 ? 'pedido' : 'pedidos'}
                  </span>
                </div>
              </>
            ) : (
              <>
                <div className="text-muted-foreground">Total del período</div>
                <div className="text-xl font-semibold tabular-nums">{formatMoney(total)}</div>
              </>
            )}
          </div>

          <div className="flex gap-2">
            <div className="flex h-44 w-12 shrink-0 flex-col justify-between text-right text-xs text-muted-foreground tabular-nums">
              {ticks.map((tick) => (
                <span key={tick} className="-my-1.5 leading-3">
                  {tick === 0 ? '0' : `$ ${compact.format(max * tick)}`}
                </span>
              ))}
            </div>
            <div className="min-w-0 flex-1">
              <div className="relative h-44">
                {/* The grid: quiet lines, behind the bars */}
                {ticks.map((tick) => (
                  <div
                    key={tick}
                    className="absolute inset-x-0 border-t border-border/60"
                    style={{ bottom: `${tick * 100}%` }}
                    aria-hidden
                  />
                ))}
                <div className="absolute inset-0 flex items-end gap-[2px]" onPointerLeave={() => setActive(null)}>
                  {rows.map((row, index) => {
                    const isHighlight = highlight !== undefined && row.start === highlight
                    return (
                      // The whole column is the hit target, not only the painted bar
                      <div
                        key={row.start}
                        className="group flex h-full min-w-0 flex-1 items-end"
                        tabIndex={0}
                        role="img"
                        aria-label={`${bucketLabel(data.bucket, row.start)}: ${formatMoney(row.total)}, ${row.orders} pedidos`}
                        onPointerEnter={() => setActive(index)}
                        onFocus={() => setActive(index)}
                        onBlur={() => setActive(null)}
                      >
                        <div
                          className={cn(
                            'w-full rounded-t-[4px] bg-primary transition-opacity',
                            highlight !== undefined && !isHighlight && 'opacity-50',
                            active !== null && active !== index && 'opacity-60',
                          )}
                          style={{ height: `${(row.total / max) * 100}%`, minHeight: row.total > 0 ? 2 : 0 }}
                        />
                      </div>
                    )
                  })}
                </div>
              </div>
              <div className="mt-1.5 flex gap-[2px]">
                {rows.map((row, index) => (
                  // Centred on its bar, and free to be wider than it
                  <div key={row.start} className="relative h-4 min-w-0 flex-1 text-xs text-muted-foreground">
                    {index % every === 0 && (
                      <span className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap">
                        {axisLabel(data.bucket, row.start)}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </DashboardCard>
  )
}
