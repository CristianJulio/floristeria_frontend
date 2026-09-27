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

export type AuditUser = {
  id: string
  username: string
}

export type PaymentType = 'PAYMENT' | 'REFUND' | 'RETAINED'
export type PaymentMethod = 'NEQUI' | 'PAYPAL' | 'CASH'

export type OrderPayment = {
  id: string
  type: PaymentType
  amount: number
  method: PaymentMethod
  sourceAccount: string | null
  createdAt: string
  createdBy: AuditUser
  voidedAt: string | null
  voidedBy: AuditUser | null
  voidReason: string | null
}

// Mirrors the backend's OrderDto; dates arrive as ISO strings in JSON
export type Order = {
  id: string
  senderName: string
  recipientName: string
  addressLine1: string
  addressLine2: string | null
  neighborhood: string | null
  city: string
  deliveryNotes: string | null
  cardMessage: string | null
  responsiblePhone: string
  deliveryDate: string
  deliveryTimeFrom: string | null
  deliveryTimeTo: string | null
  status: OrderStatus
  cancellationReason: string | null
  items: OrderItem[]
  payments: OrderPayment[]
  balance: OrderBalance
  createdAt: string
  createdBy: AuditUser
  updatedAt: string | null
  updatedBy: AuditUser | null
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

export async function fetchOrder(id: string) {
  const body = await apiFetch<{ data: Order }>(`/api/orders/${id}`)
  return body.data
}

// A reason is required exactly when the new status is CANCELLED
export async function changeOrderStatus(id: string, status: OrderStatus, cancellationReason?: string) {
  const body = await apiFetch<{ data: Order }>(`/api/orders/${id}/status`, {
    method: 'PATCH',
    body: { status, ...(cancellationReason && { cancellationReason }) },
  })
  return body.data
}

export type CreateOrderInput = {
  senderName: string
  recipientName: string
  addressLine1: string
  addressLine2?: string
  neighborhood?: string
  city: string
  deliveryNotes?: string
  cardMessage?: string
  responsiblePhone: string
  deliveryDate: string
  deliveryTimeFrom?: string
  deliveryTimeTo?: string
  items: { productId: string; quantity: number }[]
}

export async function createOrder(input: CreateOrderInput) {
  const body = await apiFetch<{ data: Order }>('/api/orders', { method: 'POST', body: input })
  return body.data
}

// Only the fields sent change; null clears an optional field
export type UpdateOrderInput = {
  senderName?: string
  recipientName?: string
  addressLine1?: string
  addressLine2?: string | null
  neighborhood?: string | null
  city?: string
  deliveryNotes?: string | null
  cardMessage?: string | null
  responsiblePhone?: string
  deliveryDate?: string
  deliveryTimeFrom?: string | null
  deliveryTimeTo?: string | null
}

export async function updateOrderDetails(id: string, changes: UpdateOrderInput) {
  const body = await apiFetch<{ data: Order }>(`/api/orders/${id}`, { method: 'PATCH', body: changes })
  return body.data
}

// Replaces the whole list; the backend prices every item at today's catalog price
export async function replaceOrderItems(id: string, items: { productId: string; quantity: number }[]) {
  const body = await apiFetch<{ data: Order }>(`/api/orders/${id}/items`, { method: 'PUT', body: { items } })
  return body.data
}

export type RecordPaymentInput = {
  type: PaymentType
  amount: number
  method: PaymentMethod
  sourceAccount?: string
}

export async function recordPayment(orderId: string, input: RecordPaymentInput) {
  const body = await apiFetch<{ data: Order }>(`/api/orders/${orderId}/payments`, {
    method: 'POST',
    body: input,
  })
  return body.data
}

export async function voidPayment(orderId: string, paymentId: string, reason: string) {
  const body = await apiFetch<{ data: Order }>(`/api/orders/${orderId}/payments/${paymentId}/void`, {
    method: 'PATCH',
    body: { reason },
  })
  return body.data
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
