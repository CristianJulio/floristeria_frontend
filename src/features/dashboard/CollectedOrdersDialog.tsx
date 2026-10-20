import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { formatMoney } from '@/lib/money'
import { STATUS_LABELS, formatDeliveryDay } from '@/features/orders/order-format'
import { fetchCollectedOrders } from './dashboard-api'

// The orders behind the "Cobrado" figure: what each one brought in during the period, by the day the
// payments were recorded, whatever the day it is delivered
export function CollectedOrdersDialog({
  from,
  to,
  open,
  onOpenChange,
}: {
  from: string
  to: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['dashboard', 'collected-orders', from, to],
    queryFn: () => fetchCollectedOrders(from, to),
    enabled: open,
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Pedidos cobrados</DialogTitle>
          <DialogDescription>
            Pagos registrados {from === to ? formatDeliveryDay(from) : `del ${formatDeliveryDay(from)} al ${formatDeliveryDay(to)}`},
            sin importar el día de entrega
          </DialogDescription>
        </DialogHeader>

        {isPending ? (
          <p className="text-sm text-muted-foreground">Cargando…</p>
        ) : isError ? (
          <p className="text-sm text-destructive">
            No se pudo cargar.{' '}
            <button type="button" className="underline" onClick={() => refetch()}>
              Reintentar
            </button>
          </p>
        ) : data.orders.length === 0 ? (
          <p className="text-sm text-muted-foreground">No se registraron pagos en este período.</p>
        ) : (
          <>
            <ul className="-mr-2 flex max-h-96 flex-col overflow-y-auto pr-2">
              {data.orders.map((order) => (
                <li key={order.id} className="border-b last:border-b-0">
                  <Link
                    to={`/pedidos/${order.id}`}
                    className="flex items-center justify-between gap-3 py-2 transition-colors hover:bg-secondary/40 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{order.recipientName}</span>
                      <span className="block text-xs text-muted-foreground tabular-nums">
                        Entrega {formatDeliveryDay(order.deliveryDate)} · {STATUS_LABELS[order.status]}
                      </span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block font-medium tabular-nums">{formatMoney(order.net)}</span>
                      {order.refunded > 0 && (
                        <span className="block text-xs text-muted-foreground tabular-nums">
                          {formatMoney(order.paid)} − {formatMoney(order.refunded)} reembolsado
                        </span>
                      )}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            <p className="text-xs text-muted-foreground">
              {data.orderCount} {data.orderCount === 1 ? 'pedido' : 'pedidos'}
              {data.orderCount > data.orders.length && ` · mostrando ${data.orders.length}`}
            </p>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
