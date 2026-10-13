import { useQuery } from '@tanstack/react-query'
import { cn } from 'cn'
import { STATUS_DOT_CLASSES, STATUS_LABELS } from '@/features/orders/order-format'
import { DashboardCard } from './DashboardCard'
import { fetchOrdersByStatus } from './dashboard-api'

// How many orders delivered in the period are in each status, including the ones with none
export function OrdersByStatusCard({ from, to }: { from: string; to: string }) {
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
      {data && (
        <>
          <div>
            <div className="text-3xl font-semibold tabular-nums">{data.total}</div>
            <div className="text-sm text-muted-foreground">{data.total === 1 ? 'pedido' : 'pedidos'}</div>
          </div>
          <ul className="flex flex-col gap-1.5 text-sm">
            {data.rows.map((row) => (
              <li key={row.status} className="flex items-center justify-between gap-2">
                <span className={cn('flex items-center gap-2', row.count === 0 && 'text-muted-foreground')}>
                  <span className={cn('size-2 rounded-full', STATUS_DOT_CLASSES[row.status])} aria-hidden />
                  {STATUS_LABELS[row.status]}
                </span>
                <span className={cn('tabular-nums', row.count > 0 && 'font-medium')}>{row.count}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </DashboardCard>
  )
}
