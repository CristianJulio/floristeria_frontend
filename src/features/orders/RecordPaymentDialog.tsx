import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { cn } from 'cn'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ApiError } from '@/lib/api-client'
import { apiErrorMessage } from '@/lib/api-errors'
import { PAYMENT_METHOD_LABELS, formatMoney } from './order-format'
import { recordPayment, type Order, type PaymentMethod, type PaymentType, type RecordPaymentInput } from './orders-api'

const METHODS: PaymentMethod[] = ['NEQUI', 'DAVIPLATA', 'BANCOLOMBIA', 'BRE_B', 'WESTERN_UNION', 'PAYPAL', 'CASH']

// What the optional account field asks for, depending on the method (cash has no account)
const ACCOUNT_PLACEHOLDERS: Record<Exclude<PaymentMethod, 'CASH'>, string> = {
  NEQUI: 'Número de Nequi',
  DAVIPLATA: 'Número de Daviplata',
  BANCOLOMBIA: 'Cuenta de Bancolombia',
  BRE_B: 'Llave Bre-B',
  WESTERN_UNION: 'Nombre de quien envía',
  PAYPAL: 'Correo de PayPal',
}

const COPY: Record<PaymentType, { title: string; description: string; submit: string }> = {
  PAYMENT: { title: 'Registrar pago', description: 'Dinero recibido del cliente.', submit: 'Registrar pago' },
  REFUND: { title: 'Registrar reembolso', description: 'Dinero devuelto al cliente.', submit: 'Registrar reembolso' },
  RETAINED: {
    title: 'Retener dinero',
    description: 'Parte del dinero que la floristería se queda, por ejemplo por flores ya compradas.',
    submit: 'Retener',
  },
}

// A payment is limited by what's still owed; refunds and retained amounts by what's owed back
function maxAmount(order: Order, type: PaymentType) {
  return type === 'PAYMENT' ? order.balance.pendingPayment : order.balance.pendingRefund
}

// Retained amounts move no money, so only payments and refunds ask for a method
function buildSchema(max: number, needsMethod: boolean) {
  return z
    .object({
      amount: z
        .string()
        .trim()
        .regex(/^\d+$/, 'Escribe solo números, sin puntos ni signos')
        .transform(Number)
        .pipe(
          z
            .number()
            .min(1, 'El monto debe ser mayor que cero')
            .max(max, `El monto no puede superar ${formatMoney(max)}`),
        ),
      method: z.enum(METHODS).optional(),
      sourceAccount: z.string().trim().max(100, 'Máximo 100 caracteres'),
    })
    .refine((values) => !needsMethod || values.method !== undefined, {
      message: 'Elige cómo se hizo el movimiento',
      path: ['method'],
      // Checked even while the amount is invalid, so every missing field is marked at once
      when: () => true,
    })
}

type FormInput = z.input<ReturnType<typeof buildSchema>>
type FormOutput = z.output<ReturnType<typeof buildSchema>>

function toRecordPaymentInput(type: PaymentType, values: FormOutput): RecordPaymentInput {
  if (type === 'RETAINED') return { type, amount: values.amount }
  // The form's schema already requires it for payments and refunds
  if (!values.method) throw new Error('A method is required for payments and refunds')
  return {
    type,
    amount: values.amount,
    method: values.method,
    // Cash has no account
    ...(values.method !== 'CASH' && values.sourceAccount && { sourceAccount: values.sourceAccount }),
  }
}

type Props = {
  order: Order
  type: PaymentType
  onClose: () => void
}

// Rendered only while open, so every opening starts from a fresh form
export function RecordPaymentDialog({ order, type, onClose }: Props) {
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)
  const max = maxAmount(order, type)
  const needsMethod = type !== 'RETAINED'
  const copy = COPY[type]

  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors },
  } = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(buildSchema(max, needsMethod)),
    defaultValues: {
      // Paying the rest or refunding everything is the common case; retained amounts are a decision
      amount: type === 'RETAINED' ? '' : String(max),
      sourceAccount: '',
    },
  })

  const method = useWatch({ control, name: 'method' })
  const amount = useWatch({ control, name: 'amount' })

  const mutation = useMutation({
    mutationFn: (values: FormOutput) => recordPayment(order.id, toRecordPaymentInput(type, values)),
    onSuccess: (updated) => {
      queryClient.setQueryData(['order', order.id], updated)
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      onClose()
    },
    onError: (err) => {
      if (err instanceof ApiError && err.status === 400) {
        setError('El monto supera lo pendiente. Revisa el saldo actualizado del pedido.')
      } else if (err instanceof ApiError && err.status === 409) {
        setError('El pedido cambió y este movimiento ya no aplica. Revisa el saldo actualizado.')
      } else {
        setError(apiErrorMessage(err))
      }
      // The balance may have changed: show the current one behind the dialog
      queryClient.invalidateQueries({ queryKey: ['order', order.id] })
    },
  })

  const amountPreview = /^\d+$/.test((amount ?? '').trim()) ? formatMoney(Number(amount)) : null

  return (
    <Dialog open onOpenChange={(open) => !open && !mutation.isPending && onClose()}>
      <DialogContent>
        <form onSubmit={handleSubmit((values) => mutation.mutate(values))} noValidate className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>{copy.title}</DialogTitle>
            <DialogDescription>
              {copy.description} Máximo {formatMoney(max)}.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-2">
            <Label htmlFor="payment-amount">Monto (en pesos)</Label>
            <Input
              id="payment-amount"
              inputMode="numeric"
              autoComplete="off"
              autoFocus
              aria-invalid={!!errors.amount}
              {...register('amount')}
            />
            {errors.amount ? (
              <p className="text-sm text-destructive">{errors.amount.message}</p>
            ) : (
              amountPreview && <p className="text-xs text-muted-foreground">{amountPreview}</p>
            )}
          </div>

          {needsMethod && (
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium">Método</span>
              {/* Two columns of equal buttons; with an odd count the last one takes the whole row */}
              <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Método">
                {METHODS.map((option, index) => (
                  <Button
                    key={option}
                    type="button"
                    className={cn('w-full', index === METHODS.length - 1 && METHODS.length % 2 === 1 && 'col-span-2')}
                    role="radio"
                    aria-checked={method === option}
                    variant={method === option ? 'default' : 'outline'}
                    onClick={() => setValue('method', option, { shouldValidate: true })}
                  >
                    {PAYMENT_METHOD_LABELS[option]}
                  </Button>
                ))}
              </div>
              {errors.method && <p className="text-sm text-destructive">{errors.method.message}</p>}
            </div>
          )}

          {needsMethod && method && method !== 'CASH' && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="payment-account">Cuenta (opcional)</Label>
              <Input
                id="payment-account"
                placeholder={ACCOUNT_PLACEHOLDERS[method]}
                aria-invalid={!!errors.sourceAccount}
                {...register('sourceAccount')}
              />
              {errors.sourceAccount && <p className="text-sm text-destructive">{errors.sourceAccount.message}</p>}
            </div>
          )}

          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={mutation.isPending}>
              Volver
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Guardando…' : copy.submit}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
