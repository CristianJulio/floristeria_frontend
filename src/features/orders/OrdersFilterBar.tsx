import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { addDays, todayInColombia, weekRange } from '@/lib/dates'
import { STATUS_LABELS } from './order-format'
import { ORDER_STATUSES, type OrdersFilters } from './orders-api'

type Props = {
  filters: OrdersFilters
  onChange: (changes: Partial<OrdersFilters>) => void
}

export function OrdersFilterBar({ filters, onChange }: Props) {
  const today = todayInColombia()
  const tomorrow = addDays(today, 1)
  const week = weekRange(today)

  const quickRanges = [
    { label: 'Hoy', from: today, to: today },
    { label: 'Mañana', from: tomorrow, to: tomorrow },
    { label: 'Esta semana', from: week.from, to: week.to },
  ]

  // Searches after a short pause instead of on every keystroke
  const [search, setSearch] = useState(filters.search)
  useEffect(() => {
    if (search === filters.search) return
    const timer = setTimeout(() => onChange({ search }), 400)
    return () => clearTimeout(timer)
  }, [search, filters.search, onChange])

  const toggleStatus = (status: (typeof ORDER_STATUSES)[number]) => {
    const statuses = filters.statuses.includes(status)
      ? filters.statuses.filter((s) => s !== status)
      : [...filters.statuses, status]
    onChange({ statuses })
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end gap-2">
        {quickRanges.map((range) => {
          const active = filters.deliveryFrom === range.from && filters.deliveryTo === range.to
          return (
            <Button
              key={range.label}
              size="sm"
              variant={active ? 'default' : 'outline'}
              aria-pressed={active}
              onClick={() => onChange({ deliveryFrom: range.from, deliveryTo: range.to })}
            >
              {range.label}
            </Button>
          )
        })}
        <div className="flex items-end gap-2">
          <div className="flex flex-col gap-1">
            <Label htmlFor="delivery-from" className="text-xs">
              Desde
            </Label>
            <Input
              id="delivery-from"
              type="date"
              className="h-7 w-auto"
              value={filters.deliveryFrom}
              max={filters.deliveryTo}
              onChange={(event) => event.target.value && onChange({ deliveryFrom: event.target.value })}
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="delivery-to" className="text-xs">
              Hasta
            </Label>
            <Input
              id="delivery-to"
              type="date"
              className="h-7 w-auto"
              value={filters.deliveryTo}
              min={filters.deliveryFrom}
              onChange={(event) => event.target.value && onChange({ deliveryTo: event.target.value })}
            />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {ORDER_STATUSES.map((status) => {
          const active = filters.statuses.includes(status)
          return (
            <Button
              key={status}
              size="sm"
              variant={active ? 'secondary' : 'ghost'}
              aria-pressed={active}
              className={active ? '' : 'text-muted-foreground'}
              onClick={() => toggleStatus(status)}
            >
              {STATUS_LABELS[status]}
            </Button>
          )
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          type="search"
          placeholder="Buscar por destinatario, remitente o teléfono"
          aria-label="Buscar pedidos"
          className="max-w-sm"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <Button
          size="sm"
          variant={filters.pendingPayment ? 'secondary' : 'outline'}
          aria-pressed={filters.pendingPayment}
          onClick={() => onChange({ pendingPayment: !filters.pendingPayment })}
        >
          Con pago pendiente
        </Button>
        <Button
          size="sm"
          variant={filters.pendingRefund ? 'secondary' : 'outline'}
          aria-pressed={filters.pendingRefund}
          onClick={() => onChange({ pendingRefund: !filters.pendingRefund })}
        >
          Con reembolso pendiente
        </Button>
      </div>
    </div>
  )
}
