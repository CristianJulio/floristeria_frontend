import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { apiErrorMessage } from '@/lib/api-errors'
import { deleteOrder, type Order } from './orders-api'

// Deleting keeps the order in the database but takes it out of the lists, the dashboard and the totals.
// Opened from outside (e.g. the order's menu), which also owns whether it is open
export function DeleteOrderDialog({
  order,
  open,
  onOpenChange,
  onDeleted,
}: {
  order: Order
  open: boolean
  onOpenChange: (open: boolean) => void
  onDeleted: () => void
}) {
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: () => deleteOrder(order.id),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: ['order', order.id] })
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      onDeleted()
    },
    onError: (err) => setError(apiErrorMessage(err)),
  })

  return (
    <Dialog open={open} onOpenChange={(value) => !value && !mutation.isPending && onOpenChange(false)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Eliminar pedido</DialogTitle>
          <DialogDescription>
            ¿Eliminar el pedido para {order.recipientName}? Dejará de aparecer en la lista y en el resumen, y sus
            pagos ya no se contarán.
          </DialogDescription>
        </DialogHeader>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
            Volver
          </Button>
          <Button variant="destructive" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending ? 'Eliminando…' : 'Eliminar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}