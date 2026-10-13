import { apiFetch } from '@/lib/api-client'

// What the orders delivered in a range are worth. Items are products and extras; delivery is the
// delivery fees. Collected is what has been paid (minus refunds) on those same orders
export type Income = {
  from: string
  to: string
  orderCount: number
  items: number
  delivery: number
  total: number
  collected: number
  pendingPayment: number
  pendingRefund: number
}

export async function fetchIncome(from: string, to: string) {
  const body = await apiFetch<{ data: Income }>('/api/dashboard/income', { query: { from, to } })
  return body.data
}
