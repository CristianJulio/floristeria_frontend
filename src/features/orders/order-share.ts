import { formatAddress, formatDeliveryDay, formatDeliveryTime, formatMoney, formatPlace } from './order-format'
import type { Order } from './orders-api'

// The order as text to paste into WhatsApp (*word* is bold there): who it is for, where and when, what
// it holds and what is still owed
export function orderAsText(order: Order) {
  const lines: string[] = [`*Pedido para ${order.recipientName}*`]

  lines.push('', `📅 ${formatDeliveryDay(order.deliveryDate)} · ${formatDeliveryTime(order)}`)
  lines.push(`📍 ${formatAddress(order)}`, `    ${formatPlace(order)}`)
  if (order.deliveryNotes) lines.push(`📝 ${order.deliveryNotes}`)
  if (order.recipientContact) lines.push(`📞 Recibe: ${order.recipientContact}`)
  lines.push(`📞 Responsable: ${order.responsiblePhone} (${order.senderName})`)

  lines.push('', '*Productos*')
  for (const item of order.items) {
    const details = [
      item.roomNumber && `habitación ${item.roomNumber}`,
      item.withRibbon && (item.ribbonText ? `cinta: "${item.ribbonText}"` : 'con cinta'),
      item.withCard && 'con tarjeta',
    ].filter(Boolean)
    lines.push(`• ${item.quantity}× ${item.productName}${details.length > 0 ? ` (${details.join(', ')})` : ''}`)
  }
  for (const extra of order.extras) lines.push(`• ${extra.quantity}× ${extra.name}`)

  if (order.cardMessage) lines.push('', '*Mensaje de la tarjeta*', order.cardMessage)

  lines.push('', `*Total:* ${formatMoney(order.balance.total)}`)
  if (order.balance.pendingPayment > 0) lines.push(`*Por cobrar:* ${formatMoney(order.balance.pendingPayment)}`)

  return lines.join('\n')
}

// Where the order opens in this app, for someone who is signed in
export const orderLink = (order: Pick<Order, 'id'>) => `${window.location.origin}/pedidos/${order.id}`
