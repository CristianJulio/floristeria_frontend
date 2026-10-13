import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router'
import { formatMoney } from '@/lib/money'
import { STATUS_LABELS, formatDeliveryDay, formatDeliveryTime } from '@/features/orders/order-format'
import { DashboardCard } from './DashboardCard'
import { fetchPendingPayments } from './dashboard-api'

const orders = (count: number) => `${count} ${count === 1 ? 'pedido' : 'pedidos'}`

// The orders of the period with money still to move, soonest delivery first: what customers still
// owe (so nothing goes out unpaid) and what the shop still has to give back
export function PendingPaymentsCard({ from, to, className }: { from: string; to: string; className?: string }) {
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['dashboard', 'pending-payments', from, to],
    queryFn: () => fetchPendingPayments(from, to),
    refetchInterval: 60_000,
  })

  return (
    <DashboardCard
      title="Pagos pendientes"
      subtitle="Pedidos del período con saldo por cobrar o por reembolsar"
      isPending={isPending}
      isError={isError}
      onRetry={refetch}
      {...(className && { className })}
    >
      {data &&
        (data.orders.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay pagos ni reembolsos pendientes en este período.</p>
        ) : (
          <>
            <div className="flex flex-wrap gap-x-8 gap-y-3">
              <div>
                <div className="text-sm text-muted-foreground">Por cobrar</div>
                <div className="text-3xl font-semibold tabular-nums">{formatMoney(data.debtSum)}</div>
                <div className="text-sm text-muted-foreground">en {orders(data.debtCount)}</div>
              </div>
              {data.refundCount > 0 && (
                <div>
                  <div className="text-sm text-muted-foreground">Por reembolsar</div>
                  <div className="text-3xl font-semibold tabular-nums">{formatMoney(data.refundSum)}</div>
                  <div className="text-sm text-muted-foreground">en {orders(data.refundCount)}</div>
                </div>
              )}
            </div>
            <ul className="-mr-2 flex max-h-80 flex-col overflow-y-auto pr-2 text-sm">
              {data.orders.map((order) => {
                const isRefund = order.kind === 'REFUND'
                return (
                  <li key={order.id} className="border-b last:border-b-0">
                    <Link
                      to={`/pedidos/${order.id}`}
                      className="flex items-center justify-between gap-3 py-2 transition-colors hover:bg-secondary/40 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{order.recipientName}</span>
                        <span className="block text-xs text-muted-foreground tabular-nums">
                          {formatDeliveryDay(order.deliveryDate)} · {formatDeliveryTime(order)}
                          {order.status === 'CANCELLED' && ` · ${STATUS_LABELS.CANCELLED}`}
                        </span>
                      </span>
                      <span className="shrink-0 text-right">
                        <span
                          className={
                            isRefund
                              ? 'block font-medium text-red-700 tabular-nums dark:text-red-400'
                              : 'block font-medium text-amber-700 tabular-nums dark:text-amber-400'
                          }
                        >
                          {isRefund ? 'Reembolsar' : 'Debe'} {formatMoney(order.amount)}
                        </span>
                        <span className="block text-xs text-muted-foreground tabular-nums">
                          {isRefund ? `pagado ${formatMoney(order.netPaid)}` : `de ${formatMoney(order.total)}`}
                        </span>
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ul>
            {data.debtCount + data.refundCount > data.orders.length && (
              <p className="text-center text-xs text-muted-foreground">
                Mostrando {data.orders.length} de {data.debtCount + data.refundCount}
              </p>
            )}
          </>
        ))}
    </DashboardCard>
  )
}
