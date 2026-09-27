import { Navigate, Outlet, useLocation } from 'react-router'
import { useAuth } from './auth-context'
import type { LoginLocationState } from './LoginPage'

// Protects every route inside it; remembers the page so login can return there
export function RequireAuth() {
  const { state } = useAuth()
  const location = useLocation()

  if (state.status === 'loading') {
    return (
      <div className="flex min-h-svh items-center justify-center text-sm text-muted-foreground">
        Cargando…
      </div>
    )
  }

  if (state.status === 'anonymous') {
    const loginState: LoginLocationState = { from: location, sessionExpired: state.sessionExpired }
    return <Navigate to="/login" replace state={loginState} />
  }

  return <Outlet />
}
