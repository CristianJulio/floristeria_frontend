import { apiFetch } from '@/lib/api-client'

export const ORDER_STATUSES = ['PENDING', 'PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'] as const
export type OrderStatus = (typeof ORDER_STATUSES)[number]

export type OrderItem = {
  productId: string
  productName: string
  price: number
  quantity: number
}

export type OrderBalance = {
  total: number
  paid: number
  refunded: number
  retained: number
  netPaid: number
  amountDue: number
  pendingPayment: number
  pendingRefund: number
}

// Mirrors the backend's OrderDto (only the fields the frontend uses so far)
export type Order = {
  id: string
  senderName: string
  recipientName: string
  addressLine1: string
  addressLine2: string | null
  neighborhood: string | null
  city: string
  responsiblePhone: string
  deliveryDate: string
  deliveryTimeFrom: string | null
  deliveryTimeTo: string | null
  status: OrderStatus
  items: OrderItem[]
  balance: OrderBalance
}

export type Pagination = {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export type OrdersFilters = {
  deliveryFrom: string
  deliveryTo: string
  statuses: OrderStatus[]
  search: string
  pendingPayment: boolean
  pendingRefund: boolean
  page: number
}

export async function fetchOrders(filters: OrdersFilters) {
  return apiFetch<{ data: Order[]; pagination: Pagination }>('/api/orders', {
    query: {
      deliveryFrom: filters.deliveryFrom,
      deliveryTo: filters.deliveryTo,
      // No statuses selected means "all statuses", so the filter is left out
      status: filters.statuses.length > 0 ? filters.statuses.join(',') : undefined,
      search: filters.search.trim() || undefined,
      pendingPayment: filters.pendingPayment || undefined,
      pendingRefund: filters.pendingRefund || undefined,
      page: filters.page,
      pageSize: 20,
    },
  })
}
