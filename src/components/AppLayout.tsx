import { useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router'
import { cn } from 'cn'
import { ChevronDownIcon, ClockIcon, LogOutIcon, MenuIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { UpcomingOrdersSidebar } from '@/features/orders/UpcomingOrdersSidebar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { UserBadge } from '@/components/UserBadge'
import { useAuth } from '@/features/auth/auth-context'

// Each section only appears for users allowed to read it
const SECTIONS = [
  // The orders list lives at '/', but its pages (new, detail, edit) are under /pedidos
  { to: '/', label: 'Pedidos', permission: 'orders.read', end: true, alsoActiveUnder: '/pedidos' },
  { to: '/resumen', label: 'Resumen', permission: 'dashboard.read', end: false },
  { to: '/pagos', label: 'Pagos', permission: 'payments.read', end: false },
  { to: '/buscar', label: 'Buscar pedido', permission: 'orders.search_by_id', end: false },
  { to: '/productos', label: 'Productos', permission: 'products.read', end: false },
  { to: '/usuarios', label: 'Usuarios', permission: 'users.read', end: false },
  { to: '/roles', label: 'Roles', permission: 'roles.read', end: false },
]

const SHOP_NAME_CLASS = 'font-caps tracking-[0.16em] whitespace-nowrap text-primary uppercase'

// The frame around every logged-in page
export function AppLayout() {
  const { state, logout, can } = useAuth()
  const user = state.status === 'authenticated' ? state.user : null
  const role = state.status === 'authenticated' ? state.role : null
  const sections = SECTIONS.filter((section) => can(section.permission))
  const { pathname } = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [deliveriesOpen, setDeliveriesOpen] = useState(false)

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
            isActive
              ? 'bg-secondary font-medium text-secondary-foreground'
              : 'text-muted-foreground hover:text-foreground',
          )
        }}
      >
        {section.label}
      </NavLink>
    ))

  return (
    <div className="min-h-svh xl:flex">
      <div className="min-w-0 flex-1">
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
                    {user && <UserBadge user={user} role={role} />}
                    <Button variant="outline" onClick={logout}>
                      <LogOutIcon aria-hidden />
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

            <div className="flex items-center gap-1 justify-self-end">
              {/* Below wide screens the upcoming deliveries open in a panel from the right */}
              {can('orders.read') && (
                <Sheet open={deliveriesOpen} onOpenChange={setDeliveriesOpen}>
                  <SheetTrigger
                    render={
                      <Button variant="ghost" size="icon" className="xl:hidden" aria-label="Ver próximas entregas" />
                    }
                  >
                    <ClockIcon />
                  </SheetTrigger>
                  <SheetContent side="right" className="w-80 overflow-y-auto sm:max-w-80">
                    <SheetHeader className="sr-only">
                      <SheetTitle>Próximas entregas</SheetTitle>
                    </SheetHeader>
                    <UpcomingOrdersSidebar onSelect={() => setDeliveriesOpen(false)} />
                  </SheetContent>
                </Sheet>
              )}
              {/* Who is logged in; clicking opens a small menu with "Cerrar sesión" */}
              {user && (
                <div className="hidden lg:block">
                  <DropdownMenu>
                    <DropdownMenuTrigger className="flex items-center gap-2 rounded-lg py-1 pr-2 pl-1 transition-colors outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 data-popup-open:bg-muted">
                      <UserBadge user={user} role={role} />
                      <ChevronDownIcon className="size-4 text-muted-foreground" aria-hidden />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="min-w-48">
                      <DropdownMenuGroup>
                        <DropdownMenuLabel>Usuario: {user.username}</DropdownMenuLabel>
                      </DropdownMenuGroup>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={logout}>
                        <LogOutIcon aria-hidden />
                        Cerrar sesión
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
          <Outlet />
        </main>
      </div>
      {/* On wide screens, the upcoming deliveries stay in view on the right while scrolling */}
      {can('orders.read') && (
        <aside
          aria-label="Próximas entregas"
          className="sticky top-0 hidden h-svh w-80 shrink-0 overflow-y-auto border-l bg-card xl:block"
        >
          <UpcomingOrdersSidebar />
        </aside>
      )}
    </div>
  )
}
