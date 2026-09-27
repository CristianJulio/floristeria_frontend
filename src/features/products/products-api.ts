import { apiFetch } from '@/lib/api-client'
import type { Pagination } from '@/features/orders/orders-api'

export type Product = {
  id: string
  name: string
  description: string | null
  price: number
  imageUrl: string | null
  available: boolean
}

export type ProductsFilters = {
  search?: string
  available?: boolean
  page?: number
  pageSize?: number
}

export type ProductInput = {
  name: string
  description: string | null
  price: number
  imageUrl: string | null
  available: boolean
}

export async function createProduct(input: ProductInput) {
  const body = await apiFetch<{ data: Product }>('/api/products', {
    method: 'POST',
    // On create, empty optional fields are simply left out
    body: {
      name: input.name,
      price: input.price,
      available: input.available,
      ...(input.description && { description: input.description }),
      ...(input.imageUrl && { imageUrl: input.imageUrl }),
    },
  })
  return body.data
}

// Only the fields sent are changed; null clears description or imageUrl
export async function updateProduct(id: string, changes: Partial<ProductInput>) {
  const body = await apiFetch<{ data: Product }>(`/api/products/${id}`, { method: 'PATCH', body: changes })
  return body.data
}

export async function fetchProduct(id: string) {
  const body = await apiFetch<{ data: Product }>(`/api/products/${id}`)
  return body.data
}

export async function fetchProducts(filters: ProductsFilters = {}) {
  return apiFetch<{ data: Product[]; pagination: Pagination }>('/api/products', {
    query: {
      search: filters.search?.trim() || undefined,
      available: filters.available,
      page: filters.page,
      pageSize: filters.pageSize,
    },
  })
}
