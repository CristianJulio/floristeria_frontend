import { Link, useNavigate } from 'react-router'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  formatDeliveryDay,
  formatDeliveryTime,
  formatItems,
  formatMoney,
  formatPlace,
  pendingMoneyLabel,
} from './order-format'
import { OrderStatusBadge } from './OrderStatusBadge'
import type { Order } from './orders-api'

function PendingMoney({ order }: { order: Order }) {
  const label = pendingMoneyLabel(order)
  if (!label) return null
  const isRefund = order.balance.pendingRefund > 0
  return <span className={isRefund ? 'text-destructive' : 'text-amber-700 dark:text-amber-400'}>{label}</span>
}

// A table on computers, cards on phones; both open the order's detail
export function OrdersList({ orders }: { orders: Order[] }) {
  const navigate = useNavigate()
  const detailPath = (order: Order) => `/pedidos/${order.id}`

  return (
    <>
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Entrega</TableHead>
              <TableHead>Destinatario</TableHead>
              <TableHead>Lugar</TableHead>
              <TableHead>Productos</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => (
              <TableRow key={order.id} className="cursor-pointer" onClick={() => navigate(detailPath(order))}>
                <TableCell>
                  <div className="font-medium">{formatDeliveryTime(order)}</div>
                  <div className="text-xs text-muted-foreground">{formatDeliveryDay(order.deliveryDate)}</div>
                </TableCell>
                <TableCell>
                  <Link to={detailPath(order)} className="font-medium hover:underline">
                    {order.recipientName}
                  </Link>
                </TableCell>
                <TableCell>{formatPlace(order)}</TableCell>
                <TableCell className="max-w-64 truncate" title={formatItems(order)}>
                  {formatItems(order)}
                </TableCell>
                <TableCell>
                  <OrderStatusBadge status={order.status} />
                </TableCell>
                <TableCell className="text-right">
                  <div>{formatMoney(order.balance.total)}</div>
                  <div className="text-xs">
                    <PendingMoney order={order} />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ul className="flex flex-col gap-2 md:hidden">
        {orders.map((order) => (
          <li key={order.id}>
            <Link
              to={detailPath(order)}
              className="flex flex-col gap-1 rounded-lg border p-3 transition-colors hover:bg-muted"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{formatDeliveryTime(order)}</span>
                <OrderStatusBadge status={order.status} />
              </div>
              <div className="font-medium">{order.recipientName}</div>
              <div className="text-sm text-muted-foreground">
                {formatPlace(order)} · {formatDeliveryDay(order.deliveryDate)}
              </div>
              <div className="truncate text-sm">{formatItems(order)}</div>
              <div className="flex items-center justify-between text-sm">
                <span>{formatMoney(order.balance.total)}</span>
                <PendingMoney order={order} />
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </>
  )
}
