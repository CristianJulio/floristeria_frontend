import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router'
import { CharCount } from '@/components/CharCount'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { Textarea } from '@/components/ui/textarea'
import { LoadingState } from '@/components/LoadingState'
import { useAuth } from '@/features/auth/auth-context'
import { ApiError } from '@/lib/api-client'
import { apiErrorMessage } from '@/lib/api-errors'
import { PermissionsChecklist } from './PermissionsChecklist'
import {
  createRole,
  deleteRole,
  fetchPermissions,
  fetchRole,
  setRolePermissions,
  updateRole,
  type Role,
} from './roles-api'

// Same limits as the backend's role schema
const roleDataSchema = z.object({
  name: z.string().trim().min(1, 'Escribe el nombre').max(20, 'Máximo 20 caracteres'),
  description: z.string().trim().max(255, 'Máximo 255 caracteres'),
})
type RoleDataValues = z.infer<typeof roleDataSchema>

function roleErrorMessage(error: unknown) {
  if (error instanceof ApiError && error.status === 409) return 'Ya existe un rol con ese nombre.'
  return apiErrorMessage(error)
}

function RoleDataForm({
  role,
  canEdit,
  onSave,
  saving,
  saveLabel,
  error,
}: {
  role?: Role
  canEdit: boolean
  onSave: (values: RoleDataValues) => void
  saving: boolean
  saveLabel: string
  error: string | null
}) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isDirty },
  } = useForm<RoleDataValues>({
    resolver: zodResolver(roleDataSchema),
    defaultValues: { name: role?.name ?? '', description: role?.description ?? '' },
  })
  const description = useWatch({ control, name: 'description' }) ?? ''

  return (
    <form id="role-data" onSubmit={handleSubmit(onSave)} noValidate className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="role-name">Nombre</Label>
        <Input id="role-name" disabled={!canEdit} aria-invalid={!!errors.name} {...register('name')} />
        {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="role-description">Descripción (opcional)</Label>
        <Textarea id="role-description" disabled={!canEdit} maxLength={255} {...register('description')} />
        <CharCount value={description} max={255} />
        {errors.description && <p className="text-sm text-destructive">{errors.description.message}</p>}
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {/* Editing an existing role: only saved when something changed. Creating: saved with the permissions */}
      {canEdit && role && (
        <Button type="submit" className="self-start" disabled={saving || !isDirty}>
          {saving ? 'Guardando…' : saveLabel}
        </Button>
      )}
    </form>
  )
}

