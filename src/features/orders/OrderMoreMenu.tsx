import { useState } from 'react'
import { CopyIcon, EllipsisVerticalIcon, LinkIcon, Trash2Icon } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuth } from '@/features/auth/auth-context'
import { copyText } from './CopyButton'
import { DeleteOrderDialog } from './DeleteOrderDialog'
import { orderAsText, orderLink } from './order-share'
import type { Order } from './orders-api'

// The options of an order that are not used all the time: passing it on (its details as text, e.g. for
// WhatsApp, or its link) and deleting it
export function OrderMoreMenu({ order, onDeleted }: { order: Order; onDeleted: () => void }) {
  const { can } = useAuth()
  const [deleting, setDeleting] = useState(false)

  async function copy(text: string, done: string) {
    if (await copyText(text)) toast.success(done)
    else toast.error('No se pudo copiar')
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="outline" size="icon" aria-label="Más opciones" />}>
          <EllipsisVerticalIcon aria-hidden />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-44">
          <DropdownMenuItem onClick={() => copy(orderLink(order), 'Enlace copiado')}>
            <LinkIcon aria-hidden />
            Copiar enlace
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => copy(orderAsText(order), 'Pedido copiado')}>
            <CopyIcon aria-hidden />
            Copiar pedido
          </DropdownMenuItem>
          {can('orders.delete') && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={() => setDeleting(true)}>
                <Trash2Icon aria-hidden />
                Eliminar pedido
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      {/* Only mounted while deleting, so each time it starts without the last error */}
      {deleting && <DeleteOrderDialog order={order} open onOpenChange={setDeleting} onDeleted={onDeleted} />}
    </>
  )
}
