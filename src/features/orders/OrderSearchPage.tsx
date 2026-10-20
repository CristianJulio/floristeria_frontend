import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router'
import { SearchIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ApiError } from '@/lib/api-client'
import { useAuth } from '@/features/auth/auth-context'
import { fetchOrder } from './orders-api'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Opens an order from its full id, for whoever needs to find one that is not at hand in the lists
export function OrderSearchPage() {
  const { can } = useAuth()
  const navigate = useNavigate()
  const [id, setId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [searching, setSearching] = useState(false)

  if (!can('orders.search_by_id')) return <Navigate to="/" replace />

  async function search(event: FormEvent) {
    event.preventDefault()
    const value = id.trim()
    if (!UUID.test(value)) {
      setError('El id debe tener el formato completo, por ejemplo 3f2a9c1e-5b7d-4c8a-9e10-2a6b4d8f1c33.')
      return
    }
    setError(null)
    setSearching(true)
    try {
      const order = await fetchOrder(value)
      navigate(`/pedidos/${order.id}`)
    } catch (caught) {
      setError(
        caught instanceof ApiError && caught.status === 404
          ? 'No se encontró ningún pedido con ese id.'
          : 'No se pudo buscar el pedido. Inténtalo de nuevo.',
      )
    } finally {
      setSearching(false)
    }
  }

  return (
    <section className="mx-auto flex w-full max-w-xl flex-col gap-4">
      <div className="flex flex-col gap-0.5">
        <h1 className="text-xl font-semibold">Buscar pedido</h1>
        <p className="text-sm text-muted-foreground">Escribe o pega el id completo del pedido</p>
      </div>

      <form onSubmit={search} className="flex flex-col gap-2">
        <Label htmlFor="order-id" className="sr-only">
          Id del pedido
        </Label>
        <div className="flex gap-2">
          <Input
            id="order-id"
            value={id}
            onChange={(event) => setId(event.target.value)}
            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            autoComplete="off"
            spellCheck={false}
            className="bg-card font-mono"
            aria-invalid={error !== null}
          />
          <Button type="submit" disabled={searching || id.trim() === ''}>
            <SearchIcon aria-hidden />
            Buscar
          </Button>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </form>
    </section>
  )
}
