import { ApiError } from './api-client'

// Spanish messages for the API's errors; the backend's own messages are in English
export function apiErrorMessage(error: unknown, fallback = 'Algo salió mal. Inténtalo de nuevo.') {
  if (!(error instanceof ApiError)) return 'No se pudo conectar con el servidor. Revisa tu conexión.'
  if (error.status === 403) return 'No tienes permiso para hacer esto.'
  if (error.status === 404) return 'No se encontró lo que buscabas; puede que se haya eliminado.'
  if (error.status === 409) return 'Alguien más modificó este pedido mientras lo veías. Revisa los datos actualizados.'
  return fallback
}
