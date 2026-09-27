import { Link, useNavigate } from 'react-router'
import { cn } from 'cn'
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

// Money still to collect (amber) or to give back (red), as a small pill
function PendingMoney({ order }: { order: Order }) {
  const label = pendingMoneyLabel(order)
  if (!label) return null
  const isRefund = order.balance.pendingRefund > 0
  return (
    <span
      className={cn(
        'inline-flex rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap tabular-nums ring-1 ring-inset',
        isRefund
          ? 'bg-red-50 text-red-800 ring-red-200 dark:bg-red-900/30 dark:text-red-100 dark:ring-red-800'
          : 'bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-900/30 dark:text-amber-100 dark:ring-amber-800',
      )}
    >
      {label}
    </span>
  )
}

// Finished orders stay in the list but step back visually
const isClosed = (order: Order) => order.status === 'DELIVERED' || order.status === 'CANCELLED'

const HEAD = 'h-9 text-xs font-medium tracking-wide text-muted-foreground uppercase first:pl-4 last:pr-4'
const CELL = 'py-3 first:pl-4 last:pr-4'

// A table on computers, cards on phones; both open the order's detail
export function OrdersList({ orders }: { orders: Order[] }) {
  const navigate = useNavigate()
  const detailPath = (order: Order) => `/pedidos/${order.id}`

  return (
    <>
      <div className="hidden overflow-hidden rounded-xl border bg-card md:block">
        <Table>
          <TableHeader className="bg-muted/60">
            <TableRow className="hover:bg-transparent">
              <TableHead className={HEAD}>Entrega</TableHead>
              <TableHead className={HEAD}>Destinatario</TableHead>
              <TableHead className={HEAD}>Lugar</TableHead>
              <TableHead className={HEAD}>Productos</TableHead>
              <TableHead className={HEAD}>Estado</TableHead>
              <TableHead className={cn(HEAD, 'text-right')}>Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => (
              <TableRow
                key={order.id}
                className={cn('cursor-pointer hover:bg-secondary/40', isClosed(order) && 'text-muted-foreground')}
                onClick={() => navigate(detailPath(order))}
              >
                <TableCell className={CELL}>
                  <div className="text-[15px] font-medium tabular-nums">{formatDeliveryTime(order)}</div>
                  <div className="text-[13px] text-muted-foreground">{formatDeliveryDay(order.deliveryDate)}</div>
                </TableCell>
                <TableCell className={CELL}>
                  <Link
                    to={detailPath(order)}
                    className={cn('text-[15px] font-medium hover:underline', !isClosed(order) && 'text-foreground')}
                  >
                    {order.recipientName}
                  </Link>
                  <div className="text-[13px] text-muted-foreground">De {order.senderName}</div>
                </TableCell>
                <TableCell className={CELL}>{formatPlace(order)}</TableCell>
                <TableCell className={cn(CELL, 'max-w-64 truncate text-muted-foreground')} title={formatItems(order)}>
                  {formatItems(order)}
                </TableCell>
                <TableCell className={CELL}>
                  <OrderStatusBadge status={order.status} />
                </TableCell>
                <TableCell className={cn(CELL, 'text-right')}>
                  <div className="flex flex-col items-end gap-1">
                    <span className="font-medium tabular-nums">{formatMoney(order.balance.total)}</span>
                    <PendingMoney order={order} />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ul className="flex flex-col gap-3 md:hidden">
        {orders.map((order) => (
          <li key={order.id}>
            <Link
              to={detailPath(order)}
              className={cn(
                'flex flex-col gap-2 rounded-xl border bg-card p-4 transition-colors hover:border-primary/40',
                isClosed(order) && 'text-muted-foreground',
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm">
                  <span className="text-[15px] font-medium tabular-nums">{formatDeliveryTime(order)}</span>
                  <span className="text-muted-foreground"> · {formatDeliveryDay(order.deliveryDate)}</span>
                </span>
                <OrderStatusBadge status={order.status} />
              </div>
              <div>
                <div className={cn('text-base font-medium', !isClosed(order) && 'text-foreground')}>
                  {order.recipientName}
                </div>
                <div className="text-sm text-muted-foreground">{formatPlace(order)}</div>
              </div>
              <div className="truncate text-sm text-muted-foreground">{formatItems(order)}</div>
              <div className="flex items-center justify-between gap-2 border-t pt-2 text-sm">
                <span className="font-medium tabular-nums">{formatMoney(order.balance.total)}</span>
                <PendingMoney order={order} />
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </>
  )
}
