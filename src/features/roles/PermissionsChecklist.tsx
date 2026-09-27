import { Button } from '@/components/ui/button'
import { PERMISSION_GROUPS } from './permission-labels'
import type { Permission } from './roles-api'

type Props = {
  permissions: Permission[]
  selectedIds: Set<string>
  onChange: (selectedIds: Set<string>) => void
  disabled?: boolean
}

// The role's permissions as grouped checkboxes with Spanish names
export function PermissionsChecklist({ permissions, selectedIds, onChange, disabled = false }: Props) {
  const byName = new Map(permissions.map((permission) => [permission.name, permission]))
  const labelled = new Set(PERMISSION_GROUPS.flatMap((group) => group.permissions.map((p) => p.name)))

  const groups = PERMISSION_GROUPS.map((group) => ({
    title: group.title,
    items: group.permissions.flatMap((p) => {
      const permission = byName.get(p.name)
      return permission ? [{ id: permission.id, label: p.label }] : []
    }),
  }))
  // Permissions without a Spanish name (e.g. created through the API) keep their technical name
  const others = permissions.filter((permission) => !labelled.has(permission.name))
  if (others.length > 0) {
    groups.push({ title: 'Otros', items: others.map((permission) => ({ id: permission.id, label: permission.name })) })
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
    <div className="flex flex-col gap-5">
      {groups
        .filter((group) => group.items.length > 0)
        .map((group) => {
          const ids = group.items.map((item) => item.id)
          const allSelected = ids.every((id) => selectedIds.has(id))
          return (
            <fieldset key={group.title} className="flex flex-col gap-2" disabled={disabled}>
              <div className="flex items-center justify-between gap-2">
                <legend className="font-medium">{group.title}</legend>
                {!disabled && (
                  <Button type="button" size="xs" variant="ghost" onClick={() => setGroup(ids, !allSelected)}>
                    {allSelected ? 'Quitar todo' : 'Seleccionar todo'}
                  </Button>
                )}
              </div>
              {group.items.map((item) => (
                <label key={item.id} className="flex items-start gap-2 text-sm has-disabled:opacity-70">
                  <input
                    type="checkbox"
                    className="mt-0.5 size-4 accent-primary"
                    checked={selectedIds.has(item.id)}
                    onChange={() => toggle(item.id)}
                  />
                  {item.label}
                </label>
              ))}
            </fieldset>
          )
        })}
    </div>
  )
}
