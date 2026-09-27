import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/features/auth/auth-context'
import { RecordPaymentDialog } from './RecordPaymentDialog'
import { VoidPaymentDialog } from './VoidPaymentDialog'
import {
  PAYMENT_METHOD_LABELS,
  PAYMENT_TYPE_LABELS,
  formatDateTime,
  formatMoney,
} from './order-format'
import type { Order, OrderPayment, PaymentType } from './orders-api'

function BalanceRow({ label, amount, className }: { label: string; amount: number; className?: string }) {
  return (
    <div className={`flex justify-between ${className ?? ''}`}>
      <dt>{label}</dt>
      <dd>{formatMoney(amount)}</dd>
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
          {PAYMENT_TYPE_LABELS[payment.type]} · {PAYMENT_METHOD_LABELS[payment.method]}
        </span>
        <span className={voided ? 'line-through' : ''}>
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
          <div className="flex flex-wrap gap-2 pt-2">
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
          </div>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <dl className="flex flex-col gap-1 text-sm">
          <BalanceRow label="Total del pedido" amount={balance.total} />
          <BalanceRow label="Pagado" amount={balance.paid} />
          {balance.refunded > 0 && <BalanceRow label="Reembolsado" amount={balance.refunded} />}
          {balance.retained > 0 && <BalanceRow label="Retenido" amount={balance.retained} />}
          {balance.pendingPayment > 0 && (
            <BalanceRow
              label="Pendiente por pagar"
              amount={balance.pendingPayment}
              className="font-semibold text-amber-700 dark:text-amber-400"
            />
          )}
          {balance.pendingRefund > 0 && (
            <BalanceRow
              label="Pendiente por reembolsar"
              amount={balance.pendingRefund}
              className="font-semibold text-destructive"
            />
          )}
          {balance.pendingPayment === 0 && balance.pendingRefund === 0 && (
            <div className="font-semibold text-green-700 dark:text-green-400">Al día</div>
          )}
        </dl>

        {order.payments.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aún no hay pagos registrados.</p>
        ) : (
          <ul className="text-sm">
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
