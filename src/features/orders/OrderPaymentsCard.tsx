import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  PAYMENT_METHOD_LABELS,
  PAYMENT_TYPE_LABELS,
  formatDateTime,
  formatMoney,
} from './order-format'
import type { Order, OrderPayment } from './orders-api'

function BalanceRow({ label, amount, className }: { label: string; amount: number; className?: string }) {
  return (
    <div className={`flex justify-between ${className ?? ''}`}>
      <dt>{label}</dt>
      <dd>{formatMoney(amount)}</dd>
    </div>
  )
}

function PaymentEntry({ payment }: { payment: OrderPayment }) {
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
      <div className="text-xs text-muted-foreground">
        {formatDateTime(payment.createdAt)} · {payment.createdBy.username}
        {payment.sourceAccount && ` · Cuenta ${payment.sourceAccount}`}
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pagos</CardTitle>
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
              <PaymentEntry key={payment.id} payment={payment} />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
