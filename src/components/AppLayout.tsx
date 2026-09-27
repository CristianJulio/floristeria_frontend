import { NavLink, Outlet } from 'react-router'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/features/auth/auth-context'

// Each section only appears for users allowed to read it
const SECTIONS = [
  { to: '/', label: 'Pedidos', permission: 'orders.read', end: true },
  { to: '/productos', label: 'Productos', permission: 'products.read', end: false },
  { to: '/usuarios', label: 'Usuarios', permission: 'users.read', end: false },
  { to: '/roles', label: 'Roles', permission: 'roles.read', end: false },
]

// The frame around every logged-in page
export function AppLayout() {
  const { state, logout, can } = useAuth()
  const user = state.status === 'authenticated' ? state.user : null
  const sections = SECTIONS.filter((section) => can(section.permission))

  return (
    <div className="min-h-svh">
      <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b bg-card px-4 py-3">
        <div className="flex min-w-0 items-center gap-4">
          <span className="font-semibold text-primary">Floristería</span>
          <nav className="flex gap-1 overflow-x-auto" aria-label="Secciones">
            {sections.map((section) => (
              <NavLink
                key={section.to}
                to={section.to}
                end={section.end}
                className={({ isActive }) =>
                  `rounded-md px-2.5 py-1 text-sm whitespace-nowrap transition-colors ${
                    isActive ? 'bg-secondary font-medium text-secondary-foreground' : 'text-muted-foreground hover:text-foreground'
                  }`
                }
              >
                {section.label}
              </NavLink>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          {user && (
            <span className="hidden text-sm text-muted-foreground sm:inline">
              {user.name} {user.lastName}
            </span>
          )}
          <Button variant="outline" size="sm" onClick={logout}>
            Cerrar sesión
          </Button>
        </div>
      </header>
      <main className="p-4">
        <Outlet />
      </main>
    </div>
  )
}
