import { useQuery } from '@tanstack/react-query'
import { formatMoney } from '@/lib/money'
import { CATEGORY_LABELS, type ProductCategory } from '@/features/products/products-api'
import { DashboardCard } from './DashboardCard'
import { fetchTopProducts } from './dashboard-api'

const CONFIG = {
  best: {
    title: 'Productos más vendidos',
    subtitle: 'Los 10 con más unidades en el período',
    empty: 'No se vendió ningún producto en este período.',
  },
  worst: {
    title: 'Productos menos vendidos',
    subtitle: 'Los 10 con menos unidades, incluidos los que no se vendieron',
    empty: 'No hay productos disponibles en el catálogo.',
  },
} as const

// A ranking of catalog products by units sold in the period (cancelled orders and loose extras are
// left out). The bar is each product's units against the biggest in the list: a single hue, since it
// only says "more" or "less". Both lists come from one request
export function TopProductsCard({ kind, from, to }: { kind: 'best' | 'worst'; from: string; to: string }) {
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['dashboard', 'top-products', from, to],
    queryFn: () => fetchTopProducts(from, to),
    refetchInterval: 60_000,
  })
  const { title, subtitle, empty } = CONFIG[kind]
  const rows = data?.[kind] ?? []
  const most = Math.max(...rows.map((row) => row.units), 1)

  return (
    <DashboardCard title={title} subtitle={subtitle} isPending={isPending} isError={isError} onRetry={refetch}>
      {data &&
        (rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">{empty}</p>
        ) : (
          <ol className="flex flex-col text-sm">
            {rows.map((row, index) => (
              <li key={row.id} className="flex items-center gap-3 border-b py-2 last:border-b-0">
                <span className="w-5 shrink-0 text-right text-xs text-muted-foreground tabular-nums">{index + 1}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{row.name}</span>
                  <span className="block text-xs text-muted-foreground">
                    {CATEGORY_LABELS[row.category as ProductCategory]}
                  </span>
                  <span className="mt-1 block h-1 overflow-hidden rounded-full bg-muted" aria-hidden>
                    <span
                      className="block h-full rounded-full bg-primary"
                      style={{ width: `${(row.units / most) * 100}%` }}
                    />
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block font-medium tabular-nums">
                    {row.units} {row.units === 1 ? 'unidad' : 'unidades'}
                  </span>
                  <span className="block text-xs text-muted-foreground tabular-nums">{formatMoney(row.revenue)}</span>
                </span>
              </li>
            ))}
          </ol>
        ))}
    </DashboardCard>
  )
}
