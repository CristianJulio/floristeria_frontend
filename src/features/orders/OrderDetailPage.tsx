import { useState, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router'
import { useAuth } from '@/features/auth/auth-context'
import { ChangeItemsDialog } from './ChangeItemsDialog'
import { areItemsEditable, isOrderEditable } from './order-rules'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ApiError } from '@/lib/api-client'
import { formatDateTime, formatDeliveryDay, formatDeliveryTime, formatMoney } from './order-format'
import { OrderPaymentsCard } from './OrderPaymentsCard'
import { OrderStatusActions } from './OrderStatusActions'
import { OrderStatusBadge } from './OrderStatusBadge'
import { fetchOrder, type Order } from './orders-api'

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd>{children}</dd>
    </div>
  )
}

function DeliveryCard({ order }: { order: Order }) {
  const address = [order.addressLine1, order.addressLine2].filter(Boolean).join(', ')
  const place = [order.neighborhood, order.city].filter(Boolean).join(', ')

  return (
    <Card>
      <CardHeader>
        <CardTitle>Entrega</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="flex flex-col gap-3 text-sm">
          <Field label="Dirección">
            {address}
            <div className="text-muted-foreground">{place}</div>
          </Field>
          {order.deliveryNotes && <Field label="Indicaciones">{order.deliveryNotes}</Field>}
          <Field label="Teléfono de contacto">
            <a href={`tel:${order.responsiblePhone}`} className="underline-offset-4 hover:underline">
              {order.responsiblePhone}
            </a>
          </Field>
          <Field label="Remitente">{order.senderName}</Field>
        </dl>
      </CardContent>
    </Card>
  )
}

function CardMessageCard({ order }: { order: Order }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Tarjeta</CardTitle>
      </CardHeader>
      <CardContent>
        {order.cardMessage ? (
          // Shown exactly as written, line breaks included, since it has to be copied onto the card
          <p className="rounded-md bg-muted p-3 text-base whitespace-pre-wrap">{order.cardMessage}</p>
        ) : (
          <p className="text-sm text-muted-foreground">Sin mensaje.</p>
        )}
      </CardContent>
    </Card>
  )
}

function ItemsCard({ order }: { order: Order }) {
  const { can } = useAuth()
  const [changing, setChanging] = useState(false)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Productos</CardTitle>
        {can('orders.update_items') && areItemsEditable(order) && (
          <div className="pt-2">
            <Button size="sm" variant="outline" onClick={() => setChanging(true)}>
              Cambiar productos
            </Button>
          </div>
        )}
      </CardHeader>
      {changing && <ChangeItemsDialog order={order} onClose={() => setChanging(false)} />}
      <CardContent>
        <ul className="text-sm">
          {order.items.map((item) => (
            <li key={item.productId} className="flex justify-between gap-2 border-b py-2 last:border-b-0">
              <span>
                {item.quantity}× {item.productName}
                <span className="text-muted-foreground"> · {formatMoney(item.price)} c/u</span>
              </span>
              <span>{formatMoney(item.price * item.quantity)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-2 flex justify-between border-t pt-2 font-semibold">
          <span>Total</span>
          <span>{formatMoney(order.balance.total)}</span>
        </div>
      </CardContent>
    </Card>
  )
}

function RecordCard({ order }: { order: Order }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Registro</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="flex flex-col gap-3 text-sm">
          <Field label="Creado">
            {formatDateTime(order.createdAt)} por {order.createdBy.username}
          </Field>
          {order.updatedAt && order.updatedBy && (
            <Field label="Último cambio">
              {formatDateTime(order.updatedAt)} por {order.updatedBy.username}
            </Field>
          )}
          {order.cancellationReason && <Field label="Motivo de cancelación">{order.cancellationReason}</Field>}
        </dl>
      </CardContent>
    </Card>
  )
}

export function OrderDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { can } = useAuth()

  const { data: order, isPending, isError, error, refetch } = useQuery({
    queryKey: ['order', id],
    queryFn: () => fetchOrder(id),
    // A missing order won't appear by retrying
    retry: (failureCount, err) => !(err instanceof ApiError && [400, 404].includes(err.status)) && failureCount < 3,
  })

  const backButton = (
    // Back through history, so the list keeps its filters and page
    <Button variant="ghost" size="sm" className="self-start" onClick={() => navigate(-1)}>
      ← Volver
    </Button>
  )

  if (isPending) {
    return (
      <section className="flex flex-col gap-2">
        {backButton}
        <p className="text-sm text-muted-foreground">Cargando pedido…</p>
      </section>
    )
  }

  if (isError) {
    const notFound = error instanceof ApiError && [400, 404].includes(error.status)
    return (
      <section className="flex flex-col gap-2">
        {backButton}
        {notFound ? (
          <p className="text-sm">No se encontró el pedido.</p>
        ) : (
          <div className="flex items-center gap-3 text-sm">
            <span className="text-destructive">No se pudo cargar el pedido.</span>
            <Button size="sm" variant="outline" onClick={() => refetch()}>
              Reintentar
            </Button>
          </div>
        )}
      </section>
    )
  }

  return (
    <section className="flex flex-col gap-4">
      {backButton}

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold">{order.recipientName}</h1>
            <OrderStatusBadge status={order.status} />
          </div>
          <p className="text-sm text-muted-foreground">
            Entrega: {formatDeliveryDay(order.deliveryDate)} · {formatDeliveryTime(order)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {can('orders.update') && isOrderEditable(order) && (
            <Button variant="outline" nativeButton={false} render={<Link to={`/pedidos/${order.id}/editar`} />}>
              Editar datos
            </Button>
          )}
          <OrderStatusActions order={order} />
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-4">
          <DeliveryCard order={order} />
          <CardMessageCard order={order} />
          <RecordCard order={order} />
        </div>
        <div className="flex flex-col gap-4">
          <ItemsCard order={order} />
          <OrderPaymentsCard order={order} />
        </div>
      </div>
    </section>
  )
}
