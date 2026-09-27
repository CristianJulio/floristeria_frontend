import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createBrowserRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import './index.css'
import { AppLayout } from '@/components/AppLayout'
import { AuthProvider } from '@/features/auth/AuthProvider'
import { LoginPage } from '@/features/auth/LoginPage'
import { RequireAuth } from '@/features/auth/RequireAuth'
import { EditOrderPage } from '@/features/orders/EditOrderPage'
import { NewOrderPage } from '@/features/orders/NewOrderPage'
import { OrderDetailPage } from '@/features/orders/OrderDetailPage'
import { OrdersListPage } from '@/features/orders/OrdersListPage'
import { ProductsPage } from '@/features/products/ProductsPage'

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
          { path: 'productos', element: <ProductsPage /> },
        ],
      },
    ],
  },
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
)
