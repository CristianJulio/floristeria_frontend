import { useState } from 'react'
import { PlusIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CharCount } from '@/components/CharCount'
import { Input } from '@/components/ui/input'
import type { Product } from '@/features/products/products-api'
import { CROWN_RIBBON_AND_CARD_SURCHARGE, formatMoney, surchargeOf } from './order-format'
import { extrasTotal, typedDeliveryFee, type FormExtra, type OrderFormValues } from './order-form-schema'
import { ProductCatalogDialog } from './ProductCatalogDialog'

type Item = OrderFormValues['items'][number]

// What the form reports for each line's crown fields, by position in the list
type ItemErrors = ({ deceasedName?: { message?: string }; roomNumber?: { message?: string } } | undefined)[]

// What the form reports for each extra's fields, by position in the list
type ExtraErrors = ({ name?: { message?: string }; price?: { message?: string } } | undefined)[]

const itemTotal = (item: Item) => item.price * item.quantity + surchargeOf(item)

type Props = {
  items: Item[]
  onChange: (items: Item[]) => void
  error?: string
  itemErrors?: ItemErrors | undefined
  // Extras: things asked for that aren't catalog products, named and priced by hand
  extras: FormExtra[]
  onExtrasChange: (extras: FormExtra[]) => void
  extraErrors?: ExtraErrors | undefined
  // Products that can no longer be sold; they're highlighted so staff remove or replace them
  unavailableIds?: Set<string>
  // Added to the products in the total; 0 when the order has no fee
  deliveryFee?: number
}

// A crown's own details: who it is for, the room, and whether it carries a ribbon, a card or both
function CrownDetails({
  item,
  errors,
  onChange,
}: {
  item: Item
  errors: ItemErrors[number]
  onChange: (changes: Partial<Item>) => void
}) {
  return (
    <div className="flex flex-col gap-2 py-1">
      <div className="grid grid-cols-[minmax(0,1fr)_5.5rem] gap-2">
        <div className="flex flex-col gap-1">
          <Input
            aria-label="Nombre del fallecido"
            placeholder="Nombre del fallecido"
            maxLength={100}
            className="h-8"
            aria-invalid={!!errors?.deceasedName}
            value={item.deceasedName}
            onChange={(event) => onChange({ deceasedName: event.target.value })}
          />
          {errors?.deceasedName?.message && <p className="text-xs text-destructive">{errors.deceasedName.message}</p>}
        </div>
        <div className="flex flex-col gap-1">
          <Input
            aria-label="Sala"
            placeholder="Sala"
            maxLength={20}
            className="h-8"
            aria-invalid={!!errors?.roomNumber}
            value={item.roomNumber}
            onChange={(event) => onChange({ roomNumber: event.target.value })}
          />
          {errors?.roomNumber?.message && <p className="text-xs text-destructive">{errors.roomNumber.message}</p>}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          role="checkbox"
          aria-checked={item.withRibbon}
          variant={item.withRibbon ? 'default' : 'outline'}
          onClick={() => onChange({ withRibbon: !item.withRibbon })}
        >
          Cinta
        </Button>
        <Button
          type="button"
          size="sm"
          role="checkbox"
          aria-checked={item.withCard}
          variant={item.withCard ? 'default' : 'outline'}
          onClick={() => onChange({ withCard: !item.withCard })}
        >
          Tarjeta
        </Button>
        {item.withRibbon && item.withCard && (
          <span className="text-xs text-muted-foreground tabular-nums">
            + {formatMoney(CROWN_RIBBON_AND_CARD_SURCHARGE)} por las dos
          </span>
        )}
      </div>
      {item.withRibbon && (
        <div className="flex flex-col gap-1">
          <Input
            aria-label="Texto de la cinta"
            placeholder="Texto de la cinta (opcional)"
            maxLength={100}
            className="h-8"
            value={item.ribbonText}
            onChange={(event) => onChange({ ribbonText: event.target.value })}
          />
          <CharCount value={item.ribbonText} max={100} />
        </div>
      )}
    </div>
  )
}

