import { useState } from 'react'
import { Controller, FormProvider, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ApiError } from '@/lib/api-client'
import { apiErrorMessage } from '@/lib/api-errors'
import {
  emptyOrderForm,
  orderFormSchema,
  toCreateOrderInput,
  typedDeliveryFee,
  type OrderFormValues,
} from './order-form-schema'
import { createOrder } from './orders-api'
import { OrderDetailsFields } from './OrderDetailsFields'
import { OrderItemsEditor } from './OrderItemsEditor'

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

  const form = useForm<OrderFormValues>({
    resolver: zodResolver(orderFormSchema),
    defaultValues: emptyOrderForm(),
  })
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = form
  const deliveryFee = typedDeliveryFee(useWatch({ control, name: 'deliveryFee' }))

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
    <section className="mx-auto flex w-full max-w-5xl flex-col gap-4">
      <Button variant="ghost" size="sm" className="self-start" onClick={() => navigate(-1)}>
        ← Volver
      </Button>
      <h1 className="text-xl font-semibold">Nuevo pedido</h1>

      <FormProvider {...form}>
        {/* On computers: the order's details on the left, and the products, total and create button
            on the right, staying in view while scrolling. On phones: one column, products last */}
        <form
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          className="flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] lg:items-start"
        >
          <div className="flex flex-col gap-4">
            <OrderDetailsFields />
          </div>

          <div className="flex flex-col gap-4 lg:sticky lg:top-4">
            {/* overflow-visible: the product suggestions list must be able to extend past the card */}
            <Card className="overflow-visible">
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
                      deliveryFee={deliveryFee}
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
          </div>
        </form>
      </FormProvider>
    </section>
  )
}
