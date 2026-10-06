import { useEffect, useState } from 'react'
import { cn } from 'cn'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { LoadingState } from '@/components/LoadingState'
import { SearchInput } from '@/components/SearchInput'
import { SegmentedControl } from '@/components/SegmentedControl'
import { ProductPlaceholder } from '@/features/products/ProductPlaceholder'
import {
  CATEGORY_LABELS,
  PRODUCT_CATEGORIES,
  fetchProducts,
  type Product,
  type ProductCategory,
} from '@/features/products/products-api'
import { formatMoney } from './order-format'

const CATEGORY_FILTERS = [
  { value: 'todos', label: 'Todos' },
  ...PRODUCT_CATEGORIES.map((category) => ({ value: category, label: CATEGORY_LABELS[category] })),
] as const

// The API's largest page; a shop's catalog fits in it, and the search narrows it down if it ever doesn't
const PAGE_SIZE = 100

function ProductPhoto({ product }: { product: Product }) {
  const [broken, setBroken] = useState(false)
  if (!product.imageUrl || broken) return <ProductPlaceholder className="aspect-square w-full rounded-b-none" />
  return (
    <img
      src={product.imageUrl}
      alt=""
      loading="lazy"
      className="aspect-square w-full rounded-t-md object-cover"
      onError={() => setBroken(true)}
    />
  )
}

type Props = {
  // How many of each product the order already has, to show on its card
  quantities: Map<string, number>
  onAdd: (product: Product) => void
  // Takes one unit off; the last one removes the product from the order
  onRemoveOne: (productId: string) => void
  onClose: () => void
}

// The available products as a grid of photos, by category or by name. Each tap adds one unit and
// the dialog stays open, so several products can be added (or taken off with –) in one go
export function ProductCatalogDialog({ quantities, onAdd, onRemoveOne, onClose }: Props) {
  const [category, setCategory] = useState<ProductCategory | 'todos'>('todos')
  const [text, setText] = useState('')
  const [search, setSearch] = useState('')

  // Waits for a short pause in typing before searching
  useEffect(() => {
    const timer = setTimeout(() => setSearch(text.trim()), 250)
    return () => clearTimeout(timer)
  }, [text])

  const filters = {
    search,
    available: true,
    ...(category !== 'todos' && { category }),
    pageSize: PAGE_SIZE,
  }
  const { data, isPending, isError, isFetching, refetch } = useQuery({
    queryKey: ['products', filters],
    queryFn: () => fetchProducts(filters),
    placeholderData: keepPreviousData,
  })

  const itemCount = [...quantities.values()].reduce((sum, quantity) => sum + quantity, 0)

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      {/* A fixed height, so the dialog doesn't jump as filtering changes how many products are shown */}
      <DialogContent className="flex h-[min(90svh,44rem)] flex-col sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Agregar productos</DialogTitle>
          <DialogDescription>
            Toca un producto para agregar una unidad; tócalo otra vez para sumar más.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-2">
          <SegmentedControl
            label="Categoría"
            options={CATEGORY_FILTERS}
            value={category}
            onChange={setCategory}
            className="flex w-full sm:w-auto"
          />
          <SearchInput
            label="Buscar productos"
            placeholder="Nombre del producto"
            className="w-full sm:w-60"
            value={text}
            onChange={(event) => setText(event.target.value)}
          />
        </div>

        {/* Only the grid scrolls, so the filters and the done button stay on screen. The scrollbar's
            space is always reserved, so the cards keep their width whether the grid overflows or not.
            py-1 leaves room for the cards' rings, which the scrolling area would otherwise cut off */}
        <div
          className={cn(
            '-mx-4 min-h-40 flex-1 overflow-y-auto px-4 py-1 transition-opacity [scrollbar-gutter:stable]',
            isFetching && !isPending && 'opacity-60',
          )}
        >
          {isPending ? (
            <LoadingState label="Cargando productos…" />
          ) : isError ? (
            <div className="flex items-center gap-3 py-6 text-sm">
              <span className="text-destructive">No se pudieron cargar los productos.</span>
              <Button size="sm" variant="outline" onClick={() => refetch()}>
                Reintentar
              </Button>
            </div>
          ) : data.data.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              No hay productos disponibles con estos filtros.
            </p>
          ) : (
            <>
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {data.data.map((product) => {
                  const quantity = quantities.get(product.id) ?? 0
                  return (
                    <li key={product.id} className="relative">
                      <button
                        type="button"
                        aria-label={`Agregar ${product.name}${quantity > 0 ? `, ya hay ${quantity} en el pedido` : ''}`}
                        onClick={() => onAdd(product)}
                        className={cn(
                          'relative flex w-full flex-col overflow-hidden rounded-lg border bg-card text-left transition-colors hover:border-primary focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none',
                          quantity > 0 && 'border-primary ring-1 ring-primary',
                        )}
                      >
                        <ProductPhoto product={product} />
                        <span className="flex flex-col gap-0.5 p-2 text-sm">
                          <span className="line-clamp-2 font-medium">{product.name}</span>
                          <span className="text-muted-foreground tabular-nums">{formatMoney(product.price)}</span>
                        </span>
                      </button>
                      {/* Outside the card's button, since a button can't contain another one */}
                      {quantity > 0 && (
                        <div className="absolute top-2 right-2 flex items-center gap-1">
                          <Button
                            type="button"
                            size="icon-sm"
                            variant="outline"
                            className="rounded-full shadow"
                            aria-label={`Quitar una unidad de ${product.name}`}
                            onClick={() => onRemoveOne(product.id)}
                          >
                            –
                          </Button>
                          <span className="flex size-7 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground tabular-nums shadow">
                            {quantity}
                          </span>
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>
              {data.pagination.total > data.data.length && (
                <p className="pt-3 text-center text-xs text-muted-foreground">
                  Mostrando {data.data.length} de {data.pagination.total}. Busca por nombre para encontrar el resto.
                </p>
              )}
            </>
          )}
        </div>

        <DialogFooter className="sm:items-center sm:justify-between">
          <span className="text-sm text-muted-foreground">
            {itemCount === 0
              ? 'Aún no hay productos en el pedido.'
              : `${itemCount} ${itemCount === 1 ? 'unidad' : 'unidades'} en el pedido`}
          </span>
          <Button type="button" onClick={onClose}>
            Listo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
