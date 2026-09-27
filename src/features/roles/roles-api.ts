import { apiFetch } from '@/lib/api-client'

export type RolePermission = {
  id: string
  name: string
}

export type Role = {
  id: string
  name: string
  description: string | null
  permissions: RolePermission[]
  // The fixed role with every permission: it can't be changed or deleted
  isProtected: boolean
}

export type Permission = {
  id: string
  name: string
  description: string | null
}

export async function fetchRoles() {
  const body = await apiFetch<{ data: Role[] }>('/api/roles')
  return body.data
}

export async function fetchRole(id: string) {
  const body = await apiFetch<{ data: Role }>(`/api/roles/${id}`)
  return body.data
}

export async function fetchPermissions() {
  const body = await apiFetch<{ data: Permission[] }>('/api/permissions')
  return body.data
}

export async function createRole(input: { name: string; description: string | null; permissionIds: string[] }) {
  const body = await apiFetch<{ data: Role }>('/api/roles', {
    method: 'POST',
    body: {
      name: input.name,
      permissionIds: input.permissionIds,
      ...(input.description && { description: input.description }),
    },
  })
  return body.data
}

// Only the fields sent change; a null description clears it
export async function updateRole(id: string, changes: { name?: string; description?: string | null }) {
  const body = await apiFetch<{ data: Role }>(`/api/roles/${id}`, { method: 'PATCH', body: changes })
  return body.data
}

// Replaces the role's whole set of permissions
export async function setRolePermissions(id: string, permissionIds: string[]) {
  const body = await apiFetch<{ data: Role }>(`/api/roles/${id}/permissions`, {
    method: 'PUT',
    body: { permissionIds },
  })
  return body.data
}

export async function deleteRole(id: string) {
  await apiFetch<void>(`/api/roles/${id}`, { method: 'DELETE' })
}
