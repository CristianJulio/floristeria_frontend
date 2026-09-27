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
    // Each group is a small panel; two columns on computers so the page stays short
    <div className="grid gap-3 md:grid-cols-2 md:items-start">
      {groups
        .filter((group) => group.items.length > 0)
        .map((group) => {
          const ids = group.items.map((item) => item.id)
          const selectedCount = ids.filter((id) => selectedIds.has(id)).length
          const allSelected = selectedCount === ids.length
          return (
            <fieldset key={group.title} className="flex flex-col gap-1 rounded-lg border p-3" disabled={disabled}>
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
                <label
                  key={item.id}
                  className="-mx-1.5 flex items-start gap-2 rounded-md px-1.5 py-1 text-sm hover:bg-muted has-disabled:opacity-70 has-disabled:hover:bg-transparent"
                >
                  <input
                    type="checkbox"
                    className="mt-0.5 size-4 shrink-0 accent-primary"
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
