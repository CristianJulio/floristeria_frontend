import { useState, type ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ApiError } from '@/lib/api-client'
import { apiErrorMessage } from '@/lib/api-errors'
import type { Role } from '@/features/roles/roles-api'
import { changeUserPassword, createUser, deleteUser, reactivateUser, updateUser, type User } from './users-api'

// Same limits as the backend's user schemas
const nameField = z.string().trim().min(1, 'Este campo es obligatorio').max(20, 'Máximo 20 caracteres')
const usernameField = z
  .string()
  .trim()
  .min(3, 'Mínimo 3 caracteres')
  .max(16, 'Máximo 16 caracteres')
  .regex(/^[a-zA-Z0-9_.]+$/, 'Solo letras, números, puntos y guiones bajos')
const passwordField = z.string().min(8, 'Mínimo 8 caracteres').max(72, 'Máximo 72 caracteres')
const roleField = z.string().min(1, 'Elige un rol')

function userErrorMessage(error: unknown) {
  // e.g. "The last user with the Developer role can't lose it"
  const lastProtected = error instanceof ApiError && error.status === 409 && error.message.match(/^The last user with the (.+) role/)
  if (lastProtected) {
    return `Es el último usuario con el rol ${lastProtected[1]} y no puede perderlo. Asigna ese rol a otra persona primero.`
  }
  if (error instanceof ApiError && error.status === 409) return 'Ese nombre de usuario ya existe.'
  if (error instanceof ApiError && error.status === 400 && error.message === 'Role not found') {
    return 'El rol elegido ya no existe. Recarga la página.'
  }
  return apiErrorMessage(error)
}

function Field({ id, label, error, children }: { id: string; label: string; error?: string | undefined; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}

function RoleSelect({ id, roles, ...props }: { id: string; roles: Role[] } & React.ComponentProps<'select'>) {
  return (
    <select id={id} className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm" {...props}>
      <option value="">Elige un rol…</option>
      {roles.map((role) => (
        <option key={role.id} value={role.id}>
          {role.name}
        </option>
      ))}
    </select>
  )
}

function useUserMutation<T>(mutationFn: (input: T) => Promise<unknown>, onClose: () => void) {
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)
  const mutation = useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      onClose()
    },
    onError: (err) => setError(userErrorMessage(err)),
  })
  return { mutation, error, setError }
}

