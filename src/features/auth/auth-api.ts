import { apiFetch } from '@/lib/api-client'

export type User = {
  id: string
  name: string
  lastName: string
  username: string
  roleId: string | null
  isActive: boolean
}

export type Me = {
  user: User
  permissions: string[]
}

export async function login(username: string, password: string) {
  const body = await apiFetch<{ data: { accessToken: string; user: User } }>('/api/auth/login', {
    method: 'POST',
    body: { username, password },
  })
  return body.data
}

export async function fetchMe() {
  const body = await apiFetch<{ data: Me }>('/api/auth/me')
  return body.data
}

export async function logout() {
  await apiFetch<void>('/api/auth/logout', { method: 'POST' })
}
