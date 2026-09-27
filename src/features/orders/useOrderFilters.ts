import { useSearchParams } from 'react-router'
import { todayInColombia } from '@/lib/dates'
import { ORDER_STATUSES, type OrderStatus, type OrdersFilters } from './orders-api'

// Without a status filter in the address, the list shows what's still to do
export const DEFAULT_STATUSES: OrderStatus[] = ['PENDING', 'PREPARING', 'OUT_FOR_DELIVERY']

function parseStatuses(value: string | null): OrderStatus[] {
  if (value === null) return DEFAULT_STATUSES
  return value.split(',').filter((status): status is OrderStatus =>
    (ORDER_STATUSES as readonly string[]).includes(status),
  )
}

// The filters live in the page's address (?desde=...&estado=...), so reloading,
// going back from an order, or sharing the link keeps the same view
export function useOrderFilters() {
  const [params, setParams] = useSearchParams()
  const today = todayInColombia()

  const filters: OrdersFilters = {
    deliveryFrom: params.get('desde') ?? today,
    deliveryTo: params.get('hasta') ?? today,
    statuses: parseStatuses(params.get('estado')),
    search: params.get('buscar') ?? '',
    pendingPayment: params.get('pago') === 'pendiente',
    pendingRefund: params.get('reembolso') === 'pendiente',
    page: Math.max(1, Number(params.get('pagina')) || 1),
  }

  // Any change other than the page goes back to page 1
  const setFilters = (changes: Partial<OrdersFilters>) => {
    const next = { ...filters, ...changes, page: changes.page ?? 1 }
    const nextParams = new URLSearchParams()
    if (next.deliveryFrom !== today) nextParams.set('desde', next.deliveryFrom)
    if (next.deliveryTo !== today) nextParams.set('hasta', next.deliveryTo)
    const isDefaultStatuses =
      next.statuses.length === DEFAULT_STATUSES.length &&
      DEFAULT_STATUSES.every((status) => next.statuses.includes(status))
    if (!isDefaultStatuses) nextParams.set('estado', next.statuses.join(','))
    if (next.search) nextParams.set('buscar', next.search)
    if (next.pendingPayment) nextParams.set('pago', 'pendiente')
    if (next.pendingRefund) nextParams.set('reembolso', 'pendiente')
    if (next.page > 1) nextParams.set('pagina', String(next.page))
    setParams(nextParams, { replace: true })
  }

  return { filters, setFilters }
}
