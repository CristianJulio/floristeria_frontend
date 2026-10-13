import { useQuery } from '@tanstack/react-query'
import { formatMoney } from '@/lib/money'
import { DashboardCard } from './DashboardCard'
import { fetchIncome } from './dashboard-api'

function Row({ label, value, strong }: { label: string; value: number; strong?: boolean }) {
  return (
    <div className="flex justify-between gap-2">
      <span className={strong ? 'font-medium' : 'text-muted-foreground'}>{label}</span>
      <span className={strong ? 'font-medium tabular-nums' : 'tabular-nums'}>{formatMoney(value)}</span>
    </div>
  )
}

// What the orders delivered in the period are worth: the total split into orders and delivery fees,
// and how much of it has been collected
export function IncomeCard({ from, to }: { from: string; to: string }) {
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['dashboard', 'income', from, to],
    queryFn: () => fetchIncome(from, to),
    // Orders and payments change all day
    refetchInterval: 60_000,
  })

  return (
    <DashboardCard
      title="Ingresos"
      subtitle="Pedidos según su día de entrega"
      isPending={isPending}
      isError={isError}
      onRetry={refetch}
    >
      {data && (
        <>
          <div>
            <div className="text-sm text-muted-foreground">Total de pedidos</div>
            <div className="text-3xl font-semibold tabular-nums">{formatMoney(data.total)}</div>
            <div className="text-sm text-muted-foreground">
              {data.orderCount} {data.orderCount === 1 ? 'pedido' : 'pedidos'}
            </div>
          </div>
          <div className="flex flex-col gap-1.5 text-sm">
            <Row label="Pedidos" value={data.items} />
            <Row label="Domicilios" value={data.delivery} />
          </div>
          <div className="flex flex-col gap-1.5 border-t pt-3 text-sm">
            <Row label="Cobrado" value={data.collected} strong />
            <Row label="Por cobrar" value={data.pendingPayment} />
            {data.pendingRefund > 0 && <Row label="Por reembolsar" value={data.pendingRefund} />}
          </div>
        </>
      )}
    </DashboardCard>
  )
}
