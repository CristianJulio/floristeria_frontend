import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router'
import { formatMoney } from '@/lib/money'
import { formatDeliveryDay, formatDeliveryTime } from '@/features/orders/order-format'
import { DashboardCard } from './DashboardCard'
import { fetchPendingPayments } from './dashboard-api'

// The orders of the period that still owe money, soonest delivery first, so nothing goes out unpaid
export function PendingPaymentsCard({ from, to, className }: { from: string; to: string; className?: string }) {
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['dashboard', 'pending-payments', from, to],
    queryFn: () => fetchPendingPayments(from, to),
    refetchInterval: 60_000,
  })

  return (
    <DashboardCard
      title="Pagos pendientes"
      subtitle="Pedidos del período con saldo por cobrar"
      isPending={isPending}
      isError={isError}
      onRetry={refetch}
      {...(className && { className })}
    >
      {data &&
        (data.orders.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay pedidos con saldo pendiente en este período.</p>
        ) : (
          <>
            <div>
              <div className="text-3xl font-semibold tabular-nums">{formatMoney(data.pendingSum)}</div>
              <div className="text-sm text-muted-foreground">
                por cobrar en {data.orderCount} {data.orderCount === 1 ? 'pedido' : 'pedidos'}
              </div>
            </div>
            <ul className="-mr-2 flex max-h-80 flex-col overflow-y-auto pr-2 text-sm">
              {data.orders.map((order) => (
                <li key={order.id} className="border-b last:border-b-0">
                  <Link
                    to={`/pedidos/${order.id}`}
                    className="flex items-center justify-between gap-3 py-2 transition-colors hover:bg-secondary/40 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{order.recipientName}</span>
                      <span className="block text-xs text-muted-foreground tabular-nums">
                        {formatDeliveryDay(order.deliveryDate)} · {formatDeliveryTime(order)}
                      </span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block font-medium text-amber-700 tabular-nums dark:text-amber-400">
                        Debe {formatMoney(order.pending)}
                      </span>
                      <span className="block text-xs text-muted-foreground tabular-nums">
                        de {formatMoney(order.total)}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            {data.orderCount > data.orders.length && (
              <p className="text-center text-xs text-muted-foreground">
                Mostrando {data.orders.length} de {data.orderCount}
              </p>
            )}
          </>
        ))}
    </DashboardCard>
  )
}
