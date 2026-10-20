import type { Order } from './orders-api'

// How close a delivery is, as a traffic light. With a single time (or none): green when there is
// time, yellow when 1.5 hours or less are left, red (alert) when an hour or less is left or the time
// has passed. With a window (from and to): yellow once it starts or 1.5 hours or less are left to its
// end, whichever comes first, and red when an hour or less is left to its end
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

// Minutes until a time of the day (negative once it has passed).
// Colombia has no daylight saving, so its clock is always UTC-5
function minutesUntil(date: string, time: string, now: Date) {
  const [year, month, day] = date.split('-').map(Number)
  const [hours, minutes] = time.split(':').map(Number)
  const due = Date.UTC(year, month - 1, day, hours + 5, minutes)
  return Math.round((due - now.getTime()) / 60000)
}

// Minutes until the delivery is due (negative once it has passed). With a window, until its end
export function minutesToDelivery(
  order: Pick<Order, 'deliveryDate' | 'deliveryTimeFrom' | 'deliveryTimeTo'>,
  now: Date,
) {
  const time = order.deliveryTimeFrom && order.deliveryTimeTo ? order.deliveryTimeTo : dueTime(order)
  return minutesUntil(order.deliveryDate, time, now)
}

export function urgencyOf(
  order: Pick<Order, 'deliveryDate' | 'deliveryTimeFrom' | 'deliveryTimeTo'>,
  now: Date,
): Urgency {
  if (order.deliveryTimeFrom && order.deliveryTimeTo) {
    const untilEnd = minutesUntil(order.deliveryDate, order.deliveryTimeTo, now)
    if (untilEnd <= ALERT_MINUTES) return 'alert'
    if (untilEnd <= SOON_MINUTES) return 'soon'
    return minutesUntil(order.deliveryDate, order.deliveryTimeFrom, now) <= 0 ? 'soon' : 'ok'
  }
  const minutes = minutesToDelivery(order, now)
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
