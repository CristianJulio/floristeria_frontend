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

// What the total of the orders delivered in the period is made of: the orders, the delivery fees, and
// what was kept from cancelled orders. The total itself is also in the strip above
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
      subtitle="De qué se compone el total, según el día de entrega"
      isPending={isPending}
      isError={isError}
      onRetry={refetch}
    >
      {data && (
        <div className="flex flex-col gap-1.5 text-sm">
          <Row label="Pedidos" value={data.items} />
          <Row label="Domicilios" value={data.delivery} />
          {data.retainedFromCancelled > 0 && <Row label="Retenido de cancelados" value={data.retainedFromCancelled} />}
          <div className="mt-1 border-t pt-2">
            <Row label="Total de pedidos" value={data.total} strong />
          </div>
        </div>
      )}
    </DashboardCard>
  )
}
