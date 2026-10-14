import { formatExtras, formatMoney } from './order-format'
import type { OrderItem } from './orders-api'

// The details under a crown in an order: the room, and what it carries.
// Nothing for any other product
export function CrownLines({ item }: { item: OrderItem }) {
  if (item.category !== 'CORONAS') return null
  const extras = formatExtras(item)
  return (
    <span className="mt-0.5 block text-muted-foreground">
      Sala {item.roomNumber}
      {extras && (
        <span className="block">
          {extras}
          {item.surcharge > 0 && ` (+${formatMoney(item.surcharge)})`}
        </span>
      )}
      {item.withRibbon && item.ribbonText && <span className="block">Cinta: «{item.ribbonText}»</span>}
    </span>
  )
}
