import { createContext, useContext } from 'react'
import type { User } from './auth-api'

export type AuthState =
  | { status: 'loading' }
  | { status: 'anonymous'; sessionExpired: boolean }
  | { status: 'authenticated'; user: User; permissions: string[] }

export type AuthContextValue = {
  state: AuthState
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
  // Only hides what the user can't do; the backend still checks every permission
  can: (permission: string) => boolean
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}
