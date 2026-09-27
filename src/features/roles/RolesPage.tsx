import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router'
import { ChevronRightIcon, ShieldIcon } from 'lucide-react'
import { EmptyState } from '@/components/EmptyState'
import { Button } from '@/components/ui/button'
import { LoadingState } from '@/components/LoadingState'
import { useAuth } from '@/features/auth/auth-context'
import { fetchRoles } from './roles-api'

export function RolesPage() {
  const { can } = useAuth()
  const { data: roles, isPending, isError, refetch } = useQuery({ queryKey: ['roles'], queryFn: fetchRoles })

  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-xl font-semibold">Roles</h1>
          {roles && (
            <p className="text-sm text-muted-foreground">
              {roles.length} {roles.length === 1 ? 'rol' : 'roles'}
            </p>
          )}
        </div>
        {can('roles.create') && (
          <Button nativeButton={false} render={<Link to="/roles/nuevo" />}>
            Nuevo rol
          </Button>
        )}
      </div>

      {isPending ? (
        <LoadingState label="Cargando roles…" />
      ) : isError ? (
        <div className="flex items-center gap-3 text-sm">
          <span className="text-destructive">No se pudieron cargar los roles.</span>
          <Button size="sm" variant="outline" onClick={() => refetch()}>
            Reintentar
          </Button>
        </div>
      ) : roles.length === 0 ? (
        <EmptyState icon={ShieldIcon} title="Aún no hay roles." />
      ) : (
        <ul className="flex flex-col gap-2">
          {roles.map((role) => (
            <li key={role.id}>
              <Link
                to={`/roles/${role.id}`}
                className="flex items-center justify-between gap-3 rounded-xl border bg-card p-4 transition-colors hover:border-primary/40"
              >
                <div className="min-w-0">
                  <div className="font-medium">
                    {role.name}
                    {role.isProtected && (
                      <span className="ml-2 rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
                        Fijo
                      </span>
                    )}
                  </div>
                  {role.description && <div className="truncate text-sm text-muted-foreground">{role.description}</div>}
                </div>
                <span className="flex shrink-0 items-center gap-1 text-sm text-muted-foreground">
                  {role.permissions.length} {role.permissions.length === 1 ? 'permiso' : 'permisos'}
                  <ChevronRightIcon className="size-4" aria-hidden />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
