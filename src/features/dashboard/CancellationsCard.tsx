import { useQuery } from '@tanstack/react-query'
import { formatMoney } from '@/lib/money'
import { DashboardCard } from './DashboardCard'
import { fetchCancellations } from './dashboard-api'

// How many of the orders were cancelled, what was kept from them, and why. The reasons are free text
// typed by staff, so only the ones that repeat in the same words add up
export function CancellationsCard({ from, to }: { from: string; to: string }) {
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['dashboard', 'cancellations', from, to],
    queryFn: () => fetchCancellations(from, to),
    refetchInterval: 60_000,
  })

  return (
    <DashboardCard
      title="Cancelaciones"
      subtitle="Pedidos cancelados, según su día de entrega"
      isPending={isPending}
      isError={isError}
      onRetry={refetch}
    >
      {data &&
        (data.cancelled === 0 ? (
          <p className="text-sm text-muted-foreground">No se cancelaron pedidos en este período.</p>
        ) : (
          <>
            <div className="flex flex-col gap-1.5 text-sm">
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Cancelados</span>
                <span className="tabular-nums">
                  <span className="font-medium">{data.cancelled}</span> de {data.total}
                  <span className="ml-2 text-xs text-muted-foreground">
                    {Math.round((data.cancelled / data.total) * 100)} %
                  </span>
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Retenido</span>
                <span className="tabular-nums">{formatMoney(data.retained)}</span>
              </div>
            </div>
            <div className="flex flex-col gap-1.5 border-t pt-3 text-sm">
              <div className="text-xs text-muted-foreground">Motivos más comunes</div>
              <ul className="flex flex-col gap-1">
                {data.reasons.map((reason) => (
                  <li key={reason.reason} className="flex justify-between gap-3">
                    <span className="min-w-0 truncate" title={reason.reason}>
                      {reason.reason}
                    </span>
                    <span className="shrink-0 font-medium tabular-nums">{reason.count}</span>
                  </li>
                ))}
              </ul>
            </div>
          </>
        ))}
    </DashboardCard>
  )
}