function DeleteRoleButton({ role }: { role: Role }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: () => deleteRole(role.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] })
      navigate('/roles', { replace: true })
    },
    onError: (err) => {
      // e.g. "Role is assigned to 3 user(s)"
      const assigned = err instanceof ApiError && err.status === 409 ? err.message.match(/\d+/)?.[0] : undefined
      setError(
        assigned
          ? `No se puede eliminar: ${assigned === '1' ? 'un usuario tiene' : `${assigned} usuarios tienen`} este rol. Asígnales otro rol primero.`
          : apiErrorMessage(err),
      )
    },
  })

  return (
    <>
      <Button
        variant="outline"
        className="self-start text-destructive"
        onClick={() => {
          setError(null)
          setOpen(true)
        }}
      >
        Eliminar rol
      </Button>
      <Dialog open={open} onOpenChange={(value) => !value && !mutation.isPending && setOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar rol</DialogTitle>
            <DialogDescription>¿Eliminar el rol «{role.name}»? Esto no se puede deshacer.</DialogDescription>
          </DialogHeader>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={mutation.isPending}>
              Volver
            </Button>
            <Button variant="destructive" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
              {mutation.isPending ? 'Eliminando…' : 'Eliminar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

// Creating (/roles/nuevo) saves name, description and permissions together;
// an existing role saves its data and its permissions separately, each with its own permission
export function RolePage() {
  const { id } = useParams()
  const isNew = id === undefined
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { can } = useAuth()

  const roleQuery = useQuery({
    queryKey: ['role', id],
    queryFn: () => fetchRole(id!),
    enabled: !isNew,
  })
  const permissionsQuery = useQuery({ queryKey: ['permissions'], queryFn: fetchPermissions })

  const role = roleQuery.data
  const [selected, setSelected] = useState<Set<string> | null>(null)
  const originalIds = new Set(role?.permissions.map((p) => p.id) ?? [])
  const selectedIds = selected ?? originalIds
  const permissionsChanged =
    selectedIds.size !== originalIds.size || [...selectedIds].some((permissionId) => !originalIds.has(permissionId))

  const [dataError, setDataError] = useState<string | null>(null)
  const [permissionsError, setPermissionsError] = useState<string | null>(null)
  const [permissionsSaved, setPermissionsSaved] = useState(false)

  const onRoleSaved = (saved: Role) => {
    queryClient.setQueryData(['role', saved.id], saved)
    queryClient.invalidateQueries({ queryKey: ['roles'] })
  }

  const createMutation = useMutation({
    mutationFn: (values: RoleDataValues) =>
      createRole({ name: values.name, description: values.description || null, permissionIds: [...selectedIds] }),
    onSuccess: (created) => {
      onRoleSaved(created)
      navigate(`/roles/${created.id}`, { replace: true })
    },
    onError: (error) => setDataError(roleErrorMessage(error)),
  })

  const dataMutation = useMutation({
    mutationFn: (values: RoleDataValues) =>
      updateRole(id!, { name: values.name, description: values.description || null }),
    onSuccess: onRoleSaved,
    onError: (error) => setDataError(roleErrorMessage(error)),
  })

  const permissionsMutation = useMutation({
    mutationFn: () => setRolePermissions(id!, [...selectedIds]),
    onSuccess: (saved) => {
      onRoleSaved(saved)
      setSelected(null)
      setPermissionsSaved(true)
    },
    onError: (error) => setPermissionsError(apiErrorMessage(error)),
  })

  const isProtected = role?.isProtected ?? false
  const canEditData = isNew ? can('roles.create') : can('roles.update') && !isProtected
  const canEditPermissions = isNew ? can('roles.create') : can('roles.update_permissions') && !isProtected

  const back = (
    <Button variant="ghost" size="sm" className="self-start" onClick={() => navigate('/roles')}>
      ← Roles
    </Button>
  )

  if (!isNew && roleQuery.isPending) {
    return (
      <section className="flex flex-col gap-2">
        {back}
        <LoadingState label="Cargando rol…" />
      </section>
    )
  }
  if (!isNew && roleQuery.isError) {
    return (
      <section className="flex flex-col gap-2">
        {back}
        <p className="text-sm text-destructive">{apiErrorMessage(roleQuery.error)}</p>
      </section>
    )
  }

  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      {back}
      <h1 className="text-xl font-semibold">{isNew ? 'Nuevo rol' : role?.name}</h1>
      {isProtected && (
        <p className="text-sm text-muted-foreground">
          Este rol es fijo: tiene todos los permisos y no se puede modificar ni eliminar. Siempre debe quedar al menos
          un usuario con este rol.
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Datos</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Keyed so the form restarts from the saved values after each save */}
          <RoleDataForm
            key={role ? `${role.name}|${role.description}` : 'new'}
            {...(role && { role })}
            canEdit={canEditData}
            onSave={(values) => {
              setDataError(null)
              if (isNew) createMutation.mutate(values)
              else dataMutation.mutate(values)
            }}
            saving={dataMutation.isPending}
            saveLabel="Guardar datos"
            error={dataError}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Permisos</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {permissionsQuery.isPending ? (
            <LoadingState label="Cargando permisos…" inline />
          ) : permissionsQuery.isError ? (
            <p className="text-sm text-destructive">{apiErrorMessage(permissionsQuery.error)}</p>
          ) : (
            <PermissionsChecklist
              permissions={permissionsQuery.data}
              selectedIds={selectedIds}
              onChange={(ids) => {
                setSelected(ids)
                setPermissionsSaved(false)
              }}
              disabled={!canEditPermissions}
            />
          )}
          {permissionsError && (
            <p role="alert" className="text-sm text-destructive">
              {permissionsError}
            </p>
          )}
          {!isNew && canEditPermissions && (
            <div className="flex items-center gap-3">
              <Button
                disabled={!permissionsChanged || permissionsMutation.isPending}
                onClick={() => {
                  setPermissionsError(null)
                  permissionsMutation.mutate()
                }}
              >
                {permissionsMutation.isPending ? 'Guardando…' : 'Guardar permisos'}
              </Button>
              {permissionsSaved && !permissionsChanged && (
                <span className="text-sm text-muted-foreground">Permisos guardados.</span>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {isNew ? (
        <Button type="submit" form="role-data" size="lg" disabled={createMutation.isPending}>
          {createMutation.isPending ? 'Creando rol…' : 'Crear rol'}
        </Button>
      ) : (
        role && !isProtected && can('roles.delete') && <DeleteRoleButton role={role} />
      )}
    </section>
  )
}