// The products list of an order form: a catalog to add from, – / + to change quantities, × to remove.
// Crowns are the exception: each one is its own line, with its own details instead of a quantity
export function OrderItemsEditor({
  items,
  onChange,
  error,
  itemErrors,
  extras,
  onExtrasChange,
  extraErrors,
  unavailableIds,
  deliveryFee = 0,
}: Props) {
  const subtotal = items.reduce((sum, item) => sum + itemTotal(item), 0) + extrasTotal(extras)
  const total = subtotal + deliveryFee
  const [catalogOpen, setCatalogOpen] = useState(false)

  // A product already in the list gets one more unit instead of a second row; a crown always gets a new line
  function add(product: Product) {
    const existing = items.find((item) => item.productId === product.id)
    if (existing && product.category !== 'CORONAS') {
      onChange(items.map((item) => (item === existing ? { ...item, quantity: Math.min(item.quantity + 1, 999) } : item)))
    } else {
      onChange([
        ...items,
        {
          // Not crypto.randomUUID(), which only exists on secure (https) pages
          key: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          productId: product.id,
          productName: product.name,
          category: product.category,
          price: product.price,
          quantity: 1,
          deceasedName: '',
          roomNumber: '',
          withRibbon: false,
          ribbonText: '',
          withCard: false,
        },
      ])
    }
  }

  function update(key: string, changes: Partial<Item>) {
    onChange(items.map((item) => (item.key === key ? { ...item, ...changes } : item)))
  }

  function addExtra() {
    // Not crypto.randomUUID(), which only exists on secure (https) pages
    const key = `${Date.now()}-${Math.random().toString(36).slice(2)}`
    onExtrasChange([...extras, { key, name: '', price: '', quantity: 1 }])
  }

  function updateExtra(key: string, changes: Partial<FormExtra>) {
    onExtrasChange(extras.map((extra) => (extra.key === key ? { ...extra, ...changes } : extra)))
  }

  function remove(key: string) {
    onChange(items.filter((item) => item.key !== key))
  }

  // From the catalog: one unit less, and the product leaves the order at zero. For a crown it
  // takes off the last line added
  function removeOne(productId: string) {
    const lines = items.filter((item) => item.productId === productId)
    const last = lines[lines.length - 1]
    if (!last) return
    if (last.quantity <= 1) remove(last.key)
    else update(last.key, { quantity: last.quantity - 1 })
  }

  // Units of each product in the order, summed over its lines, for the catalog's cards
  const quantities = new Map<string, number>()
  for (const item of items) quantities.set(item.productId, (quantities.get(item.productId) ?? 0) + item.quantity)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" className="flex-1" onClick={() => setCatalogOpen(true)}>
          <PlusIcon aria-hidden />
          Agregar productos
        </Button>
        <Button type="button" variant="outline" className="flex-1" onClick={addExtra}>
          <PlusIcon aria-hidden />
          Agregar adicional
        </Button>
      </div>
      {catalogOpen && (
        <ProductCatalogDialog
          quantities={quantities}
          onAdd={add}
          onRemoveOne={removeOne}
          onClose={() => setCatalogOpen(false)}
        />
      )}

      {/* A long list scrolls on its own, so the add button, total and buttons around it stay on screen
          (in the change-products dialog and in the new order's summary panel) */}
      {items.length > 0 && (
        <ul className="-mr-2 max-h-[40svh] overflow-y-auto pr-2 text-sm">
          {items.map((item, index) => {
            const isCrown = item.category === 'CORONAS'
            return (
              // Two lines, so it fits narrow places (the order summary panel, the change-products dialog)
              <li key={item.key} className="flex flex-col gap-1.5 border-b py-2.5 last:border-b-0">
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1 font-medium">{item.productName}</div>
                  <Button
                    type="button"
                    size="icon-xs"
                    variant="ghost"
                    className="-mt-0.5 text-muted-foreground"
                    aria-label={`Quitar ${item.productName}`}
                    onClick={() => remove(item.key)}
                  >
                    ×
                  </Button>
                </div>

                {isCrown && (
                  <CrownDetails item={item} errors={itemErrors?.[index]} onChange={(changes) => update(item.key, changes)} />
                )}

                <div className="flex items-center gap-2">
                  {unavailableIds?.has(item.productId) ? (
                    <div className="flex-1 text-xs font-medium text-destructive">No disponible — quítalo o reemplázalo</div>
                  ) : (
                    <div className="flex-1 text-xs text-muted-foreground tabular-nums">
                      {formatMoney(item.price)}
                      {!isCrown && ' c/u'}
                    </div>
                  )}
                  {!isCrown && (
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        size="icon-xs"
                        variant="outline"
                        aria-label={`Quitar una unidad de ${item.productName}`}
                        disabled={item.quantity <= 1}
                        onClick={() => update(item.key, { quantity: item.quantity - 1 })}
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
                        onClick={() => update(item.key, { quantity: item.quantity + 1 })}
                      >
                        +
                      </Button>
                    </div>
                  )}
                  <span className="w-20 text-right tabular-nums">{formatMoney(itemTotal(item))}</span>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {extras.length > 0 && (
        <div className="flex flex-col gap-1">
          <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Adicionales</h3>
          <ul className="text-sm">
            {extras.map((extra, index) => {
              const errors = extraErrors?.[index]
              return (
                <li key={extra.key} className="flex flex-col gap-1.5 border-b py-2.5 last:border-b-0">
                  <div className="flex items-start gap-2">
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <Input
                        aria-label="Nombre del adicional"
                        placeholder="Ej.: Globo de cumpleaños"
                        maxLength={80}
                        className="h-8"
                        aria-invalid={!!errors?.name}
                        value={extra.name}
                        onChange={(event) => updateExtra(extra.key, { name: event.target.value })}
                      />
                      {errors?.name?.message && <p className="text-xs text-destructive">{errors.name.message}</p>}
                    </div>
                    <Button
                      type="button"
                      size="icon-xs"
                      variant="ghost"
                      className="mt-1 text-muted-foreground"
                      aria-label={`Quitar adicional ${extra.name}`}
                      onClick={() => onExtrasChange(extras.filter((other) => other.key !== extra.key))}
                    >
                      ×
                    </Button>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="flex flex-1 flex-col gap-1">
                      <Input
                        aria-label="Precio del adicional"
                        placeholder="Precio c/u"
                        inputMode="numeric"
                        className="h-8 w-32"
                        aria-invalid={!!errors?.price}
                        value={extra.price}
                        onChange={(event) => updateExtra(extra.key, { price: event.target.value })}
                      />
                      {errors?.price?.message && <p className="text-xs text-destructive">{errors.price.message}</p>}
                    </div>
                    <div className="mt-0.5 flex items-center gap-1">
                      <Button
                        type="button"
                        size="icon-xs"
                        variant="outline"
                        aria-label={`Quitar una unidad de ${extra.name || 'adicional'}`}
                        disabled={extra.quantity <= 1}
                        onClick={() => updateExtra(extra.key, { quantity: extra.quantity - 1 })}
                      >
                        –
                      </Button>
                      <span className="w-7 text-center tabular-nums" aria-label="Cantidad">
                        {extra.quantity}
                      </span>
                      <Button
                        type="button"
                        size="icon-xs"
                        variant="outline"
                        aria-label={`Agregar una unidad de ${extra.name || 'adicional'}`}
                        disabled={extra.quantity >= 999}
                        onClick={() => updateExtra(extra.key, { quantity: extra.quantity + 1 })}
                      >
                        +
                      </Button>
                    </div>
                    <span className="mt-1 w-20 text-right tabular-nums">
                      {formatMoney(typedDeliveryFee(extra.price) * extra.quantity)}
                    </span>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
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
