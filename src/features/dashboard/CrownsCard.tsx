import { useQuery } from '@tanstack/react-query'
import { formatMoney } from '@/lib/money'
import { DashboardCard } from './DashboardCard'
import { fetchCrowns } from './dashboard-api'

function Row({ label, count, note }: { label: string; count: number; note?: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="tabular-nums">
        <span className="font-medium">{count}</span>
        {note && <span className="ml-2 text-xs text-muted-foreground">{note}</span>}
      </span>
    </div>
  )
}

// The crowns of the period: how many, what they brought in, and what they carry. Carrying both a ribbon
// and a card costs extra, which is shown next to that row
export function CrownsCard({ from, to }: { from: string; to: string }) {
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['dashboard', 'crowns', from, to],
    queryFn: () => fetchCrowns(from, to),
    refetchInterval: 60_000,
  })

  return (
    <DashboardCard
      title="Coronas"
      subtitle="Según el día de entrega"
      isPending={isPending}
      isError={isError}
      onRetry={refetch}
    >
      {data &&
        (data.crowns === 0 ? (
          <p className="text-sm text-muted-foreground">No se pidieron coronas en este período.</p>
        ) : (
          <>
            <div className="flex flex-col gap-1.5 text-sm">
              <Row label="Coronas pedidas" count={data.crowns} />
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Ingresos por coronas</span>
                <span className="tabular-nums">{formatMoney(data.revenue)}</span>
              </div>
            </div>
            <div className="flex flex-col gap-1.5 border-t pt-3 text-sm">
              <div className="text-xs text-muted-foreground">Lo que llevan</div>
              <Row
                label="Cinta y tarjeta"
                count={data.ribbonAndCard}
                {...(data.surcharge > 0 && { note: `+${formatMoney(data.surcharge)}` })}
              />
              <Row label="Solo cinta" count={data.ribbonOnly} />
              <Row label="Solo tarjeta" count={data.cardOnly} />
              <Row label="Ninguna" count={data.neither} />
            </div>
          </>
        ))}
    </DashboardCard>
  )
}
