import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { addDays, monthRange, todayInColombia, weekRange } from '@/lib/dates'
import { formatDeliveryDay } from '@/features/orders/order-format'
import { IncomeCard } from './IncomeCard'

const monthName = new Intl.DateTimeFormat('es-CO', { month: 'long', year: 'numeric', timeZone: 'UTC' })

// What the orders are worth, by the day they are delivered: today, this week, this month and a range
// of the user's choosing
export function DashboardPage() {
  const today = todayInColombia()
  const week = weekRange(today)
  const month = monthRange(today)
  const [range, setRange] = useState({ from: month.from, to: today })

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-0.5">
        <h1 className="text-xl font-semibold">Resumen</h1>
        <p className="text-sm text-muted-foreground">
          Lo que valen los pedidos según su día de entrega, separado en pedidos y domicilios.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <IncomeCard title="Hoy" subtitle={formatDeliveryDay(today)} from={today} to={today} />
        <IncomeCard
          title="Esta semana"
          subtitle={`${formatDeliveryDay(week.from)} – ${formatDeliveryDay(week.to)}`}
          from={week.from}
          to={week.to}
        />
        <IncomeCard
          title="Este mes"
          subtitle={monthName.format(new Date(`${month.from}T00:00:00Z`))}
          from={month.from}
          to={month.to}
        />
        <IncomeCard title="Rango de fechas" from={range.from} to={range.to}>
          <div className="flex flex-wrap items-center gap-1.5 text-sm">
            <Label htmlFor="income-from" className="sr-only">
              Desde
            </Label>
            <Input
              id="income-from"
              type="date"
              className="h-8 w-auto"
              value={range.from}
              max={range.to}
              min={addDays(range.to, -730)}
              onChange={(event) => event.target.value && setRange({ ...range, from: event.target.value })}
            />
            <span className="text-muted-foreground">a</span>
            <Label htmlFor="income-to" className="sr-only">
              Hasta
            </Label>
            <Input
              id="income-to"
              type="date"
              className="h-8 w-auto"
              value={range.to}
              min={range.from}
              max={addDays(range.from, 730)}
              onChange={(event) => event.target.value && setRange({ ...range, to: event.target.value })}
            />
          </div>
        </IncomeCard>
      </div>
    </section>
  )
}
