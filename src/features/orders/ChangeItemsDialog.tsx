import { useState } from 'react'
import { useMutation, useQueries, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { LoadingState } from '@/components/LoadingState'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ApiError } from '@/lib/api-client'
import { apiErrorMessage } from '@/lib/api-errors'
import { formatMoney } from '@/lib/money'
import { fetchProduct } from '@/features/products/products-api'
import { surchargeOf } from './order-format'
import {
  extrasTotal,
  extrasValid,
  toExtraInput,
  toItemInput,
  type FormExtra,
  type OrderFormValues,
} from './order-form-schema'
import { replaceOrderItems, type Order } from './orders-api'
import { OrderItemsEditor } from './OrderItemsEditor'

type Item = OrderFormValues['items'][number]

type Props = {
  order: Order
  onClose: () => void
}

// Rendered only while open. Saving reprices every item at today's catalog price, so the dialog
// loads the current prices first and the preview matches what will be saved
export function ChangeItemsDialog({ order, onClose }: Props) {
  const queryClient = useQueryClient()
  const [edited, setEdited] = useState<Item[] | null>(null)
  const [editedExtras, setEditedExtras] = useState<FormExtra[] | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const productQueries = useQueries({
    queries: order.items.map((item) => ({
      queryKey: ['product', item.productId],
      queryFn: () => fetchProduct(item.productId),
      // Always today's price, never a cached one
      staleTime: 0,
    })),
  })
  const loading = productQueries.some((query) => query.isPending)
  const loadFailed = productQueries.some((query) => query.isError)
  const currentProducts = new Map(productQueries.flatMap((query) => (query.data ? [[query.data.id, query.data]] : [])))

  // The order's items at their current prices, until staff start editing
  const initialItems: Item[] = order.items.map((item) => ({
    key: item.id,
    productId: item.productId,
    category: item.category,
    deceasedName: item.deceasedName ?? '',
    roomNumber: item.roomNumber ?? '',
    withRibbon: item.withRibbon,
    ribbonText: item.ribbonText ?? '',
    withCard: item.withCard,
    productName: currentProducts.get(item.productId)?.name ?? item.productName,
    price: currentProducts.get(item.productId)?.price ?? item.price,
    quantity: item.quantity,
  }))
  const items = edited ?? initialItems
  const initialExtras: FormExtra[] = order.extras.map((extra) => ({
    key: extra.id,
    name: extra.name,
    price: String(extra.price),
    quantity: extra.quantity,
  }))
  const extras = editedExtras ?? initialExtras

  const unavailableIds = new Set(
    items.filter((item) => currentProducts.get(item.productId)?.available === false).map((item) => item.productId),
  )
  const pricesChanged = order.items.some((item) => {
    const current = currentProducts.get(item.productId)
    return current !== undefined && current.price !== item.price
  })

  // The delivery fee stays the same; only the products change here
  const newTotal = items.reduce((sum, item) => sum + item.price * item.quantity + surchargeOf(item), order.deliveryFee) +
    extrasTotal(extras)
  const netPaid = order.balance.netPaid
  const crownsIncomplete = items.some(
    (item) => item.category === 'CORONAS' && (!item.deceasedName.trim() || !item.roomNumber.trim()),
  )
  const canSave = !loading && !loadFailed && items.length > 0 && unavailableIds.size === 0 && !crownsIncomplete && extrasValid(extras)

  const mutation = useMutation({
    mutationFn: () =>
      replaceOrderItems(
        order.id,
        items.map(toItemInput),
        extras.map(toExtraInput),
      ),
    onSuccess: (updated) => {
      queryClient.setQueryData(['order', order.id], updated)
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      onClose()
    },
    onError: (error) => {
      if (error instanceof ApiError && error.status === 400 && error.message.startsWith('Products not available')) {
        setSubmitError('Algún producto dejó de estar disponible mientras editabas. Quítalo o reemplázalo.')
        queryClient.invalidateQueries({ queryKey: ['product'] })
      } else if (error instanceof ApiError && error.status === 409) {
        setSubmitError('Los productos ya no se pueden cambiar: el pedido dejó de estar pendiente.')
        queryClient.invalidateQueries({ queryKey: ['order', order.id] })
      } else {
        setSubmitError(apiErrorMessage(error))
      }
    },
  })

  return (
    <Dialog open onOpenChange={(open) => !open && !mutation.isPending && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Cambiar productos</DialogTitle>
          <DialogDescription>Todos los productos se cobran al precio actual del catálogo.</DialogDescription>
        </DialogHeader>

        {loading ? (
          <LoadingState label="Cargando precios actuales…" inline />
        ) : loadFailed ? (
          <p className="text-sm text-destructive">No se pudieron cargar los precios actuales. Inténtalo de nuevo.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {pricesChanged && (
              <p className="rounded-md bg-muted px-3 py-2 text-sm">
                Algunos precios cambiaron desde que se tomó el pedido; aquí ya se muestran los actuales.
              </p>
            )}
            <OrderItemsEditor
              items={items}
              onChange={setEdited}
              extras={extras}
              onExtrasChange={setEditedExtras}
              unavailableIds={unavailableIds}
              deliveryFee={order.deliveryFee}
            />
            <div className="flex flex-col gap-1 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Total</span>
                <span className="tabular-nums">
                  {formatMoney(order.balance.total)} → {formatMoney(newTotal)}
                </span>
              </div>
              {netPaid > newTotal && (
                <p className="font-medium text-destructive">
                  Quedará un reembolso pendiente de {formatMoney(netPaid - newTotal)}.
                </p>
              )}
              {netPaid > 0 && newTotal > netPaid && (
                <p className="font-medium text-amber-700 dark:text-amber-400">
                  El cliente quedará debiendo {formatMoney(newTotal - netPaid)}.
                </p>
              )}
            </div>
          </div>
        )}

        {crownsIncomplete && (
          <p className="text-sm text-muted-foreground">Escribe el nombre del fallecido y la sala de cada corona.</p>
        )}

        {submitError && (
          <p role="alert" className="text-sm text-destructive">
            {submitError}
          </p>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={mutation.isPending}>
            Volver
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={!canSave || mutation.isPending}>
            {mutation.isPending ? 'Guardando…' : 'Guardar productos'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
