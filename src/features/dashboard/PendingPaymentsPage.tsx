import { useQuery } from '@tanstack/react-query'
import { cn } from 'cn'
import { formatMoney } from '@/lib/money'
import { PendingPaymentsCard } from './PendingPaymentsCard'
import { fetchPendingPayments } from './dashboard-api'

function Tile({ label, value, note, muted }: { label: string; value: string; note?: string; muted?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-xl border bg-card px-4 py-3">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={cn('text-2xl font-semibold tabular-nums', muted && 'text-muted-foreground')}>{value}</span>
      <span className="min-h-4 text-xs text-muted-foreground">{note}</span>
    </div>
  )
}

const orders = (count: number) => `${count} ${count === 1 ? 'pedido' : 'pedidos'}`

// What customers still owe the shop and what the shop still owes them, whatever the delivery date,
// with the orders behind it. The totals and the list share one request with the card
export function PendingPaymentsPage() {
  const { data, isError } = useQuery({
    queryKey: ['dashboard', 'pending-payments'],
    queryFn: fetchPendingPayments,
    refetchInterval: 60_000,
  })

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-0.5">
        <h1 className="text-xl font-semibold">Pagos</h1>
        <p className="text-sm text-muted-foreground">Saldos pendientes de cobrar y de reembolsar</p>
      </div>

      {!isError && (
        <div className="grid grid-cols-2 gap-3">
          <Tile
            label="Por cobrar"
            value={data ? formatMoney(data.debtSum) : '…'}
            muted={data?.debtCount === 0}
            {...(data && { note: orders(data.debtCount) })}
          />
          <Tile
            label="Por reembolsar"
            value={data ? formatMoney(data.refundSum) : '…'}
            muted={data?.refundCount === 0}
            {...(data && { note: orders(data.refundCount) })}
          />
        </div>
      )}

      <PendingPaymentsCard />
    </section>
  )
}
