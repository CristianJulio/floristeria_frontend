import { useState } from 'react'
import { cn } from 'cn'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/features/auth/auth-context'
import { RecordPaymentDialog } from './RecordPaymentDialog'
import { VoidPaymentDialog } from './VoidPaymentDialog'
import { formatDateTime, formatMoney, paymentLabel } from './order-format'
import type { Order, OrderPayment, PaymentType } from './orders-api'

function BalanceRow({ label, amount }: { label: string; amount: number }) {
  return (
    <div className="flex justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="tabular-nums">{formatMoney(amount)}</dd>
    </div>
  )
}

// The one thing staff need to know first: what's still owed either way, or that it's settled
function BalanceSummary({ balance }: { balance: Order['balance'] }) {
  const [label, amount, tone] =
    balance.pendingPayment > 0
      ? ['Falta por pagar', balance.pendingPayment, 'border-amber-200 bg-amber-50 text-amber-900']
      : balance.pendingRefund > 0
        ? ['Falta por reembolsar', balance.pendingRefund, 'border-red-200 bg-red-50 text-red-900']
        : ['Al día', null, 'border-green-200 bg-green-50 text-green-900']

  return (
    <div className={cn('flex items-baseline justify-between gap-3 rounded-lg border px-4 py-3', tone)}>
      <span className="font-medium">{label}</span>
      {amount !== null && <span className="text-2xl font-semibold tabular-nums">{formatMoney(amount)}</span>}
    </div>
  )
}

function PaymentEntry({ payment, onVoid }: { payment: OrderPayment; onVoid?: () => void }) {
  const voided = payment.voidedAt !== null
  // Refunds and retained amounts reduce what the shop holds for the customer
  const sign = payment.type === 'PAYMENT' ? '' : '−'

  return (
    <li className={`flex flex-col gap-0.5 border-b py-2 last:border-b-0 ${voided ? 'text-muted-foreground' : ''}`}>
      <div className="flex justify-between gap-2">
        <span className={voided ? 'line-through' : 'font-medium'}>
          {paymentLabel(payment)}
        </span>
        <span className={cn('tabular-nums', voided && 'line-through')}>
          {sign}
          {formatMoney(payment.amount)}
        </span>
      </div>
      <div className="flex justify-between gap-2 text-xs text-muted-foreground">
        <span>
          {formatDateTime(payment.createdAt)} · {payment.createdBy.username}
          {payment.sourceAccount && ` · Cuenta ${payment.sourceAccount}`}
        </span>
        {!voided && onVoid && (
          <button type="button" className="shrink-0 underline-offset-4 hover:text-destructive hover:underline" onClick={onVoid}>
            Anular
          </button>
        )}
      </div>
      {voided && (
        <div className="text-xs">
          Anulado por {payment.voidedBy?.username} el {formatDateTime(payment.voidedAt!)}: {payment.voidReason}
        </div>
      )}
    </li>
  )
}

export function OrderPaymentsCard({ order }: { order: Order }) {
  const { balance } = order
  const { can } = useAuth()
  const [recording, setRecording] = useState<PaymentType | null>(null)
  const [voiding, setVoiding] = useState<OrderPayment | null>(null)

  // Each type only appears when it makes sense for the order's current balance and status
  const cancelled = order.status === 'CANCELLED'
  const actions: { type: PaymentType; label: string }[] = [
    ...(can('orders.record_payment') && !cancelled && balance.pendingPayment > 0
      ? [{ type: 'PAYMENT' as const, label: 'Registrar pago' }]
      : []),
    ...(can('orders.record_refund') && balance.pendingRefund > 0
      ? [{ type: 'REFUND' as const, label: 'Registrar reembolso' }]
      : []),
    ...(can('orders.record_refund') && cancelled && balance.pendingRefund > 0
      ? [{ type: 'RETAINED' as const, label: 'Retener' }]
      : []),
  ]
  const canVoid = can('orders.void_payment')

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pagos</CardTitle>
        {actions.length > 0 && (
          <CardAction className="flex flex-wrap justify-end gap-2">
            {actions.map((action, index) => (
              <Button
                key={action.type}
                size="sm"
                variant={index === 0 ? 'default' : 'outline'}
                onClick={() => setRecording(action.type)}
              >
                {action.label}
              </Button>
            ))}
          </CardAction>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <BalanceSummary balance={balance} />
        <dl className="flex flex-col gap-1 text-sm">
          <BalanceRow label="Total del pedido" amount={balance.total} />
          <BalanceRow label="Pagado" amount={balance.paid} />
          {balance.refunded > 0 && <BalanceRow label="Reembolsado" amount={balance.refunded} />}
          {balance.retained > 0 && <BalanceRow label="Retenido" amount={balance.retained} />}
        </dl>

        {order.payments.length === 0 ? (
          <p className="border-t pt-3 text-sm text-muted-foreground">Aún no hay pagos registrados.</p>
        ) : (
          <ul className="border-t text-sm">
            {order.payments.map((payment) => (
              <PaymentEntry
                key={payment.id}
                payment={payment}
                {...(canVoid && { onVoid: () => setVoiding(payment) })}
              />
            ))}
          </ul>
        )}
      </CardContent>

      {recording && <RecordPaymentDialog order={order} type={recording} onClose={() => setRecording(null)} />}
      {voiding && <VoidPaymentDialog order={order} payment={voiding} onClose={() => setVoiding(null)} />}
    </Card>
  )
}
