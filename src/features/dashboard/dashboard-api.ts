import { apiFetch } from '@/lib/api-client'
import type { OrderStatus, PaymentMethod } from '@/features/orders/orders-api'

// What the orders delivered in a range are worth. Items are products and extras; delivery is the
// delivery fees; retainedFromCancelled is what was kept from cancelled orders, which are worth only
// that. Collected is what has been paid (minus refunds) on those same orders
export type Income = {
  from: string
  to: string
  orderCount: number
  items: number
  delivery: number
  retainedFromCancelled: number
  total: number
  collected: number
  pendingPayment: number
  pendingRefund: number
}

// Orders of the range that still owe money; `orders` is the first 50, the count and sum cover all
export type PendingPayments = {
  orderCount: number
  pendingSum: number
  orders: {
    id: string
    recipientName: string
    deliveryDate: string
    deliveryTimeFrom: string | null
    deliveryTimeTo: string | null
    total: number
    netPaid: number
    pending: number
  }[]
}

// Payments and refunds recorded in the range, by method
export type CollectedByMethod = {
  rows: { method: PaymentMethod; paid: number; refunded: number; net: number }[]
  paid: number
  refunded: number
  net: number
}

export type OrdersByStatus = {
  rows: { status: OrderStatus; count: number }[]
  total: number
}

const get = async <T>(path: string, from: string, to: string) =>
  (await apiFetch<{ data: T }>(`/api/dashboard/${path}`, { query: { from, to } })).data

export const fetchIncome = (from: string, to: string) => get<Income>('income', from, to)
export const fetchPendingPayments = (from: string, to: string) => get<PendingPayments>('pending-payments', from, to)
export const fetchCollectedByMethod = (from: string, to: string) => get<CollectedByMethod>('collected-by-method', from, to)
export const fetchOrdersByStatus = (from: string, to: string) => get<OrdersByStatus>('orders-by-status', from, to)
