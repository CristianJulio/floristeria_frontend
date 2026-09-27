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
}

// The products list of an order form: search to add, – / + to change quantities, × to remove
export function OrderItemsEditor({ items, onChange, error, unavailableIds }: Props) {
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0)

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

      {items.length > 0 && (
        <ul className="text-sm">
          {items.map((item) => (
            <li key={item.productId} className="flex items-center gap-2 border-b py-2 last:border-b-0">
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{item.productName}</div>
                {unavailableIds?.has(item.productId) ? (
                  <div className="text-xs font-medium text-destructive">No disponible — quítalo o reemplázalo</div>
                ) : (
                  <div className="text-xs text-muted-foreground">{formatMoney(item.price)} c/u</div>
                )}
              </div>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  size="icon-sm"
                  variant="outline"
                  aria-label={`Quitar una unidad de ${item.productName}`}
                  disabled={item.quantity <= 1}
                  onClick={() => setQuantity(item.productId, item.quantity - 1)}
                >
                  –
                </Button>
                <span className="w-8 text-center tabular-nums" aria-label="Cantidad">
                  {item.quantity}
                </span>
                <Button
                  type="button"
                  size="icon-sm"
                  variant="outline"
                  aria-label={`Agregar una unidad de ${item.productName}`}
                  disabled={item.quantity >= 999}
                  onClick={() => setQuantity(item.productId, item.quantity + 1)}
                >
                  +
                </Button>
              </div>
              <span className="w-24 text-right tabular-nums">{formatMoney(item.price * item.quantity)}</span>
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                aria-label={`Quitar ${item.productName}`}
                onClick={() => remove(item.productId)}
              >
                ×
              </Button>
            </li>
          ))}
        </ul>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex justify-between border-t pt-2 font-semibold">
        <span>Total</span>
        <span className="tabular-nums">{formatMoney(total)}</span>
      </div>
    </div>
  )
}
