import { useState } from 'react'
import { FormProvider, useForm, useFormContext, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LoadingState } from '@/components/LoadingState'
import { useAuth } from '@/features/auth/auth-context'
import { ApiError } from '@/lib/api-client'
import { apiErrorMessage } from '@/lib/api-errors'
import {
  orderDetailsFormSchema,
  orderToDetailsForm,
  toUpdateOrderInput,
  typedDeliveryFee,
  type OrderDetailsFormValues,
} from './order-form-schema'
import { fetchOrder, updateOrderDetails, type Order } from './orders-api'
import { OrderDetailsFields } from './OrderDetailsFields'
import { isOrderEditable } from './order-rules'
import { CrownLines } from './CrownLines'
import { formatMoney } from './order-format'
import { OrderStatusBadge } from './OrderStatusBadge'

function EditOrderForm({ order }: { order: Order }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [submitError, setSubmitError] = useState<string | null>(null)
  const detailPath = `/pedidos/${order.id}`

  const form = useForm<OrderDetailsFormValues>({
    resolver: zodResolver(orderDetailsFormSchema),
    defaultValues: orderToDetailsForm(order),
  })
  const {
    handleSubmit,
    formState: { errors },
  } = form

  const mutation = useMutation({
    mutationFn: (values: OrderDetailsFormValues) => updateOrderDetails(order.id, toUpdateOrderInput(values, order)),
    onSuccess: (updated) => {
      queryClient.setQueryData(['order', order.id], updated)
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      navigate(detailPath, { replace: true })
    },
    onError: (error) => {
      if (error instanceof ApiError && error.status === 409) {
        setSubmitError('Este pedido ya no se puede editar: su estado cambió mientras lo editabas.')
        queryClient.invalidateQueries({ queryKey: ['order', order.id] })
      } else if (error instanceof ApiError && error.status === 400) {
        setSubmitError('Revisa los datos del pedido: alguno no es válido.')
      } else {
        setSubmitError(apiErrorMessage(error))
      }
    },
  })

  const onSubmit = (values: OrderDetailsFormValues) => {
    setSubmitError(null)
    // Nothing changed: no request needed
    if (Object.keys(toUpdateOrderInput(values, order)).length === 0) {
      navigate(detailPath, { replace: true })
      return
    }
    mutation.mutate(values)
  }

  return (
    <FormProvider {...form}>
      {/* Same layout as the new order form: details on the left; on computers, a summary with the
          save buttons on the right that stays in view while scrolling */}
      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] lg:items-start"
      >
        <div className="flex flex-col gap-4">
          <OrderDetailsFields />
        </div>

        <div className="flex flex-col gap-4 lg:sticky lg:top-4">
          <OrderSummaryCard order={order} />

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

          <div className="flex gap-2 lg:flex-col-reverse">
            <Button type="button" variant="outline" size="lg" onClick={() => navigate(detailPath)} disabled={mutation.isPending}>
              Descartar
            </Button>
            <Button type="submit" size="lg" className="flex-1 lg:flex-none" disabled={mutation.isPending}>
              {mutation.isPending ? 'Guardando…' : 'Guardar cambios'}
            </Button>
          </div>
        </div>
      </form>
    </FormProvider>
  )
}

// What this page doesn't change, for reference while editing: status and products. The total
// follows the delivery fee being typed. Must be rendered inside the form's FormProvider
function OrderSummaryCard({ order }: { order: Order }) {
  const { control } = useFormContext<OrderDetailsFormValues>()
  const deliveryFee = typedDeliveryFee(useWatch({ control, name: 'deliveryFee' }))
  const subtotal = order.balance.subtotal

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2">
          Pedido
          <OrderStatusBadge status={order.status} />
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <ul className="text-sm">
          {order.items.map((item) => (
            <li key={item.id} className="flex justify-between gap-2 border-b py-2 last:border-b-0">
              <span>
                {item.quantity}× {item.productName}
                <CrownLines item={item} />
              </span>
              <span className="tabular-nums">{formatMoney(item.price * item.quantity + item.surcharge)}</span>
            </li>
          ))}
          {order.extras.map((extra) => (
            <li key={extra.id} className="flex justify-between gap-2 border-b py-2 last:border-b-0">
              <span>
                {extra.quantity}× {extra.name}
              </span>
              <span className="tabular-nums">{formatMoney(extra.price * extra.quantity)}</span>
            </li>
          ))}
        </ul>
        {deliveryFee > 0 && (
          <div className="flex justify-between border-t pt-3 text-sm text-muted-foreground">
            <span>Domicilio</span>
            <span className="tabular-nums">{formatMoney(deliveryFee)}</span>
          </div>
        )}
        <div className="flex items-baseline justify-between border-t pt-3">
          <span className="font-medium">Total</span>
          <span className="text-xl font-semibold tabular-nums">{formatMoney(subtotal + deliveryFee)}</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Los productos y los pagos se cambian desde la página del pedido.
        </p>
      </CardContent>
    </Card>
  )
}

// Edits the delivery details; items and payments have their own actions on the detail page
export function EditOrderPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { can } = useAuth()

  const { data: order, isPending, isError, refetch } = useQuery({
    queryKey: ['order', id],
    queryFn: () => fetchOrder(id),
  })

  let content
  if (isPending) {
    content = <LoadingState label="Cargando pedido…" />
  } else if (isError) {
    content = (
      <div className="flex items-center gap-3 text-sm">
        <span className="text-destructive">No se pudo cargar el pedido.</span>
        <Button size="sm" variant="outline" onClick={() => refetch()}>
          Reintentar
        </Button>
      </div>
    )
  } else if (!can('orders.update')) {
    content = <p className="text-sm">No tienes permiso para editar pedidos.</p>
  } else if (!isOrderEditable(order)) {
    content = <p className="text-sm">Este pedido ya no se puede editar: está en camino, entregado o cancelado.</p>
  } else {
    content = <EditOrderForm order={order} />
  }

  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col gap-4">
      <Button variant="ghost" size="sm" className="self-start" onClick={() => navigate(`/pedidos/${id}`)}>
        ← Volver
      </Button>
      <h1 className="text-xl font-semibold">Editar pedido{order ? ` para ${order.recipientName}` : ''}</h1>
      {content}
    </section>
  )
}
