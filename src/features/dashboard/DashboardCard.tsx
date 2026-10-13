import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

// The frame every dashboard card shares: a name, a line saying what it counts, and the loading and
// error states. `children` is only shown once the data is there
export function DashboardCard({
  title,
  subtitle,
  isPending,
  isError,
  onRetry,
  className,
  children,
}: {
  title: string
  subtitle?: string
  isPending: boolean
  isError: boolean
  onRetry: () => void
  className?: string
  children: ReactNode
}) {
  return (
    <Card {...(className && { className })}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {isPending ? (
          <p className="text-sm text-muted-foreground">Cargando…</p>
        ) : isError ? (
          <div className="flex items-center gap-3 text-sm">
            <span className="text-destructive">No se pudo cargar.</span>
            <Button size="sm" variant="outline" onClick={onRetry}>
              Reintentar
            </Button>
          </div>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  )
}
