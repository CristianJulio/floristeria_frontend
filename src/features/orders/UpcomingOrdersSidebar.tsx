import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router'
import { cn } from 'cn'
import { addDays, todayInColombia } from '@/lib/dates'
import { formatCountdown, minutesToDelivery, urgencyOf, type Urgency } from './delivery-urgency'
import { STATUS_LABELS, formatDeliveryDay, formatDeliveryTime, formatPlace } from './order-format'
import { fetchActiveOrders, type Order } from './orders-api'

// The traffic light: a coloured edge and a light tint of the same colour
const URGENCY_CLASSES: Record<Urgency, string> = {
  ok: 'border-l-green-500 bg-green-50 dark:bg-green-900/20',
  soon: 'border-l-amber-500 bg-amber-50 dark:bg-amber-900/20',
  alert: 'border-l-red-500 bg-red-50 dark:bg-red-900/20',
  none: 'border-l-border bg-muted/40',
}

const URGENCY_TEXT_CLASSES: Record<Urgency, string> = {
  ok: 'text-green-800 dark:text-green-300',
  soon: 'text-amber-800 dark:text-amber-300',
  alert: 'font-semibold text-red-800 dark:text-red-300',
  none: 'text-muted-foreground',
}

// The current time, refreshed every half minute so the colours and countdowns keep up
function useNow(intervalMs = 30_000) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), intervalMs)
    return () => clearInterval(timer)
  }, [intervalMs])
  return now
}

// Shown on each order due on another day; orders due today show only their time
function dayLabel(date: string, today: string) {
  if (date === today) return null
  if (date === addDays(today, 1)) return 'Mañana'
  return formatDeliveryDay(date)
}

function OrderItem({
  order,
  now,
  today,
  onSelect,
}: {
  order: Order
  now: Date
  today: string
  onSelect?: (() => void) | undefined
}) {
  const minutes = minutesToDelivery(order, now)
  const urgency = urgencyOf(minutes, order.deliveryDate, today)
  const countdown = formatCountdown(minutes)
  const day = dayLabel(order.deliveryDate, today)

  return (
    <li>
      <Link
        to={`/pedidos/${order.id}`}
        onClick={onSelect}
        className={cn(
          'flex flex-col gap-0.5 rounded-md border-l-4 px-3 py-2 text-sm transition-colors hover:brightness-95 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none',
          URGENCY_CLASSES[urgency],
        )}
      >
        <div className="flex items-baseline justify-between gap-2">
          <span className="font-semibold tabular-nums">
            {day && <span className="font-normal text-muted-foreground">{day} · </span>}
            {formatDeliveryTime(order)}
          </span>
          {countdown && <span className={cn('text-xs tabular-nums', URGENCY_TEXT_CLASSES[urgency])}>{countdown}</span>}
        </div>
        <span className="truncate font-medium">{order.recipientName}</span>
        <span className="truncate text-xs text-muted-foreground">
          {formatPlace(order)} · {STATUS_LABELS[order.status]}
        </span>
      </Link>
    </li>
  )
}

// Every open order, soonest delivery first, coloured by how close its time is. The list refreshes by
// itself every minute, and right away when an order changes anywhere in the app
// onSelect runs when an order is opened, so a panel holding the list can close itself
export function UpcomingOrdersSidebar({ onSelect }: { onSelect?: () => void }) {
  const now = useNow()
  const today = todayInColombia()
  const { data, isPending, isError } = useQuery({
    queryKey: ['orders', 'upcoming'],
    queryFn: fetchActiveOrders,
    refetchInterval: 60_000,
  })

  return (
    <div className="flex flex-col gap-4 p-4">
      <div>
        <h2 className="text-sm font-semibold">Próximas entregas</h2>
        <p className="text-xs text-muted-foreground">Pedidos abiertos, del más próximo al más lejano</p>
      </div>

      {isPending ? (
        <p className="text-sm text-muted-foreground">Cargando…</p>
      ) : isError ? (
        <p className="text-sm text-destructive">No se pudieron cargar los pedidos.</p>
      ) : data.data.length === 0 ? (
        <p className="text-sm text-muted-foreground">No hay pedidos abiertos.</p>
      ) : (
        <>
          {/* The API already sorts by date and time: soonest first */}
          <ul className="flex flex-col gap-1.5">
            {data.data.map((order) => (
              <OrderItem key={order.id} order={order} now={now} today={today} onSelect={onSelect} />
            ))}
          </ul>
          {data.pagination.total > data.data.length && (
            <p className="text-center text-xs text-muted-foreground">
              Mostrando {data.data.length} de {data.pagination.total}
            </p>
          )}
        </>
      )}
    </div>
  )
}
