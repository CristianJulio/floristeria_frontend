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

// Deleting keeps the order in the database but takes it out of the lists, the dashboard and the totals
export function DeleteOrderButton({ order, onDeleted }: { order: Order; onDeleted: () => void }) {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
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
    <>
      <Button
        variant="outline"
        className="text-destructive"
        onClick={() => {
          setError(null)
          setOpen(true)
        }}
      >
        Eliminar
      </Button>
      <Dialog open={open} onOpenChange={(value) => !value && !mutation.isPending && setOpen(false)}>
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
            <Button variant="outline" onClick={() => setOpen(false)} disabled={mutation.isPending}>
              Volver
            </Button>
            <Button variant="destructive" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
              {mutation.isPending ? 'Eliminando…' : 'Eliminar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}