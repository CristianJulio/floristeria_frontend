import { useEffect, useState } from 'react'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PackageSearchIcon } from 'lucide-react'
import { EmptyState } from '@/components/EmptyState'
import { PaginationControls } from '@/components/PaginationControls'
import { SearchInput } from '@/components/SearchInput'
import { LoadingState } from '@/components/LoadingState'
import { useAuth } from '@/features/auth/auth-context'
import { apiErrorMessage } from '@/lib/api-errors'
import { formatMoney } from '@/lib/money'
import { CATEGORY_LABELS, PRODUCT_CATEGORIES, fetchProducts,
  updateProduct,
  type Product,
  type ProductsSort,
} from './products-api'
import { ProductFormDialog } from './ProductFormDialog'
import { ProductPlaceholder } from './ProductPlaceholder'

// In the address as the label in lowercase, e.g. ?categoria=ramos
const CATEGORY_FILTERS = [
  { value: 'todos', label: 'Todos', category: undefined },
  ...PRODUCT_CATEGORIES.map((category) => ({
    value: CATEGORY_LABELS[category].toLowerCase(),
    label: CATEGORY_LABELS[category],
    category,
  })),
]

// In the address as ?orden=mayor-precio; lowest price first when not set
const SORT_OPTIONS: readonly { value: string; label: string; sort: ProductsSort }[] = [
  { value: 'menor-precio', label: 'Precio: menor a mayor', sort: 'price_asc' },
  { value: 'mayor-precio', label: 'Precio: mayor a menor', sort: 'price_desc' },
  { value: 'nombre', label: 'Nombre: A-Z', sort: 'name' },
]

