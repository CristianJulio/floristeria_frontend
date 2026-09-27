import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router'
import { UsersIcon } from 'lucide-react'
import { EmptyState } from '@/components/EmptyState'
import { SegmentedControl } from '@/components/SegmentedControl'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useAuth } from '@/features/auth/auth-context'
import { fetchRoles } from '@/features/roles/roles-api'
import { fetchUsers, type User, type UserStatus } from './users-api'
import { ChangePasswordDialog, DeleteUserDialog, ReactivateUserDialog, UserFormDialog } from './UserDialogs'

const STATUS_FILTERS = [
  { value: 'activos', label: 'Activos', status: 'active' },
  { value: 'eliminados', label: 'Eliminados', status: 'inactive' },
] as const satisfies readonly { value: string; label: string; status: UserStatus }[]

type OpenDialog =
  | { kind: 'new' }
  | { kind: 'edit' | 'password' | 'delete' | 'reactivate'; user: User }

// Editing and reactivating pick a role, so they wait until the roles are loaded
function UserActions({ user, currentUserId, rolesReady, onOpen }: {
  user: User
  currentUserId: string | undefined
  rolesReady: boolean
  onOpen: (dialog: OpenDialog) => void
}) {
  const { can } = useAuth()
  if (!user.isActive) {
    return can('users.reactivate') && rolesReady ? (
      <Button size="sm" variant="ghost" onClick={() => onOpen({ kind: 'reactivate', user })}>
        Reactivar
      </Button>
    ) : null
  }
  return (
    <div className="flex flex-wrap justify-end gap-1">
      {can('users.update') && rolesReady && (
        <Button size="sm" variant="ghost" onClick={() => onOpen({ kind: 'edit', user })}>
          Editar
        </Button>
      )}
      {can('users.change_password') && (
        <Button size="sm" variant="ghost" onClick={() => onOpen({ kind: 'password', user })}>
          Cambiar contraseña
        </Button>
      )}
      {/* Nobody can delete their own account from here */}
      {can('users.delete') && user.id !== currentUserId && (
        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => onOpen({ kind: 'delete', user })}>
          Eliminar
        </Button>
      )}
    </div>
  )
}

export function UsersPage() {
  const { state, can } = useAuth()
  const currentUserId = state.status === 'authenticated' ? state.user.id : undefined
  const [params, setParams] = useSearchParams()
  const [dialog, setDialog] = useState<OpenDialog | null>(null)

  const filter = STATUS_FILTERS.find((f) => f.value === params.get('estado')) ?? STATUS_FILTERS[0]

  const usersQuery = useQuery({ queryKey: ['users', filter.status], queryFn: () => fetchUsers(filter.status) })
  // Roles are needed to show each user's role and to pick one in the dialogs
  const canReadRoles = can('roles.read')
  const rolesQuery = useQuery({ queryKey: ['roles'], queryFn: fetchRoles, enabled: canReadRoles })
  const roles = rolesQuery.data ?? []
  const roleName = (roleId: string | null) =>
    roleId === null ? 'Sin rol' : (roles.find((role) => role.id === roleId)?.name ?? (canReadRoles ? '…' : '—'))

  const needsRoles = can('users.create') || can('users.update') || can('users.reactivate')
  const rolesReady = canReadRoles && rolesQuery.isSuccess

  // e.g. "5 usuarios activos", "1 usuario eliminado"
  const count = usersQuery.data?.length
  const countLabel =
    count === undefined
      ? null
      : `${count} ${count === 1 ? 'usuario' : 'usuarios'} ${filter.status === 'active' ? 'activo' : 'eliminado'}${count === 1 ? '' : 's'}`

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-xl font-semibold">Usuarios</h1>
          {countLabel && <p className="text-sm text-muted-foreground">{countLabel}</p>}
        </div>
        {can('users.create') && (
          <Button disabled={!rolesReady} onClick={() => setDialog({ kind: 'new' })}>
            Nuevo usuario
          </Button>
        )}
      </div>

      <SegmentedControl
        label="Estado de los usuarios"
        options={STATUS_FILTERS}
        value={filter.value}
        onChange={(value) => setParams(value === 'activos' ? {} : { estado: value }, { replace: true })}
        className="self-start"
      />

      {needsRoles && !canReadRoles && (
        <p className="text-sm text-muted-foreground">
          Para crear, editar o reactivar usuarios también necesitas permiso para ver los roles.
        </p>
      )}

      {usersQuery.isPending ? (
        <p className="text-sm text-muted-foreground">Cargando usuarios…</p>
      ) : usersQuery.isError ? (
        <div className="flex items-center gap-3 text-sm">
          <span className="text-destructive">No se pudieron cargar los usuarios.</span>
          <Button size="sm" variant="outline" onClick={() => usersQuery.refetch()}>
            Reintentar
          </Button>
        </div>
      ) : usersQuery.data.length === 0 ? (
        <EmptyState
          icon={UsersIcon}
          title={filter.status === 'active' ? 'No hay usuarios activos.' : 'No hay usuarios eliminados.'}
        />
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-xl border bg-card md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Usuario</TableHead>
                  {filter.status === 'active' && <TableHead>Rol</TableHead>}
                  <TableHead className="sr-only">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usersQuery.data.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">
                      {user.name} {user.lastName}
                      {user.id === currentUserId && <span className="ml-2 text-xs text-muted-foreground">(tú)</span>}
                    </TableCell>
                    <TableCell>{user.username}</TableCell>
                    {filter.status === 'active' && <TableCell>{roleName(user.roleId)}</TableCell>}
                    <TableCell className="text-right">
                      <UserActions
                        user={user}
                        currentUserId={currentUserId}
                        rolesReady={rolesReady}
                        onOpen={setDialog}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <ul className="flex flex-col gap-2 md:hidden">
            {usersQuery.data.map((user) => (
              <li key={user.id} className="flex flex-col gap-2 rounded-xl border bg-card p-4">
                <div>
                  <div className="font-medium">
                    {user.name} {user.lastName}
                    {user.id === currentUserId && <span className="ml-2 text-xs text-muted-foreground">(tú)</span>}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {user.username}
                    {filter.status === 'active' && ` · ${roleName(user.roleId)}`}
                  </div>
                </div>
                <UserActions
                  user={user}
                  currentUserId={currentUserId}
                  rolesReady={rolesReady}
                        onOpen={setDialog}
                />
              </li>
            ))}
          </ul>
        </>
      )}

      {dialog?.kind === 'new' && <UserFormDialog roles={roles} onClose={() => setDialog(null)} />}
      {dialog?.kind === 'edit' && <UserFormDialog user={dialog.user} roles={roles} onClose={() => setDialog(null)} />}
      {dialog?.kind === 'password' && <ChangePasswordDialog user={dialog.user} onClose={() => setDialog(null)} />}
      {dialog?.kind === 'delete' && <DeleteUserDialog user={dialog.user} onClose={() => setDialog(null)} />}
      {dialog?.kind === 'reactivate' && (
        <ReactivateUserDialog user={dialog.user} roles={roles} onClose={() => setDialog(null)} />
      )}
    </section>
  )
}
