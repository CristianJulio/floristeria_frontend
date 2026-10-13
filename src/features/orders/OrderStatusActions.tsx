import { useState, type ReactNode } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { CharCount } from '@/components/CharCount'
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

// Steps that need part of the order paid first: half to start preparing, all of it to deliver.
// Roles with the permission may go ahead anyway, as an exception. Mirrors the backend's rules;
// the page explains what's missing in a notice under its header
type PaymentGate = {
  missing: (balance: Order['balance']) => number
  permission: string
  // Shown in the confirmation when going ahead as an exception
  exception: string
  // Shown if the backend refuses it; apiError is how its message starts
  refused: string
  apiError: string
}

const PAYMENT_GATES: Partial<Record<OrderStatus, PaymentGate>> = {
  PREPARING: {
    missing: (balance) => balance.missingToStart,
    permission: 'orders.start_unpaid',
    exception: 'Aún no está pagado el 50%; empezará como excepción.',
    refused: 'Aún no se ha pagado la mitad del pedido. Registra el pago antes de empezar.',
    apiError: 'At least',
  },
  DELIVERED: {
    missing: (balance) => balance.pendingPayment,
    permission: 'orders.deliver_unpaid',
    exception: 'Aún no está pagado por completo; se entregará como excepción.',
    refused: 'El pedido aún no está pagado por completo. Registra el pago antes de entregarlo.',
    apiError: 'The order must be fully paid',
  },
}

type DialogMode = 'advance' | 'cancel' | null

// `middle` (e.g. the edit button) is placed between cancel and the next step, so the main action stays last
export function OrderStatusActions({ order, middle }: { order: Order; middle?: ReactNode }) {
  const { can } = useAuth()
  const queryClient = useQueryClient()
  const [dialog, setDialog] = useState<DialogMode>(null)
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)

  const nextStep = NEXT_STEP[order.status]
  const gate = nextStep && PAYMENT_GATES[nextStep.status]

  const mutation = useMutation({
    mutationFn: ({ status, cancellationReason }: { status: OrderStatus; cancellationReason?: string }) =>
      changeOrderStatus(order.id, status, cancellationReason),
    onSuccess: (updated) => {
      queryClient.setQueryData(['order', order.id], updated)
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      closeDialog()
    },
    onError: (err) => {
      setError(
        gate && err instanceof ApiError && err.status === 409 && err.message.startsWith(gate.apiError)
          ? gate.refused
          : apiErrorMessage(err),
      )
      // Someone else changed the order: show its current state
      if (err instanceof ApiError && err.status === 409) {
        queryClient.invalidateQueries({ queryKey: ['order', order.id] })
      }
    },
  })

  const canCancel = CANCELLABLE.includes(order.status)
  const unpaid = gate !== undefined && gate.missing(order.balance) > 0
  const canGoUnpaid = gate !== undefined && can(gate.permission)
  if (!can('orders.update_status') || (!nextStep && !canCancel)) {
    return middle ? <div className="flex flex-wrap gap-2">{middle}</div> : null
  }

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
    <div className="flex flex-wrap items-center gap-2">
      {canCancel && (
        <Button
          variant="ghost"
          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={() => openDialog('cancel')}
        >
          Cancelar pedido
        </Button>
      )}
      {middle}
      {nextStep && (
        <Button onClick={() => openDialog('advance')} disabled={unpaid && !canGoUnpaid}>
          {nextStep.label}
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
              {unpaid && gate && <p className="text-sm text-amber-700 dark:text-amber-400">{gate.exception}</p>}
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
                <CharCount value={reason} max={255} />
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
