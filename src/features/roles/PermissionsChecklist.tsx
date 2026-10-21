import { useMutation, useQueryClient } from '@tanstack/react-query'
import { EyeIcon, EyeOffIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { apiErrorMessage } from '@/lib/api-errors'
import { useAuth } from '@/features/auth/auth-context'
import { PERMISSION_GROUPS } from './permission-labels'
import { setPermissionHidden, type Permission } from './roles-api'

type Props = {
  permissions: Permission[]
  selectedIds: Set<string>
  onChange: (selectedIds: Set<string>) => void
  disabled?: boolean
}

// The role's permissions as grouped checkboxes with Spanish names
export function PermissionsChecklist({ permissions, selectedIds, onChange, disabled = false }: Props) {
  const { can } = useAuth()
  const queryClient = useQueryClient()
  // Who may see the hidden permissions may also choose which ones are hidden
  const canHide = can('permissions.view_hidden')
  const hiding = useMutation({
    mutationFn: ({ id, hidden }: { id: string; hidden: boolean }) => setPermissionHidden(id, hidden),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['permissions'] }),
    onError: (error) => toast.error(apiErrorMessage(error)),
  })
  const byName = new Map(permissions.map((permission) => [permission.name, permission]))
  const labelled = new Set(PERMISSION_GROUPS.flatMap((group) => group.permissions.map((p) => p.name)))

  const groups = PERMISSION_GROUPS.map((group) => ({
    title: group.title,
    items: group.permissions.flatMap((p) => {
      const permission = byName.get(p.name)
      return permission ? [{ id: permission.id, label: p.label, name: permission.name, hidden: permission.hidden }] : []
    }),
  }))
  // Permissions without a Spanish name (e.g. created through the API) keep their technical name
  const others = permissions.filter((permission) => !labelled.has(permission.name))
  if (others.length > 0) {
    groups.push({
      title: 'Otros',
      items: others.map((permission) => ({
        id: permission.id,
        label: permission.name,
        name: permission.name,
        hidden: permission.hidden,
      })),
    })
  }

  function toggle(id: string) {
    const next = new Set(selectedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    onChange(next)
  }

  function setGroup(ids: string[], selected: boolean) {
    const next = new Set(selectedIds)
    for (const id of ids) {
      if (selected) next.add(id)
      else next.delete(id)
    }
    onChange(next)
  }

  return (
    // Each group is a small panel; two columns on computers so the page stays short. The panels stack
    // in the columns (not in rows), so a tall one doesn't leave a gap beside a short one
    <div className="gap-3 md:columns-2">
      {groups
        .filter((group) => group.items.length > 0)
        .map((group) => {
          const ids = group.items.map((item) => item.id)
          const selectedCount = ids.filter((id) => selectedIds.has(id)).length
          const allSelected = selectedCount === ids.length
          return (
            <fieldset
              key={group.title}
              className="mb-3 flex break-inside-avoid flex-col gap-1 rounded-lg border p-3"
              disabled={disabled}
            >
              <legend className="sr-only">{group.title}</legend>
              <div className="flex items-center justify-between gap-2 pb-1">
                <span className="flex items-baseline gap-2">
                  {/* The name is already announced by the legend */}
                  <span className="font-medium" aria-hidden>
                    {group.title}
                  </span>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {selectedCount} de {ids.length}
                  </span>
                </span>
                {!disabled && (
                  <Button type="button" size="xs" variant="ghost" onClick={() => setGroup(ids, !allSelected)}>
                    {allSelected ? 'Quitar todo' : 'Seleccionar todo'}
                  </Button>
                )}
              </div>
              {group.items.map((item) => (
                <div key={item.id} className="-mx-1.5 flex items-start gap-1 rounded-md hover:bg-muted">
                  <label className="flex flex-1 items-start gap-2 px-1.5 py-1 text-sm has-disabled:opacity-70">
                    <input
                      type="checkbox"
                      className="mt-0.5 size-4 shrink-0 accent-primary"
                      checked={selectedIds.has(item.id)}
                      onChange={() => toggle(item.id)}
                    />
                    <span>
                      {item.label}
                      {item.hidden && <span className="ml-1.5 text-xs text-muted-foreground">(oculto)</span>}
                    </span>
                  </label>
                  {/* The eye hides the permission from everyone without permissions.view_hidden */}
                  {canHide && item.name !== 'permissions.view_hidden' && (
                    <Button
                      type="button"
                      size="icon-xs"
                      variant="ghost"
                      className="shrink-0"
                      disabled={hiding.isPending}
                      aria-label={item.hidden ? `Mostrar ${item.label}` : `Ocultar ${item.label}`}
                      title={item.hidden ? 'Mostrar a todos' : 'Ocultar a quien no vea permisos ocultos'}
                      onClick={() => hiding.mutate({ id: item.id, hidden: !item.hidden })}
                    >
                      {item.hidden ? <EyeOffIcon aria-hidden /> : <EyeIcon aria-hidden />}
                    </Button>
                  )}
                </div>
              ))}
            </fieldset>
          )
        })}
    </div>
  )
}
