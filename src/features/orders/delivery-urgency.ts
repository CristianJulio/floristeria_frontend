import type { Order } from './orders-api'

// How close a delivery is, as a traffic light: green when there is time, yellow when 1.5 hours or
// less are left, red (alert) when an hour or less is left or the time has passed
export type Urgency = 'ok' | 'soon' | 'alert'

export const SOON_MINUTES = 90
export const ALERT_MINUTES = 60

// An order with no time is due when the working day ends
export const END_OF_DAY = '18:00'

// The time the order is due: the start of its delivery window, or its end if that's all there is,
// or the end of the day if it has no time
function dueTime(order: Pick<Order, 'deliveryTimeFrom' | 'deliveryTimeTo'>) {
  return order.deliveryTimeFrom ?? order.deliveryTimeTo ?? END_OF_DAY
}

// Minutes until the delivery (negative once it has passed).
// Colombia has no daylight saving, so its clock is always UTC-5
export function minutesToDelivery(
  order: Pick<Order, 'deliveryDate' | 'deliveryTimeFrom' | 'deliveryTimeTo'>,
  now: Date,
) {
  const time = dueTime(order)
  const [year, month, day] = order.deliveryDate.split('-').map(Number)
  const [hours, minutes] = time.split(':').map(Number)
  const due = Date.UTC(year, month - 1, day, hours + 5, minutes)
  return Math.round((due - now.getTime()) / 60000)
}

export function urgencyOf(minutes: number): Urgency {
  if (minutes <= ALERT_MINUTES) return 'alert'
  if (minutes <= SOON_MINUTES) return 'soon'
  return 'ok'
}

// "En 1 h 20 min", "En 45 min", "Hace 2 h". Nothing for a day or more away, where the date says it
export function formatCountdown(minutes: number) {
  if (Math.abs(minutes) >= 24 * 60) return null
  const abs = Math.abs(minutes)
  const hours = Math.floor(abs / 60)
  const rest = abs % 60
  const text = hours === 0 ? `${rest} min` : rest === 0 ? `${hours} h` : `${hours} h ${rest} min`
  return minutes < 0 ? `Hace ${text}` : `En ${text}`
}
