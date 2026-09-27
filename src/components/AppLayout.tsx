import { useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router'
import { cn } from 'cn'
import { MenuIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { useAuth } from '@/features/auth/auth-context'

// Each section only appears for users allowed to read it
const SECTIONS = [
  // The orders list lives at '/', but its pages (new, detail, edit) are under /pedidos
  { to: '/', label: 'Pedidos', permission: 'orders.read', end: true, alsoActiveUnder: '/pedidos' },
  { to: '/productos', label: 'Productos', permission: 'products.read', end: false },
  { to: '/usuarios', label: 'Usuarios', permission: 'users.read', end: false },
  { to: '/roles', label: 'Roles', permission: 'roles.read', end: false },
]

const SHOP_NAME_CLASS = 'font-caps tracking-[0.16em] whitespace-nowrap text-primary uppercase'

// The frame around every logged-in page
export function AppLayout() {
  const { state, logout, can } = useAuth()
  const user = state.status === 'authenticated' ? state.user : null
  const sections = SECTIONS.filter((section) => can(section.permission))
  const { pathname } = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  // The same links in the header (computers) and in the side menu (tablets and phones)
  const links = (inMenu: boolean) =>
    sections.map((section) => (
      <NavLink
        key={section.to}
        to={section.to}
        end={section.end}
        onClick={() => setMenuOpen(false)}
        className={({ isActive: matched }) => {
          const isActive =
            matched || ('alsoActiveUnder' in section && pathname.startsWith(`${section.alsoActiveUnder}/`))
          return cn(
            'rounded-md whitespace-nowrap transition-colors',
            inMenu ? 'px-3 py-2 text-base' : 'px-2.5 py-1 text-sm',
            isActive ? 'bg-secondary font-medium text-secondary-foreground' : 'text-muted-foreground hover:text-foreground',
          )
        }}
      >
        {section.label}
      </NavLink>
    ))

  return (
    <div className="min-h-svh">
      <header className="border-b bg-card">
        {/* Same width as the page content, so the header lines up with it. On computers: name on the left,
            menu centred, user on the right (equal side columns, so the menu sits in the true centre).
            Below that: a menu button and the name; the sections open in a side panel */}
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:grid lg:grid-cols-[1fr_auto_1fr]">
          <div className="flex min-w-0 items-center gap-1">
            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
              <SheetTrigger
                render={<Button variant="ghost" size="icon" className="-ml-2 lg:hidden" aria-label="Abrir menú" />}
              >
                <MenuIcon />
              </SheetTrigger>
              <SheetContent side="left" className="w-72">
                {/* Right padding keeps the name clear of the close (X) button; the name may wrap to two lines */}
                <SheetHeader className="pr-12">
                  <SheetTitle className={cn(SHOP_NAME_CLASS, 'text-sm leading-snug whitespace-normal')}>
                    Floristería Barranquilla
                  </SheetTitle>
                </SheetHeader>
                <nav className="flex flex-col gap-1 px-2" aria-label="Secciones">
                  {links(true)}
                </nav>
                <div className="mt-auto flex flex-col gap-3 border-t p-4">
                  {user && (
                    <span className="text-sm text-muted-foreground">
                      {user.name} {user.lastName}
                    </span>
                  )}
                  <Button variant="outline" onClick={logout}>
                    Cerrar sesión
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
            <span className={cn(SHOP_NAME_CLASS, 'truncate text-sm sm:text-base')}>Floristería Barranquilla</span>
          </div>

          <nav className="hidden gap-1 lg:flex" aria-label="Secciones">
            {links(false)}
          </nav>

          <div className="hidden items-center gap-3 justify-self-end lg:flex">
            {user && (
              <span className="text-sm text-muted-foreground">
                {user.name} {user.lastName}
              </span>
            )}
            <Button variant="outline" size="sm" onClick={logout}>
              Cerrar sesión
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
        <Outlet />
      </main>
    </div>
  )
}
