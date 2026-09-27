import { Button } from '@/components/ui/button'

type Props = {
  page: number
  totalPages: number
  total: number
  onPageChange: (page: number) => void
}

export function PaginationControls({ page, totalPages, total, onPageChange }: Props) {
  if (totalPages <= 1) return null

  return (
    <nav aria-label="Paginación" className="flex items-center justify-between gap-2 text-sm">
      <span className="text-muted-foreground">
        Página {page} de {totalPages} · {total} en total
      </span>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          Anterior
        </Button>
        <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
          Siguiente
        </Button>
      </div>
    </nav>
  )
}
