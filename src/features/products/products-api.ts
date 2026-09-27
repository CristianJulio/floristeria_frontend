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
