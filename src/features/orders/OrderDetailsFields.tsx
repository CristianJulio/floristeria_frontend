import type { ReactNode } from 'react'
import { cn } from 'cn'
import { useFormContext, useWatch } from 'react-hook-form'
import { CharCount } from '@/components/CharCount'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { OTHER_COUNTRY, PHONE_COUNTRIES } from '@/lib/phone'
import { formatMoney } from './order-format'
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

  return (
    <>
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
          <CardTitle>Entrega</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <FormField id="deliveryDate" label="Fecha" error={errors.deliveryDate?.message}>
            <Input
              id="deliveryDate"
              type="date"
              aria-invalid={!!errors.deliveryDate}
              {...register('deliveryDate')}
            />
          </FormField>
          <FormField id="deliveryTimeFrom" label="Desde (opcional)" error={errors.deliveryTimeFrom?.message}>
            <Input id="deliveryTimeFrom" type="time" {...register('deliveryTimeFrom')} />
          </FormField>
          <FormField id="deliveryTimeTo" label="Hasta (opcional)" error={errors.deliveryTimeTo?.message}>
            <Input
              id="deliveryTimeTo"
              type="time"
              aria-invalid={!!errors.deliveryTimeTo}
              {...register('deliveryTimeTo')}
            />
          </FormField>
          <p className="text-xs text-muted-foreground sm:col-span-3">
            Deja las horas vacías si puede entregarse a cualquier hora. Para una hora exacta, usa la misma en ambas.
          </p>
          <FormField
            id="deliveryFee"
            label="Valor del domicilio (en pesos)"
            error={errors.deliveryFee?.message}
            className="sm:col-span-2"
          >
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
