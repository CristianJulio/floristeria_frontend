import { useEffect, useState } from 'react'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PackageSearchIcon } from 'lucide-react'
import { EmptyState } from '@/components/EmptyState'
import { PaginationControls } from '@/components/PaginationControls'
import { SearchInput } from '@/components/SearchInput'
import { SegmentedControl } from '@/components/SegmentedControl'
import { useAuth } from '@/features/auth/auth-context'
import { apiErrorMessage } from '@/lib/api-errors'
import { formatMoney } from '@/lib/money'
import { fetchProducts, updateProduct, type Product } from './products-api'
import { ProductFormDialog } from './ProductFormDialog'

const AVAILABILITY_FILTERS = [
  { value: 'todos', label: 'Todos', available: undefined },
  { value: 'si', label: 'Disponibles', available: true },
  { value: 'no', label: 'No disponibles', available: false },
] as const

function ProductImage({ product }: { product: Product }) {
  const [broken, setBroken] = useState(false)
  if (!product.imageUrl || broken) return <div className="size-10 shrink-0 rounded-md bg-muted" aria-hidden />
  return (
    <img
      src={product.imageUrl}
      alt=""
      loading="lazy"
      className="size-10 shrink-0 rounded-md object-cover"
      onError={() => setBroken(true)}
    />
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

  const search = params.get('buscar') ?? ''
  const availability = AVAILABILITY_FILTERS.find((f) => f.value === params.get('disponibles')) ?? AVAILABILITY_FILTERS[0]
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

  const filters = { search, available: availability.available, page, pageSize: 20 }
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

      <div className="flex flex-wrap items-center gap-2">
        <SegmentedControl
          label="Disponibilidad"
          options={AVAILABILITY_FILTERS}
          value={availability.value}
          onChange={(value) => setParam('disponibles', value === 'todos' ? null : value)}
          className="flex w-full sm:w-auto"
        />
        <SearchInput
          label="Buscar productos"
          placeholder="Nombre del producto"
          className="w-full sm:w-72"
          value={searchText}
          onChange={(event) => setSearchText(event.target.value)}
        />
      </div>

      {isPending ? (
        <p className="text-sm text-muted-foreground">Cargando productos…</p>
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
          hint="Prueba con otro nombre o cambia la disponibilidad."
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
                          {product.description && (
                            <div className="max-w-md truncate text-xs text-muted-foreground">{product.description}</div>
                          )}
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
        />
      )}
    </section>
  )
}
