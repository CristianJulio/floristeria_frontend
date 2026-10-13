import { apiFetch } from '@/lib/api-client'
import type { ContactType } from '@/lib/phone'
import type { ProductCategory } from '@/features/products/products-api'

export const ORDER_STATUSES = ['PENDING', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'] as const
export type OrderStatus = (typeof ORDER_STATUSES)[number]

// A line of the order. Crowns are one line each and carry the details below
export type OrderItem = {
  id: string
  productId: string
  productName: string
  category: ProductCategory
  // The product's current picture, if it has one
  imageUrl: string | null
  price: number
  quantity: number
  deceasedName: string | null
  roomNumber: string | null
  withRibbon: boolean
  // What the ribbon says; null when it has no text
  ribbonText: string | null
  withCard: boolean
  // What carrying both ribbon and card adds to the line
  surcharge: number
}

// Something asked for that isn't a catalog product, named and priced on the order
export type OrderExtra = {
  id: string
  name: string
  price: number
  quantity: number
}

export type OrderExtraInput = { name: string; price: number; quantity: number }

// What the API takes for each line; the crown details only go with crowns
export type OrderItemInput = {
  productId: string
  quantity: number
  deceasedName?: string
  roomNumber?: string
  withRibbon?: boolean
  ribbonText?: string
  withCard?: boolean
}

export type OrderBalance = {
  // The items alone; total adds the delivery fee
  subtotal: number
  total: number
  paid: number
  refunded: number
  retained: number
  netPaid: number
  amountDue: number
  pendingPayment: number
  pendingRefund: number
  // Half the total must be paid before preparing starts; missingToStart is 0 once it is
  minimumToStart: number
  missingToStart: number
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
  // Null for retained amounts, which move no money
  method: PaymentMethod | null
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
  recipientContact: string | null
  recipientContactType: ContactType | null
  addressLine1: string
  addressLine2: string | null
  neighborhood: string | null
  city: string
  deliveryNotes: string | null
  cardMessage: string | null
  responsiblePhone: string
  responsibleContactType: ContactType
  deliveryDate: string
  deliveryTimeFrom: string | null
  deliveryTimeTo: string | null
  deliveryFee: number
  status: OrderStatus
  cancellationReason: string | null
  items: OrderItem[]
  extras: OrderExtra[]
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
  recipientContact?: string
  recipientContactType?: ContactType
  addressLine1: string
  addressLine2?: string
  neighborhood?: string
  city: string
  deliveryNotes?: string
  cardMessage?: string
  responsiblePhone: string
  responsibleContactType: ContactType
  deliveryDate: string
  deliveryTimeFrom?: string
  deliveryTimeTo?: string
  deliveryFee: number
  items: OrderItemInput[]
  extras: OrderExtraInput[]
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
  responsibleContactType?: ContactType
  recipientContact?: string | null
  recipientContactType?: ContactType | null
  deliveryDate?: string
  deliveryTimeFrom?: string | null
  deliveryTimeTo?: string | null
  deliveryFee?: number
}

export async function updateOrderDetails(id: string, changes: UpdateOrderInput) {
  const body = await apiFetch<{ data: Order }>(`/api/orders/${id}`, { method: 'PATCH', body: changes })
  return body.data
}

// Replaces the whole list; the backend prices every item at today's catalog price
export async function replaceOrderItems(id: string, items: OrderItemInput[], extras: OrderExtraInput[]) {
  const body = await apiFetch<{ data: Order }>(`/api/orders/${id}/items`, { method: 'PUT', body: { items, extras } })
  return body.data
}

// Payments and refunds say how the money moved; a retained amount sends no method or account
export type RecordPaymentInput =
  | { type: 'PAYMENT' | 'REFUND'; amount: number; method: PaymentMethod; sourceAccount?: string }
  | { type: 'RETAINED'; amount: number }

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
