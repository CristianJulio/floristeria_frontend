import { Badge } from '@/components/ui/badge'
import { STATUS_CLASSES, STATUS_LABELS } from './order-format'
import type { OrderStatus } from './orders-api'

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return <Badge className={STATUS_CLASSES[status]}>{STATUS_LABELS[status]}</Badge>
}
