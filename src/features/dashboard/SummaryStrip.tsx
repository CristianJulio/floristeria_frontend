import { useQuery } from '@tanstack/react-query'
import { cn } from 'cn'
import { formatMoney } from '@/lib/money'
import { fetchIncome } from './dashboard-api'

function Tile({
  label,
  value,
  note,
  muted,
  className,
}: {
  label: string
  value: string
  note?: string
  muted?: boolean
  className?: string
}) {
  return (
    <div className={cn('flex flex-col gap-0.5 rounded-xl border bg-card px-4 py-3', className)}>
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={cn('text-2xl font-semibold tabular-nums', muted && 'text-muted-foreground')}>{value}</span>
      <span className="min-h-4 text-xs text-muted-foreground">{note}</span>
    </div>
  )
}

// The four figures looked at most, in one row: what the orders are worth, what has been collected, and
// what is still to collect or to give back. The cards below only break them down. It shares its
// request with the income card
export function SummaryStrip({ from, to }: { from: string; to: string }) {
  const { data, isPending, isError } = useQuery({
    queryKey: ['dashboard', 'income', from, to],
    queryFn: () => fetchIncome(from, to),
    refetchInterval: 60_000,
  })

  if (isError) return <p className="text-sm text-destructive">No se pudo cargar el resumen.</p>

  const value = (amount: number | undefined) => (isPending || amount === undefined ? '…' : formatMoney(amount))

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Tile
        label="Total de pedidos"
        value={value(data?.total)}
        {...(data && { note: `${data.orderCount} ${data.orderCount === 1 ? 'pedido' : 'pedidos'}` })}
      />
      <Tile label="Cobrado" value={value(data?.collected)} />
      <Tile label="Por cobrar" value={value(data?.pendingPayment)} muted={data?.pendingPayment === 0} />
      <Tile label="Por reembolsar" value={value(data?.pendingRefund)} muted={data?.pendingRefund === 0} />
    </div>
  )
}
