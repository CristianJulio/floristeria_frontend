import type { Order, OrderStatus, PaymentMethod, PaymentType } from './orders-api'

export const PAYMENT_TYPE_LABELS: Record<PaymentType, string> = {
  PAYMENT: 'Pago',
  REFUND: 'Reembolso',
  RETAINED: 'Retenido',
}

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  NEQUI: 'Nequi',
  PAYPAL: 'PayPal',
  CASH: 'Efectivo',
}

// An instant (e.g. createdAt), shown in Colombia's time zone: "18 oct 2026, 3:45 p. m."
export function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'America/Bogota',
  }).format(new Date(iso))
}

export const STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: 'Pendiente',
  PREPARING: 'En preparación',
  OUT_FOR_DELIVERY: 'En camino',
  DELIVERED: 'Entregado',
  CANCELLED: 'Cancelado',
}

export const STATUS_CLASSES: Record<OrderStatus, string> = {
  PENDING: 'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100',
  PREPARING: 'bg-blue-100 text-blue-900 dark:bg-blue-900/40 dark:text-blue-100',
  OUT_FOR_DELIVERY: 'bg-violet-100 text-violet-900 dark:bg-violet-900/40 dark:text-violet-100',
  DELIVERED: 'bg-green-100 text-green-900 dark:bg-green-900/40 dark:text-green-100',
  CANCELLED: 'bg-muted text-muted-foreground line-through',
}

import { formatMoney } from '@/lib/money'

// Re-exported so the orders feature keeps importing it from here
export { formatMoney }

// "2026-10-18" -> "sáb 18 oct"; the date is read as a calendar day, not converted between time zones
export function formatDeliveryDay(date: string) {
  const [year, month, day] = date.split('-').map(Number)
  return new Intl.DateTimeFormat('es-CO', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, day)))
}

export function formatDeliveryTime(order: Pick<Order, 'deliveryTimeFrom' | 'deliveryTimeTo'>) {
  const { deliveryTimeFrom: from, deliveryTimeTo: to } = order
  if (from && to) return from === to ? from : `${from}–${to}`
  if (from) return `Desde ${from}`
  if (to) return `Antes de ${to}`
  return 'Sin hora'
}

export function formatItems(order: Pick<Order, 'items'>) {
  return order.items.map((item) => `${item.quantity}× ${item.productName}`).join(', ')
}

export function formatPlace(order: Pick<Order, 'neighborhood' | 'city'>) {
  return order.neighborhood ? `${order.neighborhood}, ${order.city}` : order.city
}

// What still needs attention about money, if anything
export function pendingMoneyLabel(order: Pick<Order, 'balance'>) {
  if (order.balance.pendingPayment > 0) return `Debe ${formatMoney(order.balance.pendingPayment)}`
  if (order.balance.pendingRefund > 0) return `Reembolsar ${formatMoney(order.balance.pendingRefund)}`
  return null
}
