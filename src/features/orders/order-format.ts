import type { Order, OrderPayment, OrderStatus, PaymentMethod, PaymentType } from './orders-api'

export const PAYMENT_TYPE_LABELS: Record<PaymentType, string> = {
  PAYMENT: 'Pago',
  REFUND: 'Reembolso',
  RETAINED: 'Retenido',
}

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  NEQUI: 'Nequi',
  PAYPAL: 'PayPal',
  CASH: 'Efectivo',
  BANCOLOMBIA: 'Bancolombia',
  WESTERN_UNION: 'Western Union',
  BRE_B: 'Bre-B',
  DAVIPLATA: 'Daviplata',
}

// "Pago · Nequi"; retained amounts move no money, so they usually have no method
export function paymentLabel(payment: Pick<OrderPayment, 'type' | 'method'>) {
  const type = PAYMENT_TYPE_LABELS[payment.type]
  return payment.method ? `${type} · ${PAYMENT_METHOD_LABELS[payment.method]}` : type
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
  READY: 'Realizado',
  OUT_FOR_DELIVERY: 'En camino',
  DELIVERED: 'Entregado',
  CANCELLED: 'Cancelado',
}

export const STATUS_CLASSES: Record<OrderStatus, string> = {
  PENDING: 'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100',
  PREPARING: 'bg-petal text-petal-foreground',
  READY: 'bg-violet-100 text-violet-900 dark:bg-violet-900/40 dark:text-violet-100',
  OUT_FOR_DELIVERY: 'bg-blue-100 text-blue-900 dark:bg-blue-900/40 dark:text-blue-100',
  DELIVERED: 'bg-green-100 text-green-900 dark:bg-green-900/40 dark:text-green-100',
  CANCELLED: 'bg-red-100 text-red-900 dark:bg-red-900/40 dark:text-red-100',
}

// Small coloured dot for each status, used in the status filter chips
export const STATUS_COLORS: Record<OrderStatus, string> = {
  PENDING: 'var(--status-pending)',
  PREPARING: 'var(--status-preparing)',
  READY: 'var(--status-ready)',
  OUT_FOR_DELIVERY: 'var(--status-out)',
  DELIVERED: 'var(--status-delivered)',
  CANCELLED: 'var(--status-cancelled)',
}

export const STATUS_DOT_CLASSES: Record<OrderStatus, string> = {
  PENDING: 'bg-[var(--status-pending)]',
  PREPARING: 'bg-[var(--status-preparing)]',
  READY: 'bg-[var(--status-ready)]',
  OUT_FOR_DELIVERY: 'bg-[var(--status-out)]',
  DELIVERED: 'bg-[var(--status-delivered)]',
  CANCELLED: 'bg-[var(--status-cancelled)]',
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

// "14:30" -> "2:30 PM"
export function formatClock(time: string) {
  const [h, m] = time.split(':').map(Number)
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`
}

// Customers often ask for "in the morning" or "in the afternoon" with no exact time; those are fixed ranges
export const DAY_PARTS = [
  { label: 'En la mañana', from: '06:00', to: '12:00' },
  { label: 'En la tarde', from: '12:00', to: '18:00' },
] as const

// Common two-hour ranges, one tap each when the exact range is not worth picking by hand
export const TIME_SLOTS = [
  { label: '8–10 AM', from: '08:00', to: '10:00' },
  { label: '10 AM–12 PM', from: '10:00', to: '12:00' },
  { label: '12–2 PM', from: '12:00', to: '14:00' },
  { label: '2–4 PM', from: '14:00', to: '16:00' },
  { label: '4–6 PM', from: '16:00', to: '18:00' },
] as const

export const dayPartOf = (from: string | null | undefined, to: string | null | undefined) =>
  DAY_PARTS.find((part) => part.from === from && part.to === to)
export function formatDeliveryTime(order: Pick<Order, 'deliveryTimeFrom' | 'deliveryTimeTo'>) {
  const part = dayPartOf(order.deliveryTimeFrom, order.deliveryTimeTo)
  if (part) return part.label
  const from = order.deliveryTimeFrom && formatClock(order.deliveryTimeFrom)
  const to = order.deliveryTimeTo && formatClock(order.deliveryTimeTo)
  if (from && to) return from === to ? from : `${from}–${to}`
  if (from) return `Desde ${from}`
  if (to) return `Antes de ${to}`
  return 'Sin hora'
}

// What carrying both ribbon and card adds to a crown; the API applies the same amount
export const CROWN_RIBBON_AND_CARD_SURCHARGE = 10_000

export const surchargeOf = (item: { withRibbon: boolean; withCard: boolean }) =>
  item.withRibbon && item.withCard ? CROWN_RIBBON_AND_CARD_SURCHARGE : 0

// "Con cinta", "Con tarjeta", "Con cinta y tarjeta"; null when it carries neither
export function formatExtras(item: { withRibbon: boolean; withCard: boolean }) {
  if (item.withRibbon && item.withCard) return 'Con cinta y tarjeta'
  if (item.withRibbon) return 'Con cinta'
  if (item.withCard) return 'Con tarjeta'
  return null
}

// The products and then the extras, e.g. "1× Ramo rosas, 2× Globo"
export function formatItems(order: Pick<Order, 'items' | 'extras'>) {
  return [...order.items.map((item) => ({ ...item, name: item.productName })), ...order.extras]
    .map((line) => `${line.quantity}× ${line.name}`)
    .join(', ')
}

// The street address with its complement, e.g. "Calle 84 #45-12, Apto 502"
export function formatAddress(order: Pick<Order, 'addressLine1' | 'addressLine2'>) {
  return [order.addressLine1, order.addressLine2].filter(Boolean).join(', ')
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
