import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Input } from '@/components/ui/input'
import { fetchProducts, type Product } from '@/features/products/products-api'
import { formatMoney } from './order-format'

type Props = {
  onPick: (product: Product) => void
}

// Search box with suggestions of available products; picking one adds it to the order
export function ProductPicker({ onPick }: Props) {
  const [text, setText] = useState('')
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)

  // Waits for a short pause in typing before searching
  useEffect(() => {
    const timer = setTimeout(() => setSearch(text.trim()), 250)
    return () => clearTimeout(timer)
  }, [text])

  const { data, isFetching, isError } = useQuery({
    queryKey: ['products', { search, available: true, pageSize: 8 }],
    queryFn: () => fetchProducts({ search, available: true, pageSize: 8 }),
    enabled: open,
  })
  const products = data?.data ?? []

  function pick(product: Product) {
    onPick(product)
    setText('')
    setOpen(false)
  }

  return (
    <div className="relative">
      <Input
        type="search"
        placeholder="Buscar producto para agregar…"
        aria-label="Buscar producto"
        value={text}
        onChange={(event) => {
          setText(event.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        // Delay so a click on a suggestion lands before the list closes
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') setOpen(false)
          // Enter adds the first suggestion instead of submitting the form
          if (event.key === 'Enter') {
            event.preventDefault()
            if (products[0]) pick(products[0])
          }
        }}
      />
      {open && (
        <ul className="absolute z-10 mt-1 max-h-64 w-full overflow-auto rounded-lg border bg-popover p-1 text-sm shadow-md">
          {isError ? (
            <li className="px-2 py-1.5 text-destructive">No se pudieron cargar los productos.</li>
          ) : products.length === 0 ? (
            <li className="px-2 py-1.5 text-muted-foreground">
              {isFetching ? 'Buscando…' : 'No hay productos disponibles con ese nombre.'}
            </li>
          ) : (
            products.map((product) => (
              <li key={product.id}>
                <button
                  type="button"
                  className="flex w-full justify-between gap-2 rounded-md px-2 py-1.5 text-left hover:bg-muted"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => pick(product)}
                >
                  <span>{product.name}</span>
                  <span className="text-muted-foreground">{formatMoney(product.price)}</span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  )
}
