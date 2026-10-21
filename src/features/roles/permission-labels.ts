// Spanish names for the permissions the backend checks, grouped by the section they control.
// A permission missing here still appears, under "Otros" with its technical name
export const PERMISSION_GROUPS: { title: string; permissions: { name: string; label: string }[] }[] = [
  {
    title: 'Pedidos',
    permissions: [
      { name: 'orders.read', label: 'Ver pedidos' },
      { name: 'orders.create', label: 'Crear pedidos' },
      { name: 'orders.update', label: 'Editar datos del pedido' },
      { name: 'orders.update_items', label: 'Cambiar productos del pedido' },
      { name: 'orders.update_status', label: 'Cambiar estado (preparar, enviar, entregar, cancelar)' },
      { name: 'orders.start_unpaid', label: 'Empezar a preparar sin el 50% pagado' },
      { name: 'orders.deliver_unpaid', label: 'Marcar como entregado sin el pago completo' },
      { name: 'orders.record_payment', label: 'Registrar pagos' },
      { name: 'orders.record_refund', label: 'Registrar reembolsos y montos retenidos' },
      { name: 'orders.void_payment', label: 'Anular pagos' },
      { name: 'orders.delete', label: 'Eliminar pedidos' },
      { name: 'orders.search_by_id', label: 'Buscar un pedido por su id' },
    ],
  },
  {
    title: 'Resumen',
    permissions: [{ name: 'dashboard.read', label: 'Ver el resumen (ventas, cobros y sus detalles)' }],
  },
  {
    title: 'Pagos',
    permissions: [{ name: 'payments.read', label: 'Ver pagos pendientes por cobrar o reembolsar' }],
  },
  {
    title: 'Productos',
    permissions: [
      { name: 'products.read', label: 'Ver productos' },
      { name: 'products.create', label: 'Crear productos' },
      { name: 'products.update', label: 'Editar productos (precio y disponibilidad)' },
    ],
  },
  {
    title: 'Usuarios',
    permissions: [
      { name: 'users.read', label: 'Ver usuarios' },
      { name: 'users.create', label: 'Crear usuarios' },
      { name: 'users.update', label: 'Editar usuarios y su rol' },
      { name: 'users.change_password', label: 'Cambiar contraseñas' },
      { name: 'users.reactivate', label: 'Reactivar usuarios eliminados' },
      { name: 'users.delete', label: 'Eliminar usuarios' },
    ],
  },
  {
    title: 'Roles',
    permissions: [
      { name: 'roles.read', label: 'Ver roles' },
      { name: 'roles.create', label: 'Crear roles' },
      { name: 'roles.update', label: 'Editar nombre y descripción de roles' },
      { name: 'roles.update_permissions', label: 'Asignar permisos a roles' },
      { name: 'roles.delete', label: 'Eliminar roles' },
    ],
  },
  {
    title: 'Permisos',
    permissions: [
      { name: 'permissions.read', label: 'Ver permisos' },
      { name: 'permissions.create', label: 'Crear permisos' },
    ],
  },
]
