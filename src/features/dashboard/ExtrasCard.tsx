import { useQuery } from '@tanstack/react-query'
import { formatMoney } from '@/lib/money'
import { DashboardCard } from './DashboardCard'
import { fetchExtras } from './dashboard-api'

// The extras asked for in the period (things that aren't catalog products): how many, what they
// brought in, and the ones asked for most. Names that only differ in case or spaces count as one
export function ExtrasCard({ from, to }: { from: string; to: string }) {
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['dashboard', 'extras', from, to],
    queryFn: () => fetchExtras(from, to),
    refetchInterval: 60_000,
  })

  return (
    <DashboardCard
      title="Adicionales"
      subtitle="Lo que no es del catálogo, según el día de entrega"
      isPending={isPending}
      isError={isError}
      onRetry={refetch}
    >
      {data &&
        (data.units === 0 ? (
          <p className="text-sm text-muted-foreground">No se pidieron adicionales en este período.</p>
        ) : (
          <>
            <div className="flex flex-col gap-1.5 text-sm">
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Adicionales pedidos</span>
                <span className="font-medium tabular-nums">{data.units}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Ingresos por adicionales</span>
                <span className="tabular-nums">{formatMoney(data.revenue)}</span>
              </div>
            </div>
            <div className="flex flex-col gap-1.5 border-t pt-3 text-sm">
              <div className="text-xs text-muted-foreground">Los más pedidos</div>
              <ul className="flex flex-col gap-1">
                {data.top.map((extra) => (
                  <li key={extra.name} className="flex justify-between gap-3">
                    <span className="min-w-0 truncate" title={extra.name}>
                      {extra.name}
                    </span>
                    <span className="flex shrink-0 items-baseline gap-2 tabular-nums">
                      <span className="font-medium">{extra.units}</span>
                      <span className="w-24 text-right text-xs text-muted-foreground">
                        {formatMoney(extra.revenue)}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </>
        ))}
    </DashboardCard>
  )
}
