import { apiFetch } from '@/lib/api-client'
import type { User } from '@/features/auth/auth-api'

export type { User }

export type UserStatus = 'active' | 'inactive'

export async function fetchUsers(status: UserStatus) {
  const body = await apiFetch<{ data: User[] }>('/api/users', { query: { status } })
  return body.data
}

export async function createUser(input: {
  name: string
  lastName: string
  username: string
  password: string
  roleId: string
}) {
  const body = await apiFetch<{ data: User }>('/api/users', { method: 'POST', body: input })
  return body.data
}

export async function updateUser(
  id: string,
  changes: { name?: string; lastName?: string; username?: string; roleId?: string },
) {
  const body = await apiFetch<{ data: User }>(`/api/users/${id}`, { method: 'PATCH', body: changes })
  return body.data
}

// Also ends the user's open sessions
export async function changeUserPassword(id: string, password: string) {
  await apiFetch<void>(`/api/users/${id}/password`, { method: 'PATCH', body: { password } })
}

// Soft delete: the user can't log in anymore and loses their role
export async function deleteUser(id: string) {
  await apiFetch<void>(`/api/users/${id}`, { method: 'DELETE' })
}

// Deleted users have no role, so reactivating assigns one
export async function reactivateUser(id: string, roleId: string) {
  const body = await apiFetch<{ data: User }>(`/api/users/${id}/reactivate`, { method: 'POST', body: { roleId } })
  return body.data
}
