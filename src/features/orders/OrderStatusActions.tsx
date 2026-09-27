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
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ApiError } from '@/lib/api-client'
import { apiErrorMessage } from '@/lib/api-errors'
import { useAuth } from '@/features/auth/auth-context'
import { changeOrderStatus, type Order, type OrderStatus } from './orders-api'

// The only forward step from each status, with its button label and confirmation question.
// Mirrors the backend's allowed changes; DELIVERED and CANCELLED have no next step
const NEXT_STEP: Partial<Record<OrderStatus, { status: OrderStatus; label: string; question: string }>> = {
  PENDING: { status: 'PREPARING', label: 'Empezar preparación', question: '¿Empezar a preparar el pedido para' },
  PREPARING: { status: 'OUT_FOR_DELIVERY', label: 'Enviar', question: '¿Enviar el pedido para' },
  OUT_FOR_DELIVERY: { status: 'DELIVERED', label: 'Marcar como entregado', question: '¿Marcar como entregado el pedido para' },
}

const CANCELLABLE: OrderStatus[] = ['PENDING', 'PREPARING']

type DialogMode = 'advance' | 'cancel' | null

export function OrderStatusActions({ order }: { order: Order }) {
  const { can } = useAuth()
  const queryClient = useQueryClient()
  const [dialog, setDialog] = useState<DialogMode>(null)
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: ({ status, cancellationReason }: { status: OrderStatus; cancellationReason?: string }) =>
      changeOrderStatus(order.id, status, cancellationReason),
    onSuccess: (updated) => {
      queryClient.setQueryData(['order', order.id], updated)
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      closeDialog()
    },
    onError: (err) => {
      setError(apiErrorMessage(err))
      // Someone else changed the order: show its current state
      if (err instanceof ApiError && err.status === 409) {
        queryClient.invalidateQueries({ queryKey: ['order', order.id] })
      }
    },
  })

  const nextStep = NEXT_STEP[order.status]
  const canCancel = CANCELLABLE.includes(order.status)
  if (!can('orders.update_status') || (!nextStep && !canCancel)) return null

  function openDialog(mode: DialogMode) {
    setError(null)
    setReason('')
    setDialog(mode)
  }

  function closeDialog() {
    setDialog(null)
    setError(null)
    setReason('')
  }

  const trimmedReason = reason.trim()

  return (
    <div className="flex flex-wrap gap-2">
      {nextStep && <Button onClick={() => openDialog('advance')}>{nextStep.label}</Button>}
      {canCancel && (
        <Button variant="outline" onClick={() => openDialog('cancel')}>
          Cancelar pedido
        </Button>
      )}

      <Dialog open={dialog !== null} onOpenChange={(open) => !open && !mutation.isPending && closeDialog()}>
        <DialogContent>
          {dialog === 'advance' && nextStep && (
            <>
              <DialogHeader>
                <DialogTitle>{nextStep.label}</DialogTitle>
                <DialogDescription>
                  {nextStep.question} {order.recipientName}? Esto no se puede deshacer.
                </DialogDescription>
              </DialogHeader>
              {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
              <DialogFooter>
                <Button variant="outline" onClick={closeDialog} disabled={mutation.isPending}>
                  Volver
                </Button>
                <Button onClick={() => mutation.mutate({ status: nextStep.status })} disabled={mutation.isPending}>
                  {mutation.isPending ? 'Guardando…' : 'Confirmar'}
                </Button>
              </DialogFooter>
            </>
          )}

          {dialog === 'cancel' && (
            <form
              className="flex flex-col gap-4"
              onSubmit={(event) => {
                event.preventDefault()
                if (trimmedReason) mutation.mutate({ status: 'CANCELLED', cancellationReason: trimmedReason })
              }}
            >
              <DialogHeader>
                <DialogTitle>Cancelar pedido</DialogTitle>
                <DialogDescription>
                  ¿Cancelar el pedido para {order.recipientName}? Esto no se puede deshacer.
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-2">
                <Label htmlFor="cancellation-reason">Motivo de la cancelación</Label>
                <Textarea
                  id="cancellation-reason"
                  autoFocus
                  maxLength={255}
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                />
                <span className="self-end text-xs text-muted-foreground">{reason.length}/255</span>
              </div>
              {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={closeDialog} disabled={mutation.isPending}>
                  Volver
                </Button>
                <Button type="submit" variant="destructive" disabled={!trimmedReason || mutation.isPending}>
                  {mutation.isPending ? 'Cancelando…' : 'Cancelar pedido'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
