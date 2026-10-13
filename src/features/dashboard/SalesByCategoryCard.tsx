import { useQuery } from '@tanstack/react-query'
import { cn } from 'cn'
import { formatMoney } from '@/lib/money'
import { CATEGORY_LABELS, type ProductCategory } from '@/features/products/products-api'
import { DashboardCard } from './DashboardCard'
import { fetchSalesByCategory } from './dashboard-api'

// What the catalog products brought in, by category: a bar each, as a share of the whole. One hue,
// since it only says "more" or "less"; the categories with nothing sold stay listed, quietly
export function SalesByCategoryCard({ from, to }: { from: string; to: string }) {
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['dashboard', 'sales-by-category', from, to],
    queryFn: () => fetchSalesByCategory(from, to),
    refetchInterval: 60_000,
  })

  // Biggest first; ties keep the catalog's own order
  const rows = [...(data?.rows ?? [])].sort((a, b) => b.revenue - a.revenue)

  return (
    <DashboardCard
      title="Ventas por categoría"
      subtitle="Productos del catálogo, según el día de entrega"
      isPending={isPending}
      isError={isError}
      onRetry={refetch}
    >
      {data &&
        (data.total === 0 ? (
          <p className="text-sm text-muted-foreground">No se vendió ningún producto en este período.</p>
        ) : (
          <ul className="flex flex-col gap-3 text-sm">
            {rows.map((row) => {
              const share = row.revenue / data.total
              return (
                <li key={row.category} className="flex flex-col gap-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className={cn('font-medium', row.revenue === 0 && 'font-normal text-muted-foreground')}>
                      {CATEGORY_LABELS[row.category as ProductCategory]}
                    </span>
                    <span className="flex items-baseline gap-2 tabular-nums">
                      <span className="text-xs text-muted-foreground">
                        {row.units} {row.units === 1 ? 'unidad' : 'unidades'}
                      </span>
                      <span className={cn(row.revenue > 0 && 'font-medium')}>{formatMoney(row.revenue)}</span>
                      <span className="w-10 text-right text-xs text-muted-foreground">
                        {row.revenue > 0 ? `${Math.round(share * 100)} %` : ''}
                      </span>
                    </span>
                  </div>
                  <div className="h-1 overflow-hidden rounded-full bg-muted" aria-hidden>
                    <div className="h-full rounded-full bg-primary" style={{ width: `${share * 100}%` }} />
                  </div>
                </li>
              )
            })}
          </ul>
        ))}
    </DashboardCard>
  )
}
