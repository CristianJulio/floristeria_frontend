import { useQuery } from '@tanstack/react-query'
import { formatMoney } from '@/lib/money'
import { PAYMENT_METHOD_LABELS } from '@/features/orders/order-format'
import { DashboardCard } from './DashboardCard'
import { fetchCollectedByMethod } from './dashboard-api'

// What came in through each payment method, by the day each payment was recorded (not by the
// delivery day of its order), so it matches what the cash and the accounts show
export function CollectedByMethodCard({ from, to }: { from: string; to: string }) {
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['dashboard', 'collected-by-method', from, to],
    queryFn: () => fetchCollectedByMethod(from, to),
    refetchInterval: 60_000,
  })

  return (
    <DashboardCard
      title="Cobrado por método"
      subtitle="Pagos registrados en el período"
      isPending={isPending}
      isError={isError}
      onRetry={refetch}
    >
      {data &&
        (data.rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No se registraron pagos en este período.</p>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground">
                  <th className="pb-1.5 font-normal">Método</th>
                  <th className="pb-1.5 text-right font-normal">Pagado</th>
                  <th className="pb-1.5 text-right font-normal">Reembolsado</th>
                  <th className="pb-1.5 text-right font-normal">Neto</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((row) => (
                  <tr key={row.method}>
                    <td className="py-1">{PAYMENT_METHOD_LABELS[row.method]}</td>
                    <td className="py-1 text-right tabular-nums">{formatMoney(row.paid)}</td>
                    <td className="py-1 text-right text-muted-foreground tabular-nums">
                      {row.refunded > 0 ? formatMoney(row.refunded) : '–'}
                    </td>
                    <td className="py-1 text-right font-medium tabular-nums">{formatMoney(row.net)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t font-medium">
                  <td className="pt-1.5">Total</td>
                  <td className="pt-1.5 text-right tabular-nums">{formatMoney(data.paid)}</td>
                  <td className="pt-1.5 text-right tabular-nums">
                    {data.refunded > 0 ? formatMoney(data.refunded) : '–'}
                  </td>
                  <td className="pt-1.5 text-right tabular-nums">{formatMoney(data.net)}</td>
                </tr>
              </tfoot>
            </table>
          </>
        ))}
    </DashboardCard>
  )
}
