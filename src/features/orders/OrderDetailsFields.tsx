import { useState, type ReactNode } from 'react'
import { cn } from 'cn'
import { Controller, useFormContext, useWatch } from 'react-hook-form'
import { CharCount } from '@/components/CharCount'
import { SegmentedControl } from '@/components/SegmentedControl'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { OTHER_COUNTRY, PHONE_COUNTRIES } from '@/lib/phone'
import { DAY_PARTS, TIME_SLOTS, dayPartOf, formatDeliveryDay, formatDeliveryTime, formatMoney } from './order-format'
import { TimeSelect } from './TimeSelect'
import {
  CITIES,
  RECIPIENT_CONTACT_FIELDS,
  RESPONSIBLE_CONTACT_FIELDS,
  type ContactFields,
  type OrderDetailsFormValues,
} from './order-form-schema'

const CONTACT_OPTIONS = [
  { value: 'PHONE', label: 'Teléfono' },
  { value: 'WHATSAPP_USERNAME', label: 'WhatsApp' },
] as const

export function FormField({
  id,
  label,
  error,
  className,
  action,
  children,
}: {
  id?: string
  label: string
  error?: string | undefined
  className?: string
  // Shown at the end of the label row, e.g. a toggle that changes the field
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {action ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Label htmlFor={id}>{label}</Label>
          {action}
        </div>
      ) : (
        <Label htmlFor={id}>{label}</Label>
      )}
      {children}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}

// A phone (country and number) or a WhatsApp username, chosen with the toggle in the label row.
// Works for either contact of the order, whichever set of form fields it is given
function ContactInput({ fields, label }: { fields: ContactFields; label: string }) {
  const {
    register,
    control,
    setValue,
    formState: { errors },
  } = useFormContext<OrderDetailsFormValues>()
  const type = useWatch({ control, name: fields.type })
  const country = useWatch({ control, name: fields.country })

  return (
    <FormField
      id={type === 'PHONE' ? fields.number : fields.username}
      label={label}
      action={
        <div className="flex gap-2" role="radiogroup" aria-label={`Tipo de contacto: ${label}`}>
          {CONTACT_OPTIONS.map((option) => (
            <Button
              key={option.value}
              type="button"
              size="sm"
              role="radio"
              aria-checked={type === option.value}
              variant={type === option.value ? 'default' : 'outline'}
              onClick={() => setValue(fields.type, option.value, { shouldValidate: true, shouldDirty: true })}
            >
              {option.label}
            </Button>
          ))}
        </div>
      }
      error={
        type === 'PHONE'
          ? (errors[fields.otherCode]?.message ?? errors[fields.number]?.message)
          : errors[fields.username]?.message
      }
    >
      {type === 'WHATSAPP_USERNAME' ? (
        <div className="relative">
          <span className="pointer-events-none absolute inset-y-0 left-2.5 flex items-center text-sm text-muted-foreground">
            @
          </span>
          <Input
            id={fields.username}
            placeholder="usuario"
            autoComplete="off"
            className="pl-6"
            aria-invalid={!!errors[fields.username]}
            {...register(fields.username)}
          />
        </div>
      ) : (
        <div className="flex gap-2">
          <select
            aria-label="País"
            className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm"
            {...register(fields.country)}
          >
            {PHONE_COUNTRIES.map((option) => (
              <option key={option.code} value={option.code}>
                {option.label}
              </option>
            ))}
            <option value={OTHER_COUNTRY}>Otro</option>
          </select>
          {country === OTHER_COUNTRY && (
            <Input
              aria-label="Código del país"
              placeholder="+34"
              inputMode="numeric"
              className="w-20"
              aria-invalid={!!errors[fields.otherCode]}
              {...register(fields.otherCode)}
            />
          )}
          <Input
            id={fields.number}
            type="tel"
            inputMode="tel"
            placeholder="300 123 4567"
            aria-invalid={!!errors[fields.number]}
            {...register(fields.number)}
          />
        </div>
      )}
    </FormField>
  )
}

