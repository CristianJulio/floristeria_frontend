import { cn } from 'cn'

type Option<T extends string> = { value: T; label: string }

type Props<T extends string> = {
  options: readonly Option<T>[]
  // null when none of the options matches (e.g. a custom date range)
  value: T | null
  onChange: (value: T) => void
  label: string
  className?: string
}

// A row of mutually exclusive options joined in one control (e.g. Hoy / Mañana / Esta semana)
export function SegmentedControl<T extends string>({ options, value, onChange, label, className }: Props<T>) {
  return (
    <div role="group" aria-label={label} className={cn('inline-flex rounded-lg border bg-card p-0.5', className)}>
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={cn(
              'flex-1 rounded-md px-3 py-1 text-sm font-medium whitespace-nowrap transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none sm:flex-none',
              active ? 'bg-secondary text-secondary-foreground' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
