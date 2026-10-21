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
    <p
      className={cn('items-baseline gap-1.5 text-sm whitespace-nowrap', className)}
      title={data ? `${data.orderCount} pedidos × ${formatMoney(data.feePerOrder)}` : undefined}
    >
      <span className="text-muted-foreground">Comisión del mes</span>
      <span className="font-semibold tabular-nums">{data ? formatMoney(data.fee) : '…'}</span>
    </p>
  )
}
