import { Navigate, Outlet, useLocation } from 'react-router'
import { LoadingState } from '@/components/LoadingState'
import { useAuth } from './auth-context'
import type { LoginLocationState } from './LoginPage'

// Protects every route inside it; remembers the page so login can return there
export function RequireAuth() {
  const { state } = useAuth()
  const location = useLocation()

  if (state.status === 'loading') {
    return (
      // Shown while the session is being checked on first load
      <div className="flex min-h-svh flex-col items-center justify-center gap-3">
        <span className="font-caps tracking-[0.16em] text-primary uppercase">Floristería Barranquilla</span>
        <LoadingState label="Cargando…" inline />
      </div>
    )
  }

  if (state.status === 'anonymous') {
    const loginState: LoginLocationState = { from: location, sessionExpired: state.sessionExpired }
    return <Navigate to="/login" replace state={loginState} />
  }

  return <Outlet />
}
