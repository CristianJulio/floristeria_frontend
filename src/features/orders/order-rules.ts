import type { Order } from './orders-api'

// Mirrors the backend's rules, so the app only offers actions the API will accept

// Delivery details can be edited until the order goes out for delivery
export function isOrderEditable(order: Pick<Order, 'status'>) {
  return order.status === 'PENDING' || order.status === 'PREPARING' || order.status === 'READY'
}

// Items are fixed once the arrangement starts being prepared
export function areItemsEditable(order: Pick<Order, 'status'>) {
  return order.status === 'PENDING'
}
