import { useState } from 'react'
import { cn } from 'cn'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { formatClock } from './order-format'

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1)
const MINUTES = [0, 15, 30, 45]

const pad = (n: number) => String(n).padStart(2, '0')

// "14:30" -> { hour: 2, minute: 30, pm: true }; null when there is no time
function parse(value: string) {
  if (!value) return null
  const [h, m] = value.split(':').map(Number)
  return { hour: h % 12 || 12, minute: m, pm: h >= 12 }
}

function toValue(hour: number, minute: number, pm: boolean) {
  return `${pad((hour % 12) + (pm ? 12 : 0))}:${pad(minute)}`
}

// A 12-hour time picked in one panel: hour, minutes and AM/PM all in view. The value it reads and
// gives is "HH:mm" in 24 hours, or '' for no time. AM/PM is never guessed: a new time starts at AM
export function TimeSelect({
  id,
  value,
  onChange,
  invalid,
}: {
  id: string
  value: string
  onChange: (value: string) => void
  invalid?: boolean
}) {
  const [open, setOpen] = useState(false)
  const time = parse(value)
  // What is being typed in the minutes field; null shows the saved minutes
  const [typedMinutes, setTypedMinutes] = useState<string | null>(null)

  const choice = (selected: boolean) => (selected ? 'default' : 'outline')

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        id={id}
        aria-invalid={invalid}
        className={cn(
          'flex h-8 w-full min-w-36 items-center rounded-lg border border-input bg-transparent px-2.5 text-left text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive',
          !time && 'text-muted-foreground',
        )}
      >
        {time ? formatClock(value) : 'Elegir hora'}
      </PopoverTrigger>
      <PopoverContent className="flex flex-col gap-3">
        <div className="grid grid-cols-4 gap-1.5" role="group" aria-label="Hora">
          {HOURS.map((hour) => (
            <Button
              key={hour}
              type="button"
              size="sm"
              variant={choice(time?.hour === hour)}
              onClick={() => onChange(toValue(hour, time?.minute ?? 0, time?.pm ?? false))}
            >
              {hour}
            </Button>
          ))}
        </div>
        <div className="flex gap-1.5" role="group" aria-label="Minutos">
          {MINUTES.map((minute) => (
            <Button
              key={minute}
              type="button"
              size="sm"
              className="flex-1"
              variant={choice(time?.minute === minute)}
              disabled={!time}
              onClick={() => time && onChange(toValue(time.hour, minute, time.pm))}
            >
              :{pad(minute)}
            </Button>
          ))}
          <Input
            aria-label="Otros minutos"
            placeholder="Otro"
            inputMode="numeric"
            maxLength={2}
            className="h-7 w-14 text-center"
            disabled={!time}
            value={typedMinutes ?? (time ? pad(time.minute) : '')}
            onChange={(event) => {
              const digits = event.target.value.replace(/\D/g, '')
              setTypedMinutes(digits)
              if (time && digits !== '' && Number(digits) <= 59) onChange(toValue(time.hour, Number(digits), time.pm))
            }}
            onFocus={(event) => event.target.select()}
            onBlur={() => setTypedMinutes(null)}
          />
        </div>
        <div className="flex gap-1.5" role="group" aria-label="AM o PM">
          {(['AM', 'PM'] as const).map((period) => (
            <Button
              key={period}
              type="button"
              size="sm"
              className="flex-1"
              variant={choice(!!time && time.pm === (period === 'PM'))}
              disabled={!time}
              onClick={() => time && onChange(toValue(time.hour, time.minute, period === 'PM'))}
            >
              {period}
            </Button>
          ))}
        </div>
        <div className="flex justify-between gap-2">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={!time}
            onClick={() => {
              onChange('')
              setOpen(false)
            }}
          >
            Quitar hora
          </Button>
          <Button type="button" size="sm" onClick={() => setOpen(false)}>
            Listo
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