const DAY_SHORTCUTS = [
  { value: 'today', label: 'Hoy', days: 0 },
  { value: 'tomorrow', label: 'Mañana', days: 1 },
] as const
// Today plus some days, as the "YYYY-MM-DD" a date field takes (local time, not UTC)
function dayFromToday(days: number) {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
// The order's own fields (recipient, delivery, contact, card), shared by the new-order and edit forms.
// Must be rendered inside a react-hook-form FormProvider
export function OrderDetailsFields() {
  const {
    register,
    control,
    setValue,
    formState: { errors },
  } = useFormContext<OrderDetailsFormValues>()
  const city = useWatch({ control, name: 'city' })
  const cardMessage = useWatch({ control, name: 'cardMessage' }) ?? ''
  const deliveryNotes = useWatch({ control, name: 'deliveryNotes' }) ?? ''
  const deliveryFee = (useWatch({ control, name: 'deliveryFee' }) ?? '').trim()
  const deliveryDate = useWatch({ control, name: 'deliveryDate' })
  const timeFrom = useWatch({ control, name: 'deliveryTimeFrom' })
  const timeTo = useWatch({ control, name: 'deliveryTimeTo' })
  // The time is "any hour", a part of the day (a fixed range), an exact time (the same at both ends)
  // or a range of the user's own. A choice made by clicking stays selected even if the values also match another
  const [chosen, setChosen] = useState<'exact' | 'between' | null>(null)
  const dayPart = chosen ? undefined : dayPartOf(timeFrom, timeTo)
  const exactHour = chosen === 'exact' || (!chosen && !!timeFrom && timeFrom === timeTo)
  const betweenHours = chosen === 'between' || (!chosen && !dayPart && !exactHour && (!!timeFrom || !!timeTo))
  const anyHour = !dayPart && !exactHour && !betweenHours
  const timeMode = anyHour ? 'any' : dayPart ? dayPart.label : exactHour ? 'exact' : 'between'
  const timeOptions = [
    { value: 'any', label: 'Cualquier hora' },
    ...DAY_PARTS.map((part) => ({ value: part.label, label: part.label })),
    { value: 'exact', label: 'Hora exacta' },
    { value: 'between', label: 'Entre horas' },
  ]
  const setTimes = (from: string, to: string) => {
    setValue('deliveryTimeFrom', from, { shouldValidate: true, shouldDirty: true })
    setValue('deliveryTimeTo', to, { shouldValidate: true, shouldDirty: true })
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Entrega</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <FormField id="deliveryDate" label="Fecha" error={errors.deliveryDate?.message}>
            <div className="flex flex-wrap items-center gap-2">
              <SegmentedControl
                label="Día de entrega"
                options={DAY_SHORTCUTS}
                value={DAY_SHORTCUTS.find((day) => dayFromToday(day.days) === deliveryDate)?.value ?? null}
                onChange={(value) => {
                  const day = DAY_SHORTCUTS.find((option) => option.value === value)
                  if (day) setValue('deliveryDate', dayFromToday(day.days), { shouldValidate: true, shouldDirty: true })
                }}
              />
              <Input
                id="deliveryDate"
                type="date"
                className="w-auto"
                aria-invalid={!!errors.deliveryDate}
                {...register('deliveryDate')}
              />
            </div>
          </FormField>
          <FormField label="Hora de entrega" error={errors.deliveryTimeFrom?.message ?? errors.deliveryTimeTo?.message}>
            <SegmentedControl
              label="Hora de entrega"
              className="flex w-full flex-wrap sm:inline-flex sm:w-fit"
              options={timeOptions}
              value={timeMode}
              onChange={(mode) => {
                if (mode === 'any') {
                  setChosen(null)
                  setTimes('', '')
                } else if (mode === 'exact') {
                  setChosen('exact')
                  // An exact time is the same time at both ends; keep the start if there is one
                  setTimes(timeFrom, timeFrom)
                } else if (mode === 'between') {
                  setChosen('between')
                } else {
                  const part = DAY_PARTS.find((option) => option.label === mode)
                  if (!part) return
                  setChosen(null)
                  setTimes(part.from, part.to)
                }
              }}
            />
            {exactHour && (
              <div className="rounded-lg bg-muted/40 p-3">
                <TimeSelect id="deliveryTimeFrom" value={timeFrom} onChange={(value) => setTimes(value, value)} />
              </div>
            )}
            {betweenHours && (
              <div className="flex flex-col gap-3 rounded-lg bg-muted/40 p-3">
                <div className="flex flex-wrap gap-2">
                  {TIME_SLOTS.map((slot) => (
                    <Button
                      key={slot.label}
                      type="button"
                      size="sm"
                      variant={timeFrom === slot.from && timeTo === slot.to ? 'default' : 'outline'}
                      onClick={() => setTimes(slot.from, slot.to)}
                    >
                      {slot.label}
                    </Button>
                  ))}
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField id="deliveryTimeFrom" label="Desde">
                    <Controller
                      control={control}
                      name="deliveryTimeFrom"
                      render={({ field }) => <TimeSelect id="deliveryTimeFrom" value={field.value} onChange={field.onChange} />}
                    />
                  </FormField>
                  <FormField id="deliveryTimeTo" label="Hasta">
                    <Controller
                      control={control}
                      name="deliveryTimeTo"
                      render={({ field }) => (
                        <TimeSelect id="deliveryTimeTo" value={field.value} invalid={!!errors.deliveryTimeTo} onChange={field.onChange} />
                      )}
                    />
                  </FormField>
                </div>
              </div>
            )}
          </FormField>
          {/^\d{4}-\d{2}-\d{2}$/.test(deliveryDate) && (
            <p className="border-t pt-3 text-sm text-muted-foreground">
              Entrega:{' '}
              <span className="font-medium text-foreground">
                {formatDeliveryDay(deliveryDate)} · {formatDeliveryTime({ deliveryTimeFrom: timeFrom || null, deliveryTimeTo: timeTo || null })}
              </span>
            </p>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Destinatario</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <FormField id="recipientName" label="Nombre" error={errors.recipientName?.message}>
            <Input id="recipientName" aria-invalid={!!errors.recipientName} {...register('recipientName')} />
          </FormField>
          <ContactInput fields={RECIPIENT_CONTACT_FIELDS} label="Contacto del destinatario (opcional)" />
          <FormField id="addressLine1" label="Dirección" error={errors.addressLine1?.message}>
            <Input
              id="addressLine1"
              placeholder="Calle 84 # 45-12"
              aria-invalid={!!errors.addressLine1}
              {...register('addressLine1')}
            />
          </FormField>
          <FormField id="addressLine2" label="Complemento (opcional)" error={errors.addressLine2?.message}>
            <Input
              id="addressLine2"
              placeholder="Apto, torre, conjunto…"
              aria-invalid={!!errors.addressLine2}
              {...register('addressLine2')}
            />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="neighborhood" label="Barrio (opcional)" error={errors.neighborhood?.message}>
              <Input id="neighborhood" aria-invalid={!!errors.neighborhood} {...register('neighborhood')} />
            </FormField>
            <FormField label="Ciudad" error={errors.city?.message}>
              <div className="flex gap-2" role="radiogroup" aria-label="Ciudad">
                {CITIES.map((option) => (
                  <Button
                    key={option}
                    type="button"
                    size="sm"
                    role="radio"
                    aria-checked={city === option}
                    variant={city === option ? 'default' : 'outline'}
                    onClick={() => setValue('city', option, { shouldValidate: true, shouldDirty: true })}
                  >
                    {option}
                  </Button>
                ))}
              </div>
            </FormField>
          </div>
          <FormField id="deliveryFee" label="Valor del domicilio (en pesos)" error={errors.deliveryFee?.message}>
            <Input
              id="deliveryFee"
              inputMode="numeric"
              autoComplete="off"
              aria-invalid={!!errors.deliveryFee}
              {...register('deliveryFee')}
            />
            {!errors.deliveryFee && /^\d+$/.test(deliveryFee) && (
              <p className="text-xs text-muted-foreground">{formatMoney(Number(deliveryFee))}</p>
            )}
          </FormField>
          <FormField id="deliveryNotes" label="Indicaciones de entrega (opcional)" error={errors.deliveryNotes?.message}>
            <Textarea
              id="deliveryNotes"
              maxLength={255}
              placeholder="Portería, referencias, a quién preguntar…"
              {...register('deliveryNotes')}
            />
            <CharCount value={deliveryNotes} max={255} />
          </FormField>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contacto</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <FormField id="senderName" label="Enviado por" error={errors.senderName?.message}>
            <Input id="senderName" aria-invalid={!!errors.senderName} {...register('senderName')} />
          </FormField>
          <ContactInput fields={RESPONSIBLE_CONTACT_FIELDS} label="Contacto del responsable" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tarjeta</CardTitle>
        </CardHeader>
        <CardContent>
          <FormField id="cardMessage" label="Mensaje (opcional)" error={errors.cardMessage?.message}>
            {/* A plain field like the rest of the form; the gift-card look is for the order page, which
                shows the finished message. min-h-32 leaves room for a few lines before it starts growing */}
            <Textarea
              id="cardMessage"
              rows={5}
              maxLength={1000}
              placeholder="Escribe el mensaje tal como va en la tarjeta"
              className="min-h-32"
              {...register('cardMessage')}
            />
            <CharCount value={cardMessage} max={1000} />
          </FormField>
        </CardContent>
      </Card>
    </>
  )
}
