import { useNavigate, useParams } from 'react-router'
import { Button } from '@/components/ui/button'

// Placeholder until the order detail is built
export function OrderDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  return (
    <section className="flex flex-col items-start gap-2">
      {/* Back through history, so the list keeps its filters and page */}
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
        ← Volver
      </Button>
      <h1 className="text-lg font-semibold">Pedido</h1>
      <p className="text-sm text-muted-foreground">El detalle del pedido {id} estará aquí.</p>
    </section>
  )
}