function DialogShell({
  title,
  description,
  pending,
  onClose,
  children,
}: {
  title: string
  description?: ReactNode
  pending: boolean
  onClose: () => void
  children: ReactNode
}) {
  return (
    <Dialog open onOpenChange={(open) => !open && !pending && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  )
}

function Footer({ pending, submitLabel, pendingLabel, onClose, destructive = false }: {
  pending: boolean
  submitLabel: string
  pendingLabel: string
  onClose: () => void
  destructive?: boolean
}) {
  return (
    <DialogFooter>
      <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
        Volver
      </Button>
      <Button type="submit" variant={destructive ? 'destructive' : 'default'} disabled={pending}>
        {pending ? pendingLabel : submitLabel}
      </Button>
    </DialogFooter>
  )
}

function ErrorLine({ error }: { error: string | null }) {
  if (!error) return null
  return (
    <p role="alert" className="text-sm text-destructive">
      {error}
    </p>
  )
}

// Create (no user) or edit (name, last name, username, role); the password has its own dialog
const createSchema = z.object({
  name: nameField,
  lastName: nameField,
  username: usernameField,
  password: passwordField,
  roleId: roleField,
})
const editSchema = createSchema.omit({ password: true })
type UserFormValues = z.infer<typeof createSchema>

export function UserFormDialog({ user, roles, onClose }: { user?: User; roles: Role[]; onClose: () => void }) {
  const isEdit = user !== undefined
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<UserFormValues>({
    resolver: zodResolver(isEdit ? (editSchema as unknown as typeof createSchema) : createSchema),
    defaultValues: {
      name: user?.name ?? '',
      lastName: user?.lastName ?? '',
      username: user?.username ?? '',
      password: '',
      roleId: user?.roleId ?? '',
    },
  })

  const { mutation, error, setError } = useUserMutation((values: UserFormValues) => {
    if (!isEdit) return createUser(values)
    // Only what changed is sent
    const changes = Object.fromEntries(
      (['name', 'lastName', 'username', 'roleId'] as const)
        .filter((key) => values[key] !== user[key])
        .map((key) => [key, values[key]]),
    )
    return Object.keys(changes).length > 0 ? updateUser(user.id, changes) : Promise.resolve()
  }, onClose)

  return (
    <DialogShell title={isEdit ? 'Editar usuario' : 'Nuevo usuario'} pending={mutation.isPending} onClose={onClose}>
      <form
        noValidate
        className="flex flex-col gap-4"
        onSubmit={handleSubmit((values) => {
          setError(null)
          mutation.mutate(values)
        })}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="user-name" label="Nombre" error={errors.name?.message}>
            <Input id="user-name" autoFocus aria-invalid={!!errors.name} {...register('name')} />
          </Field>
          <Field id="user-lastname" label="Apellido" error={errors.lastName?.message}>
            <Input id="user-lastname" aria-invalid={!!errors.lastName} {...register('lastName')} />
          </Field>
        </div>
        <Field id="user-username" label="Usuario (para iniciar sesión)" error={errors.username?.message}>
          <Input id="user-username" autoComplete="off" aria-invalid={!!errors.username} {...register('username')} />
        </Field>
        {!isEdit && (
          <Field id="user-password" label="Contraseña" error={errors.password?.message}>
            <Input
              id="user-password"
              type="password"
              autoComplete="new-password"
              aria-invalid={!!errors.password}
              {...register('password')}
            />
          </Field>
        )}
        <Field id="user-role" label="Rol" error={errors.roleId?.message}>
          <RoleSelect id="user-role" roles={roles} aria-invalid={!!errors.roleId} {...register('roleId')} />
        </Field>
        <ErrorLine error={error} />
        <Footer
          pending={mutation.isPending}
          submitLabel={isEdit ? 'Guardar cambios' : 'Crear usuario'}
          pendingLabel="Guardando…"
          onClose={onClose}
        />
      </form>
    </DialogShell>
  )
}

const passwordSchema = z.object({ password: passwordField })

export function ChangePasswordDialog({ user, onClose }: { user: User; onClose: () => void }) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<{ password: string }>({ resolver: zodResolver(passwordSchema), defaultValues: { password: '' } })
  const { mutation, error, setError } = useUserMutation(
    (password: string) => changeUserPassword(user.id, password),
    onClose,
  )

  return (
    <DialogShell
      title="Cambiar contraseña"
      description={`Para ${user.name} ${user.lastName} (${user.username}). Se cerrarán sus sesiones abiertas.`}
      pending={mutation.isPending}
      onClose={onClose}
    >
      <form
        noValidate
        className="flex flex-col gap-4"
        onSubmit={handleSubmit(({ password }) => {
          setError(null)
          mutation.mutate(password)
        })}
      >
        <Field id="new-password" label="Nueva contraseña" error={errors.password?.message}>
          <Input
            id="new-password"
            type="password"
            autoComplete="new-password"
            autoFocus
            aria-invalid={!!errors.password}
            {...register('password')}
          />
        </Field>
        <ErrorLine error={error} />
        <Footer pending={mutation.isPending} submitLabel="Cambiar contraseña" pendingLabel="Guardando…" onClose={onClose} />
      </form>
    </DialogShell>
  )
}

export function DeleteUserDialog({ user, onClose }: { user: User; onClose: () => void }) {
  const { mutation, error, setError } = useUserMutation(() => deleteUser(user.id), onClose)

  return (
    <DialogShell
      title="Eliminar usuario"
      description={`¿Eliminar a ${user.name} ${user.lastName} (${user.username})? No podrá iniciar sesión y perderá su rol. Se puede reactivar después.`}
      pending={mutation.isPending}
      onClose={onClose}
    >
      <form
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault()
          setError(null)
          mutation.mutate(undefined)
        }}
      >
        <ErrorLine error={error} />
        <Footer pending={mutation.isPending} submitLabel="Eliminar" pendingLabel="Eliminando…" onClose={onClose} destructive />
      </form>
    </DialogShell>
  )
}

export function ReactivateUserDialog({ user, roles, onClose }: { user: User; roles: Role[]; onClose: () => void }) {
  const [roleId, setRoleId] = useState('')
  const { mutation, error, setError } = useUserMutation((id: string) => reactivateUser(user.id, id), onClose)

  return (
    <DialogShell
      title="Reactivar usuario"
      description={`${user.name} ${user.lastName} (${user.username}) podrá iniciar sesión de nuevo con el rol que elijas.`}
      pending={mutation.isPending}
      onClose={onClose}
    >
      <form
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault()
          setError(null)
          if (!roleId) setError('Elige un rol.')
          else mutation.mutate(roleId)
        }}
      >
        <Field id="reactivate-role" label="Rol">
          <RoleSelect id="reactivate-role" roles={roles} value={roleId} onChange={(event) => setRoleId(event.target.value)} />
        </Field>
        <ErrorLine error={error} />
        <Footer pending={mutation.isPending} submitLabel="Reactivar" pendingLabel="Reactivando…" onClose={onClose} />
      </form>
    </DialogShell>
  )
}
