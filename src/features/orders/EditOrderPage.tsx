import { useState } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/features/auth/auth-context'
import { ApiError } from '@/lib/api-client'
import { apiErrorMessage } from '@/lib/api-errors'
import { todayInColombia } from '@/lib/dates'
import {
  orderDetailsFormSchema,
  orderToDetailsForm,
  toUpdateOrderInput,
  type OrderDetailsFormValues,
} from './order-form-schema'
import { fetchOrder, updateOrderDetails, type Order } from './orders-api'
import { OrderDetailsFields } from './OrderDetailsFields'
import { isOrderEditable } from './order-rules'

function EditOrderForm({ order }: { order: Order }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [submitError, setSubmitError] = useState<string | null>(null)
  const detailPath = `/pedidos/${order.id}`

  const form = useForm<OrderDetailsFormValues>({
    resolver: zodResolver(orderDetailsFormSchema(order)),
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

  // A date already in the past stays selectable only while it isn't changed
  const today = todayInColombia()
  const minDeliveryDate = order.deliveryDate < today ? order.deliveryDate : today

  return (
    <FormProvider {...form}>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
        <OrderDetailsFields minDeliveryDate={minDeliveryDate} />

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

        <div className="flex gap-2">
          <Button type="button" variant="outline" size="lg" onClick={() => navigate(-1)} disabled={mutation.isPending}>
            Descartar
          </Button>
          <Button type="submit" size="lg" className="flex-1" disabled={mutation.isPending}>
            {mutation.isPending ? 'Guardando…' : 'Guardar cambios'}
          </Button>
        </div>
      </form>
    </FormProvider>
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
    content = <p className="text-sm text-muted-foreground">Cargando pedido…</p>
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
    <section className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <Button variant="ghost" size="sm" className="self-start" onClick={() => navigate(-1)}>
        ← Volver
      </Button>
      <h1 className="text-xl font-semibold">Editar pedido{order ? ` para ${order.recipientName}` : ''}</h1>
      {content}
    </section>
  )
}
