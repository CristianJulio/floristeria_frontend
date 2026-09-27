import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { onSessionExpired, refreshAccessToken, setAccessToken } from '@/lib/api-client'
import { fetchMe, login as loginRequest, logout as logoutRequest } from './auth-api'
import { AuthContext, type AuthState } from './auth-context'

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [state, setState] = useState<AuthState>({ status: 'loading' })

  // On page load, the refresh cookie (if any) restores the session without asking for the password again
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const token = await refreshAccessToken()
      if (cancelled) return
      if (!token) {
        setState({ status: 'anonymous', sessionExpired: false })
        return
      }
      try {
        const me = await fetchMe()
        if (!cancelled) setState({ status: 'authenticated', ...me })
      } catch {
        if (!cancelled) setState({ status: 'anonymous', sessionExpired: false })
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  // When a request fails because the session can't be renewed, go back to the login page
  useEffect(() => {
    onSessionExpired(() => {
      queryClient.clear()
      setState({ status: 'anonymous', sessionExpired: true })
    })
    return () => onSessionExpired(null)
  }, [queryClient])

  const login = useCallback(async (username: string, password: string) => {
    const { accessToken } = await loginRequest(username, password)
    setAccessToken(accessToken)
    const me = await fetchMe()
    setState({ status: 'authenticated', ...me })
  }, [])

  const logout = useCallback(async () => {
    try {
      await logoutRequest()
    } finally {
      setAccessToken(null)
      queryClient.clear()
      setState({ status: 'anonymous', sessionExpired: false })
    }
  }, [queryClient])

  const can = useCallback(
    (permission: string) => state.status === 'authenticated' && state.permissions.includes(permission),
    [state],
  )

  return <AuthContext.Provider value={{ state, login, logout, can }}>{children}</AuthContext.Provider>
}