function ProductImage({ product }: { product: Product }) {
  const [broken, setBroken] = useState(false)
  const [open, setOpen] = useState(false)
  if (!product.imageUrl || broken) return <ProductPlaceholder className="size-10 shrink-0" />
  return (
    <>
      <button
        type="button"
        aria-label={`Ver imagen de ${product.name}`}
        className="shrink-0 cursor-zoom-in rounded-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        onClick={() => setOpen(true)}
      >
        <img
          src={product.imageUrl}
          alt=""
          loading="lazy"
          className="size-10 rounded-md object-cover"
          onError={() => setBroken(true)}
        />
      </button>
      {/* Shows the image at full size so staff can see the arrangement */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="pr-8">{product.name}</DialogTitle>
          </DialogHeader>
          <img src={product.imageUrl} alt={product.name} className="max-h-[70vh] w-full rounded-md object-contain" />
        </DialogContent>
      </Dialog>
    </>
  )
}

// Turns a product on or off for sale in one tap; saved immediately
function AvailabilitySwitch({ product, disabled }: { product: Product; disabled: boolean }) {
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)
  const mutation = useMutation({
    mutationFn: (available: boolean) => updateProduct(product.id, { available }),
    onSuccess: () => {
      setError(null)
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
    onError: (err) => setError(apiErrorMessage(err)),
  })
  // Shows the new position while saving, instead of waiting for the list to reload
  const checked = mutation.isPending ? mutation.variables : product.available

  return (
    <div className="flex flex-col items-start gap-1">
      <Switch
        checked={checked}
        disabled={disabled || mutation.isPending}
        aria-label={`${product.name}: ${checked ? 'disponible' : 'no disponible'}`}
        onCheckedChange={(value) => mutation.mutate(value)}
      />
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  )
}

export function ProductsPage() {
  const { can } = useAuth()
  const [params, setParams] = useSearchParams()
  const [dialogProduct, setDialogProduct] = useState<Product | 'new' | null>(null)
  const [createdName, setCreatedName] = useState<string | null>(null)

  // The confirmation fades away on its own
  useEffect(() => {
    if (!createdName) return
    const timer = setTimeout(() => setCreatedName(null), 5000)
    return () => clearTimeout(timer)
  }, [createdName])

  const search = params.get('buscar') ?? ''
  const onlyAvailable = params.get('disponibles') === 'si'
  const category = CATEGORY_FILTERS.find((f) => f.value === params.get('categoria')) ?? CATEGORY_FILTERS[0]
  const sort = SORT_OPTIONS.find((o) => o.value === params.get('orden')) ?? SORT_OPTIONS[0]!
  const page = Math.max(1, Number(params.get('pagina')) || 1)

  // Filters live in the page's address, like the orders list; any change goes back to page 1
  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    if (key !== 'pagina') next.delete('pagina')
    setParams(next, { replace: true })
  }

  // Searches after a short pause instead of on every keystroke
  const [searchText, setSearchText] = useState(search)
  useEffect(() => {
    if (searchText === search) return
    const timer = setTimeout(() => setParam('buscar', searchText.trim() || null), 400)
    return () => clearTimeout(timer)
  })

  const filters = { search, available: onlyAvailable ? true : undefined, category: category.category, sort: sort.sort, page, pageSize: 20 }
  const { data, isPending, isError, isFetching, refetch } = useQuery({
    queryKey: ['products', filters],
    queryFn: () => fetchProducts(filters),
    placeholderData: keepPreviousData,
  })

  const canEdit = can('products.update')

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-xl font-semibold">Productos</h1>
          {data && (
            <p className="text-sm text-muted-foreground">
              {data.pagination.total} {data.pagination.total === 1 ? 'producto' : 'productos'}
            </p>
          )}
        </div>
        {can('products.create') && <Button onClick={() => setDialogProduct('new')}>Nuevo producto</Button>}
      </div>

      {createdName && (
        <p
          role="status"
          className="flex items-center justify-between gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
        >
          <span>
            Producto <span className="font-medium">{createdName}</span> creado.
          </span>
          <button type="button" className="underline-offset-4 hover:underline" onClick={() => setCreatedName(null)}>
            Cerrar
          </button>
        </p>
      )}

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <SearchInput
            label="Buscar productos"
            placeholder="Buscar producto…"
            className="min-w-0 flex-1 basis-56"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
          />
          <select
            aria-label="Ordenar por"
            value={sort.value}
            onChange={(event) =>
              setParam('orden', event.target.value === SORT_OPTIONS[0]!.value ? null : event.target.value)
            }
            className="h-8 w-full rounded-lg border border-input bg-card px-2 text-sm sm:w-auto"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          {/* One line that scrolls sideways on phones instead of wrapping into several rows */}
          <div
            role="radiogroup"
            aria-label="Categoría"
            className="-mx-4 flex max-w-full gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0"
          >
            {CATEGORY_FILTERS.map((option) => (
              <Button
                key={option.value}
                type="button"
                size="sm"
                role="radio"
                aria-checked={category.value === option.value}
                variant={category.value === option.value ? 'default' : 'outline'}
                className="shrink-0 rounded-full"
                onClick={() => setParam('categoria', option.value === 'todos' ? null : option.value)}
              >
                {option.label}
              </Button>
            ))}
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={onlyAvailable} onCheckedChange={(value) => setParam('disponibles', value ? 'si' : null)} />
            Solo disponibles
          </label>
        </div>
      </div>

      {isPending ? (
        <LoadingState label="Cargando productos…" />
      ) : isError ? (
        <div className="flex items-center gap-3 text-sm">
          <span className="text-destructive">No se pudieron cargar los productos.</span>
          <Button size="sm" variant="outline" onClick={() => refetch()}>
            Reintentar
          </Button>
        </div>
      ) : data.data.length === 0 ? (
        <EmptyState
          icon={PackageSearchIcon}
          title="No hay productos con estos filtros."
          hint="Prueba con otro nombre o cambia la categoría o la disponibilidad."
        />
      ) : (
        <div className={isFetching ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
          <div className="hidden overflow-hidden rounded-xl border bg-card md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead className="text-right">Precio</TableHead>
                  <TableHead>Disponible</TableHead>
                  {canEdit && <TableHead className="sr-only">Acciones</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.data.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <ProductImage product={product} />
                        <div className="min-w-0">
                          <div className="font-medium">{product.name}</div>
                          <div className="max-w-md truncate text-xs text-muted-foreground">
                            {CATEGORY_LABELS[product.category]}
                            {product.description && ` · ${product.description}`}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">{formatMoney(product.price)}</TableCell>
                    <TableCell>
                      <AvailabilitySwitch product={product} disabled={!canEdit} />
                    </TableCell>
                    {canEdit && (
                      <TableCell className="text-right">
                        <Button size="sm" variant="ghost" onClick={() => setDialogProduct(product)}>
                          Editar
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <ul className="flex flex-col gap-2 md:hidden">
            {data.data.map((product) => (
              <li key={product.id} className="flex items-center gap-3 rounded-xl border bg-card p-3">
                <ProductImage product={product} />
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{product.name}</div>
                  <div className="text-xs text-muted-foreground">{CATEGORY_LABELS[product.category]}</div>
                  <div className="text-sm tabular-nums">{formatMoney(product.price)}</div>
                </div>
                <AvailabilitySwitch product={product} disabled={!canEdit} />
                {canEdit && (
                  <Button size="sm" variant="ghost" onClick={() => setDialogProduct(product)}>
                    Editar
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {data && (
        <PaginationControls
          page={data.pagination.page}
          totalPages={data.pagination.totalPages}
          total={data.pagination.total}
          onPageChange={(next) => setParam('pagina', String(next))}
        />
      )}

      {dialogProduct && (
        <ProductFormDialog
          {...(dialogProduct !== 'new' && { product: dialogProduct })}
          onClose={() => setDialogProduct(null)}
          onCreated={(created) => setCreatedName(created.name)}
        />
      )}
    </section>
  )
}
