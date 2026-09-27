import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Link } from 'react-router'
import { Flower2Icon } from 'lucide-react'
import { useAuth } from '@/features/auth/auth-context'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/EmptyState'
import { PaginationControls } from '@/components/PaginationControls'
import { LoadingState } from '@/components/LoadingState'
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
        <LoadingState label="Cargando pedidos…" />
      ) : isError ? (
        <div className="flex items-center gap-3 text-sm">
          <span className="text-destructive">No se pudieron cargar los pedidos.</span>
          <Button size="sm" variant="outline" onClick={() => refetch()}>
            Reintentar
          </Button>
        </div>
      ) : data.data.length === 0 ? (
        <EmptyState
          icon={Flower2Icon}
          title="No hay pedidos con estos filtros."
          hint="Prueba con otras fechas u otros estados."
        />
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
