import { useState } from 'react'
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SegmentedControl } from '@/components/SegmentedControl'
import { addDays, monthRange, todayInColombia, weekRange } from '@/lib/dates'
import { formatDeliveryDay } from '@/features/orders/order-format'
import { CancellationsCard } from './CancellationsCard'
import { CollectedByMethodCard } from './CollectedByMethodCard'
import { CrownsCard } from './CrownsCard'
import { ExtrasCard } from './ExtrasCard'
import { IncomeCard } from './IncomeCard'
import { OrdersByStatusCard } from './OrdersByStatusCard'
import { PendingPaymentsCard } from './PendingPaymentsCard'
import { SalesByCategoryCard } from './SalesByCategoryCard'
import { SalesByDayCard } from './SalesByDayCard'
import { SummaryStrip } from './SummaryStrip'
import { TopProductsCard } from './TopProductsCard'

const PERIODS = [
  { value: 'dia', label: 'Día' },
  { value: 'semana', label: 'Semana' },
  { value: 'mes', label: 'Mes' },
  { value: 'rango', label: 'Rango' },
] as const

type Period = (typeof PERIODS)[number]['value']

const monthName = new Intl.DateTimeFormat('es-CO', { month: 'long', year: 'numeric', timeZone: 'UTC' })

// The days a period covers around a day, with how to name it under the card's title
function periodDays(period: Exclude<Period, 'rango'>, day: string, today: string) {
  if (period === 'dia') {
    return { from: day, to: day, label: day === today ? `Hoy · ${formatDeliveryDay(day)}` : formatDeliveryDay(day) }
  }
  if (period === 'semana') {
    const week = weekRange(day)
    const range = `${formatDeliveryDay(week.from)} – ${formatDeliveryDay(week.to)}`
    return { ...week, label: week.from <= today && today <= week.to ? `Esta semana · ${range}` : range }
  }
  const month = monthRange(day)
  const name = monthName.format(new Date(`${month.from}T00:00:00Z`))
  return { ...month, label: month.from <= today && today <= month.to ? `Este mes · ${name}` : name }
}

// One day later or earlier, one week, or one month, depending on the period
function shiftDay(period: Exclude<Period, 'rango'>, day: string, direction: 1 | -1) {
  if (period === 'dia') return addDays(day, direction)
  if (period === 'semana') return addDays(day, 7 * direction)
  const month = monthRange(day)
  return direction === 1 ? addDays(month.to, 1) : addDays(month.from, -1)
}

// What the orders are worth, by the day they are delivered, for a day, a week, a month or a range
// of dates chosen here. The arrows move to the previous or next one; "Hoy" comes back to the current
export function DashboardPage() {
  const today = todayInColombia()
  const [period, setPeriod] = useState<Period>('dia')
  const [day, setDay] = useState(today)
  const [range, setRange] = useState({ from: monthRange(today).from, to: today })

  const shown = period === 'rango' ? null : periodDays(period, day, today)
  const from = shown?.from ?? range.from
  const to = shown?.to ?? range.to
  // The period just before: what the average order is compared with. A month is compared with the
  // whole month before it, whatever its length; the others with as many days as they have
  const length = Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000) + 1
  const previous =
    period === 'mes' ? monthRange(addDays(from, -1)) : { from: addDays(from, -length), to: addDays(from, -1) }
  // The sales chart needs more than one day to show anything: for a day, the week it belongs to
  const chart = from === to ? weekRange(from) : { from, to }
  const label = shown?.label ?? `${formatDeliveryDay(range.from)} – ${formatDeliveryDay(range.to)}`
  // Whether it is the day, week or month that contains today, where "Volver a hoy" has nothing to do
  const isCurrent = today >= from && today <= to

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-0.5">
        <h1 className="text-xl font-semibold">Resumen</h1>
        <p className="text-sm text-muted-foreground">{label}</p>
      </div>

      {/* Stays at the top while scrolling, to change the period without going back up */}
      <div className="sticky top-0 z-10 -mx-4 flex flex-wrap items-center gap-2 border-b bg-background px-4 py-2 sm:-mx-6 sm:px-6">
        <SegmentedControl
          label="Período"
          options={PERIODS}
          value={period}
          onChange={setPeriod}
          className="flex w-full sm:w-auto"
        />

        {period === 'rango' ? (
          <div className="flex flex-wrap items-center gap-1.5 text-sm">
            <Label htmlFor="income-from" className="sr-only">
              Desde
            </Label>
            <Input
              id="income-from"
              type="date"
              className="h-8 w-auto bg-card"
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
              className="h-8 w-auto bg-card"
              value={range.to}
              min={range.from}
              max={addDays(range.from, 730)}
              onChange={(event) => event.target.value && setRange({ ...range, to: event.target.value })}
            />
          </div>
        ) : (
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="bg-card"
              aria-label="Anterior"
              onClick={() => setDay(shiftDay(period, day, -1))}
            >
              <ChevronLeftIcon />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="bg-card"
              aria-label="Siguiente"
              onClick={() => setDay(shiftDay(period, day, 1))}
            >
              <ChevronRightIcon />
            </Button>
            {!isCurrent && (
              <Button variant="ghost" onClick={() => setDay(today)}>
                Volver a hoy
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Every card follows the period chosen above */}
      <SummaryStrip from={from} to={to} previous={previous} />

      {/* Wide chart first, then the cards two by two, every pair the same height */}
      <div className="grid gap-4 lg:grid-cols-2">
        <SalesByDayCard
          from={chart.from}
          to={chart.to}
          {...(from === to && { highlight: from })}
          className="lg:col-span-2"
        />
        <IncomeCard from={from} to={to} />
        <OrdersByStatusCard from={from} to={to} />
        <CollectedByMethodCard from={from} to={to} />
        <PendingPaymentsCard from={from} to={to} />
        <SalesByCategoryCard from={from} to={to} />
        <CancellationsCard from={from} to={to} />
        <CrownsCard from={from} to={to} />
        <ExtrasCard from={from} to={to} />
        <TopProductsCard kind="best" from={from} to={to} />
        <TopProductsCard kind="worst" from={from} to={to} />
      </div>
    </section>
  )
}
