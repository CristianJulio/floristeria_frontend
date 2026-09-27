import { useState, type ReactNode } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ApiError } from '@/lib/api-client'
import { apiErrorMessage } from '@/lib/api-errors'
import { todayInColombia } from '@/lib/dates'
import { OTHER_COUNTRY, PHONE_COUNTRIES } from '@/lib/phone'
import { CITIES, emptyOrderForm, orderFormSchema, toCreateOrderInput, type OrderFormValues } from './order-form-schema'
import { createOrder } from './orders-api'
import { OrderItemsEditor } from './OrderItemsEditor'

function FormField({ id, label, error, children }: { id?: string; label: string; error?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}

function createErrorMessage(error: unknown) {
  if (error instanceof ApiError && error.status === 400 && error.message.startsWith('Products not available')) {
    return 'Algunos productos ya no están disponibles. Quítalos o reemplázalos e inténtalo de nuevo.'
  }
  if (error instanceof ApiError && error.status === 400) {
    return 'Revisa los datos del pedido: alguno no es válido.'
  }
  return apiErrorMessage(error)
}

export function NewOrderPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [submitError, setSubmitError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<OrderFormValues>({
    resolver: zodResolver(orderFormSchema),
    defaultValues: emptyOrderForm(),
  })

  const phoneCountry = useWatch({ control, name: 'phoneCountry' })
  const city = useWatch({ control, name: 'city' })

  const mutation = useMutation({
    mutationFn: (values: OrderFormValues) => createOrder(toCreateOrderInput(values)),
    onSuccess: (order) => {
      queryClient.setQueryData(['order', order.id], order)
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      // Straight to the new order, so a deposit can be recorded right away
      navigate(`/pedidos/${order.id}`, { replace: true })
    },
    onError: (error) => setSubmitError(createErrorMessage(error)),
  })

  const onSubmit = (values: OrderFormValues) => {
    setSubmitError(null)
    mutation.mutate(values)
  }

  return (
    <section className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <Button variant="ghost" size="sm" className="self-start" onClick={() => navigate(-1)}>
        ← Volver
      </Button>
      <h1 className="text-xl font-semibold">Nuevo pedido</h1>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Destinatario</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <FormField id="recipientName" label="Nombre" error={errors.recipientName?.message}>
              <Input id="recipientName" aria-invalid={!!errors.recipientName} {...register('recipientName')} />
            </FormField>
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
                      onClick={() => setValue('city', option, { shouldValidate: true })}
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
                min={todayInColombia()}
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contacto</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <FormField id="senderName" label="Remitente" error={errors.senderName?.message}>
              <Input id="senderName" aria-invalid={!!errors.senderName} {...register('senderName')} />
            </FormField>
            <FormField
              id="phoneNumber"
              label="Teléfono de contacto"
              error={errors.phoneOtherCode?.message ?? errors.phoneNumber?.message}
            >
              <div className="flex gap-2">
                <select
                  aria-label="País"
                  className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm"
                  {...register('phoneCountry')}
                >
                  {PHONE_COUNTRIES.map((country) => (
                    <option key={country.code} value={country.code}>
                      {country.label}
                    </option>
                  ))}
                  <option value={OTHER_COUNTRY}>Otro</option>
                </select>
                {phoneCountry === OTHER_COUNTRY && (
                  <Input
                    aria-label="Código del país"
                    placeholder="+34"
                    inputMode="numeric"
                    className="w-20"
                    aria-invalid={!!errors.phoneOtherCode}
                    {...register('phoneOtherCode')}
                  />
                )}
                <Input
                  id="phoneNumber"
                  type="tel"
                  inputMode="tel"
                  placeholder="300 123 4567"
                  aria-invalid={!!errors.phoneNumber}
                  {...register('phoneNumber')}
                />
              </div>
            </FormField>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tarjeta</CardTitle>
          </CardHeader>
          <CardContent>
            <FormField id="cardMessage" label="Mensaje (opcional)" error={errors.cardMessage?.message}>
              <Textarea id="cardMessage" rows={4} maxLength={255} {...register('cardMessage')} />
            </FormField>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Productos</CardTitle>
          </CardHeader>
          <CardContent>
            <Controller
              control={control}
              name="items"
              render={({ field, fieldState }) => (
                <OrderItemsEditor
                  items={field.value}
                  onChange={field.onChange}
                  {...(fieldState.error?.message && { error: fieldState.error.message })}
                />
              )}
            />
          </CardContent>
        </Card>

        {submitError && (
          <p role="alert" className="text-sm text-destructive">
            {submitError}
          </p>
        )}
        {Object.keys(errors).length > 0 && !submitError && (
          <p role="alert" className="text-sm text-destructive">
            Revisa los campos marcados.
          </p>
        )}

        <Button type="submit" size="lg" disabled={mutation.isPending}>
          {mutation.isPending ? 'Creando pedido…' : 'Crear pedido'}
        </Button>
      </form>
    </section>
  )
}
