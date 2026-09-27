import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/features/auth/auth-context'
import { fetchRoles } from './roles-api'

export function RolesPage() {
  const { can } = useAuth()
  const { data: roles, isPending, isError, refetch } = useQuery({ queryKey: ['roles'], queryFn: fetchRoles })

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-lg font-semibold">Roles</h1>
        {can('roles.create') && (
          <Button nativeButton={false} render={<Link to="/roles/nuevo" />}>
            Nuevo rol
          </Button>
        )}
      </div>

      {isPending ? (
        <p className="text-sm text-muted-foreground">Cargando roles…</p>
      ) : isError ? (
        <div className="flex items-center gap-3 text-sm">
          <span className="text-destructive">No se pudieron cargar los roles.</span>
          <Button size="sm" variant="outline" onClick={() => refetch()}>
            Reintentar
          </Button>
        </div>
      ) : roles.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aún no hay roles.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {roles.map((role) => (
            <li key={role.id}>
              <Link
                to={`/roles/${role.id}`}
                className="flex items-center justify-between gap-3 rounded-lg border p-3 transition-colors hover:bg-muted"
              >
                <div className="min-w-0">
                  <div className="font-medium">
                    {role.name}
                    {role.isProtected && <span className="ml-2 text-xs font-normal text-muted-foreground">(fijo)</span>}
                  </div>
                  {role.description && <div className="truncate text-sm text-muted-foreground">{role.description}</div>}
                </div>
                <span className="shrink-0 text-sm text-muted-foreground">
                  {role.permissions.length} {role.permissions.length === 1 ? 'permiso' : 'permisos'}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
