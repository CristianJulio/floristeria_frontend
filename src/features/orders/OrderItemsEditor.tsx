import { Button } from '@/components/ui/button'
import type { Product } from '@/features/products/products-api'
import { formatMoney } from './order-format'
import type { OrderFormValues } from './order-form-schema'
import { ProductPicker } from './ProductPicker'

type Item = OrderFormValues['items'][number]

type Props = {
  items: Item[]
  onChange: (items: Item[]) => void
  error?: string
  // Products that can no longer be sold; they're highlighted so staff remove or replace them
  unavailableIds?: Set<string>
  // Added to the products in the total; 0 when the order has no fee
  deliveryFee?: number
}

// The products list of an order form: search to add, – / + to change quantities, × to remove
export function OrderItemsEditor({ items, onChange, error, unavailableIds, deliveryFee = 0 }: Props) {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const total = subtotal + deliveryFee

  // A product already in the list gets one more unit instead of a second row
  function add(product: Product) {
    const existing = items.find((item) => item.productId === product.id)
    if (existing) {
      onChange(items.map((item) => (item === existing ? { ...item, quantity: Math.min(item.quantity + 1, 999) } : item)))
    } else {
      onChange([...items, { productId: product.id, productName: product.name, price: product.price, quantity: 1 }])
    }
  }

  function setQuantity(productId: string, quantity: number) {
    onChange(items.map((item) => (item.productId === productId ? { ...item, quantity } : item)))
  }

  function remove(productId: string) {
    onChange(items.filter((item) => item.productId !== productId))
  }

  return (
    <div className="flex flex-col gap-3">
      <ProductPicker onPick={add} />

      {/* A long list scrolls on its own, so the search, total and buttons around it stay on screen
          (in the change-products dialog and in the new order's summary panel) */}
      {items.length > 0 && (
        <ul className="-mr-2 max-h-[40svh] overflow-y-auto pr-2 text-sm">
          {items.map((item) => (
            // Two lines, so it fits narrow places (the order summary panel, the change-products dialog)
            <li key={item.productId} className="flex flex-col gap-1.5 border-b py-2.5 last:border-b-0">
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1 font-medium">{item.productName}</div>
                <Button
                  type="button"
                  size="icon-xs"
                  variant="ghost"
                  className="-mt-0.5 text-muted-foreground"
                  aria-label={`Quitar ${item.productName}`}
                  onClick={() => remove(item.productId)}
                >
                  ×
                </Button>
              </div>
              <div className="flex items-center gap-2">
                {unavailableIds?.has(item.productId) ? (
                  <div className="flex-1 text-xs font-medium text-destructive">No disponible — quítalo o reemplázalo</div>
                ) : (
                  <div className="flex-1 text-xs text-muted-foreground tabular-nums">{formatMoney(item.price)} c/u</div>
                )}
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    size="icon-xs"
                    variant="outline"
                    aria-label={`Quitar una unidad de ${item.productName}`}
                    disabled={item.quantity <= 1}
                    onClick={() => setQuantity(item.productId, item.quantity - 1)}
                  >
                    –
                  </Button>
                  <span className="w-7 text-center tabular-nums" aria-label="Cantidad">
                    {item.quantity}
                  </span>
                  <Button
                    type="button"
                    size="icon-xs"
                    variant="outline"
                    aria-label={`Agregar una unidad de ${item.productName}`}
                    disabled={item.quantity >= 999}
                    onClick={() => setQuantity(item.productId, item.quantity + 1)}
                  >
                    +
                  </Button>
                </div>
                <span className="w-20 text-right tabular-nums">{formatMoney(item.price * item.quantity)}</span>
              </div>
            </li>
          ))}
        </ul>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      {deliveryFee > 0 && (
        <div className="flex flex-col gap-1 border-t pt-3 text-sm text-muted-foreground">
          <div className="flex justify-between">
            <span>Productos</span>
            <span className="tabular-nums">{formatMoney(subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span>Domicilio</span>
            <span className="tabular-nums">{formatMoney(deliveryFee)}</span>
          </div>
        </div>
      )}

      <div className="flex items-baseline justify-between border-t pt-3">
        <span className="font-medium">Total</span>
        <span className="text-xl font-semibold tabular-nums">{formatMoney(total)}</span>
      </div>
    </div>
  )
}
