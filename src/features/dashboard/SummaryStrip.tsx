import { useSearchParams } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { cn } from 'cn'
import { formatMoney } from '@/lib/money'
import { CollectedOrdersDialog } from './CollectedOrdersDialog'
import { fetchIncome, type Income } from './dashboard-api'

function Tile({
  label,
  value,
  note,
  muted,
  className,
  onClick,
}: {
  label: string
  value: string
  note?: string
  muted?: boolean
  className?: string
  onClick?: () => void
}) {
  const classes = cn('flex flex-col gap-0.5 rounded-xl border bg-card px-4 py-3', className)
  const content = (
    <>
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={cn('text-2xl font-semibold tabular-nums', muted && 'text-muted-foreground')}>{value}</span>
      <span className="min-h-4 text-xs text-muted-foreground">{note}</span>
    </>
  )
  // With onClick the tile is a button that opens the detail behind its figure
  return onClick ? (
    <button
      type="button"
      onClick={onClick}
      className={cn(classes, 'cursor-pointer text-left transition-colors hover:bg-secondary/40 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none')}
    >
      {content}
    </button>
  ) : (
    <div className={classes}>{content}</div>
  )
}

// What an average order is worth: the orders and delivery fees over the orders that were not cancelled
const ticketOf = (income: Income | undefined) =>
  income && income.orderCount > 0 ? (income.items + income.delivery) / income.orderCount : null

// "▲ 8 % frente al período anterior", or nothing when there is no earlier ticket to compare with
function ticketNote(current: number | null, previous: number | null) {
  if (current === null) return 'Sin pedidos'
  if (previous === null || previous === 0) return undefined
  const change = Math.round(((current - previous) / previous) * 100)
  if (change === 0) return 'Igual que el período anterior'
  return `${change > 0 ? '▲' : '▼'} ${Math.abs(change)} % frente al período anterior`
}

// The figures looked at most: what the orders are worth and how many, their average, how many were
// cancelled, what was collected in the period (by the day of each payment), and the fee owed for the orders.
// The cards below only break them down. The income request is shared with the income card; the average
// is compared with the period just before, of the same length
export function SummaryStrip({
  from,
  to,
  previous,
}: {
  from: string
  to: string
  previous: { from: string; to: string }
}) {
  const current = useQuery({
    queryKey: ['dashboard', 'income', from, to],
    queryFn: () => fetchIncome(from, to),
    refetchInterval: 60_000,
  })
  const before = useQuery({
    queryKey: ['dashboard', 'income', previous.from, previous.to],
    queryFn: () => fetchIncome(previous.from, previous.to),
    refetchInterval: 60_000,
  })

  // Open or not is in the address too, so coming back from an order finds the list still open
  const [params, setParams] = useSearchParams()
  const collectedOpen = params.get('cobrado') === '1'
  const setCollectedOpen = (open: boolean) =>
    setParams(
      (current) => {
        const next = new URLSearchParams(current)
        if (open) next.set('cobrado', '1')
        else next.delete('cobrado')
        return next
      },
      { replace: true },
    )

  if (current.isError) return <p className="text-sm text-destructive">No se pudo cargar el resumen.</p>

  const data = current.data
  const money = (amount: number | undefined) => (data && amount !== undefined ? formatMoney(amount) : '…')
  const ticket = ticketOf(data)
  const trend = data && !before.isPending ? ticketNote(ticket, ticketOf(before.data)) : undefined
  const orders = data ? data.orderCount + data.cancelledCount : 0

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      <Tile
        label="Total de pedidos"
        value={money(data?.total)}
        {...(data && { note: `${data.orderCount} ${data.orderCount === 1 ? 'pedido' : 'pedidos'}` })}
      />
      <Tile
        label="Ticket promedio"
        value={data ? (ticket === null ? '–' : formatMoney(ticket)) : '…'}
        muted={ticket === null}
        {...(trend && { note: trend })}
      />
      <Tile
        label="Cancelados"
        value={data ? String(data.cancelledCount) : '…'}
        muted={data?.cancelledCount === 0}
        {...(data &&
          orders > 0 && { note: `${Math.round((data.cancelledCount / orders) * 100)} % de ${orders} pedidos` })}
      />
      <Tile
        label="Cobrado"
        value={money(data?.collected)}
        note="Ver pedidos"
        onClick={() => setCollectedOpen(true)}
      />
      <CollectedOrdersDialog from={from} to={to} open={collectedOpen} onOpenChange={setCollectedOpen} />
      {/* Fills the rest of the grid so it stays balanced */}
      <Tile
        className="col-span-full sm:col-span-2"
        label="Comisión por pedidos"
        value={data ? formatMoney(data.fee) : '…'}
        muted={data?.orderCount === 0}
        {...(data && {
          note: `${data.orderCount} ${data.orderCount === 1 ? 'pedido' : 'pedidos'} × ${formatMoney(data.feePerOrder)}`,
        })}
      />
    </div>
  )
}
