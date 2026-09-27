import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Link } from 'react-router'
import { Flower2Icon } from 'lucide-react'
import { useAuth } from '@/features/auth/auth-context'
import { Button } from '@/components/ui/button'
import { PaginationControls } from '@/components/PaginationControls'
import { todayInColombia } from '@/lib/dates'
import { OrdersFilterBar } from './OrdersFilterBar'
import { OrdersList } from './OrdersList'
import { formatDeliveryDay } from './order-format'
import { fetchOrders } from './orders-api'
import { useOrderFilters } from './useOrderFilters'

// The home page: today's deliveries by default, with every filter kept in the address
export function OrdersListPage() {
  const { filters, setFilters } = useOrderFilters()
  const { can } = useAuth()
  const today = todayInColombia()
  const isToday = filters.deliveryFrom === today && filters.deliveryTo === today

  const { data, isPending, isError, isFetching, refetch } = useQuery({
    queryKey: ['orders', filters],
    queryFn: () => fetchOrders(filters),
    // Keeps the current page on screen while the next one loads
    placeholderData: keepPreviousData,
  })

  const dates =
    filters.deliveryFrom === filters.deliveryTo
      ? formatDeliveryDay(filters.deliveryFrom)
      : `${formatDeliveryDay(filters.deliveryFrom)} – ${formatDeliveryDay(filters.deliveryTo)}`
  const total = data?.pagination.total

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-xl font-semibold">{isToday ? 'Entregas de hoy' : 'Pedidos'}</h1>
          <p className="text-sm text-muted-foreground first-letter:uppercase">
            {dates}
            {total !== undefined && ` · ${total} ${total === 1 ? 'pedido' : 'pedidos'}`}
          </p>
        </div>
        {can('orders.create') && (
          <Button nativeButton={false} render={<Link to="/pedidos/nuevo" />}>
            Nuevo pedido
          </Button>
        )}
      </div>

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
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed bg-card px-6 py-12 text-center">
          <Flower2Icon className="size-8 text-primary/60" aria-hidden />
          <p className="font-medium">No hay pedidos con estos filtros.</p>
          <p className="text-sm text-muted-foreground">Prueba con otras fechas u otros estados.</p>
        </div>
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
