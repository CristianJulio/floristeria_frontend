import { useEffect, useState, type ReactNode } from 'react'
import { cn } from 'cn'
import { ChevronDownIcon, SlidersHorizontalIcon } from 'lucide-react'
import { SearchInput } from '@/components/SearchInput'
import { SegmentedControl } from '@/components/SegmentedControl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { addDays, todayInColombia, weekRange } from '@/lib/dates'
import { STATUS_DOT_CLASSES, STATUS_LABELS } from './order-format'
import { ORDER_STATUSES, type OrdersFilters } from './orders-api'
import { DEFAULT_STATUSES } from './useOrderFilters'

// On/off filter shaped like a pill; the optional dot shows the status colour
function FilterChip({ active, dot, onClick, children }: {
  active: boolean
  dot?: string
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-sm transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none',
        active
          ? 'border-primary/30 bg-secondary font-medium text-secondary-foreground'
          : 'border-border text-muted-foreground hover:bg-muted hover:text-foreground',
      )}
    >
      {dot && <span className={cn('size-2 rounded-full', dot, !active && 'opacity-50')} aria-hidden />}
      {children}
    </button>
  )
}

type Props = {
  filters: OrdersFilters
  onChange: (changes: Partial<OrdersFilters>) => void
}

export function OrdersFilterBar({ filters, onChange }: Props) {
  const today = todayInColombia()
  const tomorrow = addDays(today, 1)
  const week = weekRange(today)

  const quickRanges = [
    { value: 'hoy', label: 'Hoy', from: today, to: today },
    { value: 'manana', label: 'Mañana', from: tomorrow, to: tomorrow },
    { value: 'semana', label: 'Esta semana', from: week.from, to: week.to },
  ]
  const activeRange = quickRanges.find((r) => r.from === filters.deliveryFrom && r.to === filters.deliveryTo)

  // Searches after a short pause instead of on every keystroke
  const [search, setSearch] = useState(filters.search)
  useEffect(() => {
    if (search === filters.search) return
    const timer = setTimeout(() => onChange({ search }), 400)
    return () => clearTimeout(timer)
  }, [search, filters.search, onChange])

  // How many of the tucked-away filters differ from the defaults, shown on the "Filtros" button
  const customDates = activeRange === undefined
  const customStatuses =
    filters.statuses.length !== DEFAULT_STATUSES.length ||
    !DEFAULT_STATUSES.every((status) => filters.statuses.includes(status))
  const activeCount = [customDates, customStatuses, filters.pendingPayment, filters.pendingRefund].filter(Boolean).length
  const [open, setOpen] = useState(false)

  const toggleStatus = (status: (typeof ORDER_STATUSES)[number]) => {
    const statuses = filters.statuses.includes(status)
      ? filters.statuses.filter((s) => s !== status)
      : [...filters.statuses, status]
    onChange({ statuses })
  }

  return (
    <div className="flex flex-col gap-3">
      {/* The everyday controls: the day and the search. Everything else is under "Filtros" */}
      <div className="flex flex-wrap items-center gap-2">
        <SegmentedControl
          label="Fecha de entrega"
          options={quickRanges}
          value={activeRange?.value ?? null}
          onChange={(value) => {
            const range = quickRanges.find((r) => r.value === value)!
            onChange({ deliveryFrom: range.from, deliveryTo: range.to })
          }}
          className="flex w-full sm:w-auto"
        />

        <div className="flex min-w-0 flex-1 items-center gap-2 sm:flex-none">
          <SearchInput
            label="Buscar pedidos"
            placeholder="Nombre o teléfono"
            className="min-w-0 flex-1 sm:w-72"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <Button
            variant={activeCount > 0 ? 'secondary' : 'outline'}
            className={cn('h-8', activeCount === 0 && 'bg-card')}
            aria-expanded={open}
            aria-controls="order-filters"
            onClick={() => setOpen((value) => !value)}
          >
            <SlidersHorizontalIcon aria-hidden />
            Filtros
            {activeCount > 0 && <span className="tabular-nums">· {activeCount}</span>}
            <ChevronDownIcon className={cn('transition-transform', open && 'rotate-180')} aria-hidden />
          </Button>
        </div>
      </div>

      {open && (
        <div id="order-filters" className="flex flex-col gap-4 rounded-xl border bg-card p-4">
          {/* Dates and payments side by side when there is room; statuses below */}
          <div className="flex flex-wrap gap-x-10 gap-y-4">
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Fechas de entrega
              </legend>
              <div className="flex flex-wrap items-center gap-1.5 text-sm">
                <Label htmlFor="delivery-from" className="sr-only">
                  Desde
                </Label>
                <Input
                  id="delivery-from"
                  type="date"
                  className="h-8 w-auto"
                  value={filters.deliveryFrom}
                  max={filters.deliveryTo}
                  onChange={(event) => event.target.value && onChange({ deliveryFrom: event.target.value })}
                />
                <span className="text-muted-foreground">a</span>
                <Label htmlFor="delivery-to" className="sr-only">
                  Hasta
                </Label>
                <Input
                  id="delivery-to"
                  type="date"
                  className="h-8 w-auto"
                  value={filters.deliveryTo}
                  min={filters.deliveryFrom}
                  onChange={(event) => event.target.value && onChange({ deliveryTo: event.target.value })}
                />
              </div>
            </fieldset>

            <fieldset className="flex flex-col gap-2">
              <legend className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">Pagos</legend>
              <div className="flex flex-wrap gap-1.5">
                <FilterChip
                  active={filters.pendingPayment}
                  onClick={() => onChange({ pendingPayment: !filters.pendingPayment })}
                >
                  Con pago pendiente
                </FilterChip>
                <FilterChip
                  active={filters.pendingRefund}
                  onClick={() => onChange({ pendingRefund: !filters.pendingRefund })}
                >
                  Con reembolso pendiente
                </FilterChip>
              </div>
            </fieldset>
          </div>

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">Estado</legend>
            <div className="flex flex-wrap gap-1.5">
              {ORDER_STATUSES.map((status) => (
                <FilterChip
                  key={status}
                  active={filters.statuses.includes(status)}
                  dot={STATUS_DOT_CLASSES[status]}
                  onClick={() => toggleStatus(status)}
                >
                  {STATUS_LABELS[status]}
                </FilterChip>
              ))}
            </div>
          </fieldset>

          {activeCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="self-start text-muted-foreground"
              onClick={() =>
                onChange({
                  deliveryFrom: today,
                  deliveryTo: today,
                  statuses: DEFAULT_STATUSES,
                  pendingPayment: false,
                  pendingRefund: false,
                })
              }
            >
              Quitar filtros
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
