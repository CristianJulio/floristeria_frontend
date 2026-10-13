import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatMoney } from '@/lib/money'
import { fetchIncome } from './dashboard-api'

function Row({ label, value, strong }: { label: string; value: number; strong?: boolean }) {
  return (
    <div className="flex justify-between gap-2">
      <span className={strong ? 'font-medium' : 'text-muted-foreground'}>{label}</span>
      <span className={strong ? 'font-medium tabular-nums' : 'tabular-nums'}>{formatMoney(value)}</span>
    </div>
  )
}

// The income of one period: the total split into orders and delivery fees, and how much of it
// has been collected. `children` is for controls of the card itself (e.g. the custom range's dates)
export function IncomeCard({
  title,
  subtitle,
  from,
  to,
  children,
}: {
  title: string
  subtitle?: string
  from: string
  to: string
  children?: ReactNode
}) {
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['dashboard', 'income', from, to],
    queryFn: () => fetchIncome(from, to),
    // Orders and payments change all day
    refetchInterval: 60_000,
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {children}
        {isPending ? (
          <p className="text-sm text-muted-foreground">Cargando…</p>
        ) : isError ? (
          <div className="flex items-center gap-3 text-sm">
            <span className="text-destructive">No se pudo cargar.</span>
            <Button size="sm" variant="outline" onClick={() => refetch()}>
              Reintentar
            </Button>
          </div>
        ) : (
          <>
            <div>
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
      </CardContent>
    </Card>
  )
}
