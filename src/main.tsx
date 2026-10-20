import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createBrowserRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { Toaster } from 'sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import './index.css'
import { AppLayout } from '@/components/AppLayout'
import { AuthProvider } from '@/features/auth/AuthProvider'
import { LoginPage } from '@/features/auth/LoginPage'
import { RequireAuth } from '@/features/auth/RequireAuth'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { PendingPaymentsPage } from '@/features/dashboard/PendingPaymentsPage'
import { EditOrderPage } from '@/features/orders/EditOrderPage'
import { NewOrderPage } from '@/features/orders/NewOrderPage'
import { OrderDetailPage } from '@/features/orders/OrderDetailPage'
import { OrdersListPage } from '@/features/orders/OrdersListPage'
import { ProductsPage } from '@/features/products/ProductsPage'
import { RolePage } from '@/features/roles/RolePage'
import { RolesPage } from '@/features/roles/RolesPage'
import { UsersPage } from '@/features/users/UsersPage'

const queryClient = new QueryClient()

const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { index: true, element: <OrdersListPage /> },
          { path: 'pedidos/nuevo', element: <NewOrderPage /> },
          { path: 'pedidos/:id', element: <OrderDetailPage /> },
          { path: 'pedidos/:id/editar', element: <EditOrderPage /> },
          { path: 'resumen', element: <DashboardPage /> },
          { path: 'pagos', element: <PendingPaymentsPage /> },
          { path: 'productos', element: <ProductsPage /> },
          { path: 'usuarios', element: <UsersPage /> },
          { path: 'roles', element: <RolesPage /> },
          { path: 'roles/nuevo', element: <RolePage /> },
          { path: 'roles/:id', element: <RolePage /> },
        ],
      },
    ],
  },
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <RouterProvider router={router} />
        </TooltipProvider>
        <Toaster position="top-center" richColors />
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
)
