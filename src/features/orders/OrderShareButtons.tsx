import { LinkIcon } from 'lucide-react'
import { CopyButton } from './CopyButton'
import { orderAsText, orderLink } from './order-share'
import type { Order } from './orders-api'

// Two ways to pass the order on, e.g. by WhatsApp: its details as text, or the link to open it
export function OrderShareButtons({ order }: { order: Order }) {
  return (
    <>
      <CopyButton text={orderAsText(order)} label="Copiar pedido" />
      <CopyButton text={orderLink(order)} label="Copiar enlace" icon={<LinkIcon aria-hidden />} />
    </>
  )
}
