import { apiFetch } from '@/lib/api-client'
import type { OrderStatus, PaymentMethod } from '@/features/orders/orders-api'

// What the orders delivered in a range are worth. Items are products and extras; delivery is the
// delivery fees; retainedFromCancelled is what was kept from cancelled orders, which are worth only
// that. Collected is what has been paid (minus refunds) on those same orders
export type Income = {
  from: string
  to: string
  orderCount: number
  cancelledCount: number
  items: number
  delivery: number
  retainedFromCancelled: number
  total: number
  collected: number
  feePerOrder: number
  fee: number
}

// Orders, of any delivery date, with money still to move: the customer owes the shop (kind PAYMENT) or the shop
// owes the customer back (kind REFUND). `orders` is the first 50; the counts and sums cover all of them
export type PendingPayments = {
  debtCount: number
  debtSum: number
  refundCount: number
  refundSum: number
  orders: {
    id: string
    status: OrderStatus
    recipientName: string
    deliveryDate: string
    deliveryTimeFrom: string | null
    deliveryTimeTo: string | null
    total: number
    netPaid: number
    kind: 'PAYMENT' | 'REFUND'
    amount: number
  }[]
}

// Payments and refunds recorded in the range, by method
export type CollectedByMethod = {
  rows: { method: PaymentMethod; paid: number; refunded: number; net: number }[]
  paid: number
  refunded: number
  net: number
}

// Catalog products ranked by units sold in the range: the ten best, and the ten worst among the
// products on sale today (which includes the ones that sold nothing)
export type TopProduct = { id: string; name: string; category: string; units: number; revenue: number }

export type TopProducts = { best: TopProduct[]; worst: TopProduct[] }

// What the orders delivered are worth, bar by bar. The step (day, week or month) is picked by the
// backend from the length of the range; every step in the range is there, with zero when empty
export type SalesByDay = {
  bucket: 'day' | 'week' | 'month'
  rows: { start: string; total: number; orders: number }[]
}

export type SalesByCategory = {
  rows: { category: string; units: number; revenue: number }[]
  total: number
}

export type Crowns = {
  crowns: number
  revenue: number
  ribbonAndCard: number
  ribbonOnly: number
  cardOnly: number
  neither: number
  surcharge: number
}

export type Extras = {
  lines: number
  units: number
  revenue: number
  top: { name: string; units: number; revenue: number }[]
}

export type Cancellations = {
  cancelled: number
  total: number
  retained: number
  reasons: { reason: string; count: number }[]
}

export type OrdersByStatus = {
  rows: { status: OrderStatus; count: number }[]
  total: number
}

const get = async <T>(path: string, from: string, to: string) =>
  (await apiFetch<{ data: T }>(`/api/dashboard/${path}`, { query: { from, to } })).data

export const fetchIncome = (from: string, to: string) => get<Income>('income', from, to)
export const fetchPendingPayments = async () => (await apiFetch<{ data: PendingPayments }>('/api/dashboard/pending-payments')).data
export const fetchCollectedByMethod = (from: string, to: string) => get<CollectedByMethod>('collected-by-method', from, to)
export const fetchTopProducts = (from: string, to: string) => get<TopProducts>('top-products', from, to)
export const fetchSalesByDay = (from: string, to: string) => get<SalesByDay>('sales-by-day', from, to)
export const fetchSalesByCategory = (from: string, to: string) => get<SalesByCategory>('sales-by-category', from, to)
export const fetchCrowns = (from: string, to: string) => get<Crowns>('crowns', from, to)
export const fetchExtras = (from: string, to: string) => get<Extras>('extras', from, to)
export const fetchCancellations = (from: string, to: string) => get<Cancellations>('cancellations', from, to)
export const fetchOrdersByStatus = (from: string, to: string) => get<OrdersByStatus>('orders-by-status', from, to)
