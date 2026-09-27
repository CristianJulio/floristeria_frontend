import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { PaginationControls } from '@/components/PaginationControls'
import { todayInColombia } from '@/lib/dates'
import { OrdersFilterBar } from './OrdersFilterBar'
import { OrdersList } from './OrdersList'
import { fetchOrders } from './orders-api'
import { useOrderFilters } from './useOrderFilters'

// The home page: today's deliveries by default, with every filter kept in the address
export function OrdersListPage() {
  const { filters, setFilters } = useOrderFilters()
  const today = todayInColombia()
  const isToday = filters.deliveryFrom === today && filters.deliveryTo === today

  const { data, isPending, isError, isFetching, refetch } = useQuery({
    queryKey: ['orders', filters],
    queryFn: () => fetchOrders(filters),
    // Keeps the current page on screen while the next one loads
    placeholderData: keepPreviousData,
  })

  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold">{isToday ? 'Entregas de hoy' : 'Pedidos'}</h1>

      <OrdersFilterBar filters={filters} onChange={setFilters} />

      {isPending ? (
        <p className="text-sm text-muted-foreground">Cargando pedidos…</p>
      ) : isError ? (
        <div className="flex items-center gap-3 text-sm">
          <span className="text-destructive">No se pudieron cargar los pedidos.</span>
          <Button size="sm" variant="outline" onClick={() => refetch()}>
            Reintentar
          </Button>
        </div>
      ) : data.data.length === 0 ? (
        <p className="text-sm text-muted-foreground">No hay pedidos con estos filtros.</p>
      ) : (
        <div className={isFetching ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
          <OrdersList orders={data.data} />
        </div>
      )}

      {data && (
        <PaginationControls
          page={data.pagination.page}
          totalPages={data.pagination.totalPages}
          total={data.pagination.total}
          onPageChange={(page) => setFilters({ page })}
        />
      )}
    </section>
  )
}
