import { useState } from 'react'
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
import { formatMoney, paymentLabel } from './order-format'
import { voidPayment, type Order, type OrderPayment } from './orders-api'

type Props = {
  order: Order
  payment: OrderPayment
  onClose: () => void
}

// Rendered only while open, so every opening starts with an empty reason
export function VoidPaymentDialog({ order, payment, onClose }: Props) {
  const queryClient = useQueryClient()
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const trimmedReason = reason.trim()

  const mutation = useMutation({
    mutationFn: () => voidPayment(order.id, payment.id, trimmedReason),
    onSuccess: (updated) => {
      queryClient.setQueryData(['order', order.id], updated)
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      onClose()
    },
    onError: (err) => {
      if (err instanceof ApiError && err.status === 409 && err.message.includes('void those entries first')) {
        setError(
          'No se puede anular este pago porque hay reembolsos o montos retenidos que dependen de él. Anúlalos primero.',
        )
      } else if (err instanceof ApiError && err.status === 409) {
        setError('Este movimiento ya fue anulado. Revisa los datos actualizados.')
      } else {
        setError(apiErrorMessage(err))
      }
      queryClient.invalidateQueries({ queryKey: ['order', order.id] })
    },
  })

  return (
    <Dialog open onOpenChange={(open) => !open && !mutation.isPending && onClose()}>
      <DialogContent>
        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault()
            if (trimmedReason) mutation.mutate()
          }}
        >
          <DialogHeader>
            <DialogTitle>Anular movimiento</DialogTitle>
            <DialogDescription>
              {paymentLabel(payment)} ·{' '}
              {formatMoney(payment.amount)}. Seguirá visible en el historial, pero dejará de contar en el saldo.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="void-reason">Motivo</Label>
            <Textarea
              id="void-reason"
              autoFocus
              maxLength={255}
              placeholder="Por ejemplo: registrado dos veces"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
            <CharCount value={reason} max={255} />
          </div>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={mutation.isPending}>
              Volver
            </Button>
            <Button type="submit" variant="destructive" disabled={!trimmedReason || mutation.isPending}>
              {mutation.isPending ? 'Anulando…' : 'Anular'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
