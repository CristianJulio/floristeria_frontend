import { useQuery } from '@tanstack/react-query'
import { cn } from 'cn'
import { formatMoney } from '@/lib/money'
import { fetchCommission } from './dashboard-api'

// The commission owed so far this month, always in view in the header: what the orders delivered this
// month come to at the fee for each one
export function CommissionBadge({ className }: { className?: string }) {
  const { data, isError } = useQuery({
    queryKey: ['dashboard', 'commission'],
    queryFn: fetchCommission,
    refetchInterval: 60_000,
  })

  if (isError) return null

  return (
    <div
      className={cn('flex flex-col rounded-lg border bg-card px-3 py-1 leading-tight', className)}
      title={data ? `${data.orderCount} pedidos × ${formatMoney(data.feePerOrder)}` : undefined}
    >
      <span className="text-[11px] text-muted-foreground">Comisión del mes</span>
      <span className="text-sm font-semibold tabular-nums">{data ? formatMoney(data.fee) : '…'}</span>
    </div>
  )
}
