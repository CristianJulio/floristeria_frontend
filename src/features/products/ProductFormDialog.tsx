import { useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { ApiError } from '@/lib/api-client'
import { apiErrorMessage } from '@/lib/api-errors'
import { formatMoney } from '@/lib/money'
import {
  CATEGORY_LABELS,
  PRODUCT_CATEGORIES,
  createProduct,
  updateProduct,
  type Product,
  type ProductInput,
} from './products-api'

// Same limits as the backend's product schema; the price is typed as text and converted
const productFormSchema = z.object({
  name: z.string().trim().min(1, 'Escribe el nombre').max(50, 'Máximo 50 caracteres'),
  description: z.string().trim().max(500, 'Máximo 500 caracteres'),
  category: z.enum(PRODUCT_CATEGORIES, { error: 'Elige la categoría' }),
  price: z
    .string()
    .trim()
    .regex(/^\d+$/, 'Escribe solo números, sin puntos ni signos')
    .refine((value) => Number(value) <= 2_147_483_647, 'El precio es demasiado alto'),
  imageUrl: z
    .string()
    .trim()
    .max(2048, 'El enlace es demasiado largo')
    .refine((value) => value === '' || URL.canParse(value), 'Escribe un enlace completo, empezando por https://'),
  available: z.boolean(),
})

type ProductFormValues = z.infer<typeof productFormSchema>

function toProductInput(values: ProductFormValues): ProductInput {
  return {
    name: values.name.trim(),
    description: values.description.trim() || null,
    category: values.category,
    price: Number(values.price),
    imageUrl: values.imageUrl.trim() || null,
    available: values.available,
  }
}

type Props = {
  // Without a product the dialog creates one
  product?: Product
  onClose: () => void
  // Called with the new product, after the dialog's own onClose; only when creating
  onCreated?: (product: Product) => void
}

// Rendered only while open, so every opening starts from the product's current values
export function ProductFormDialog({ product, onClose, onCreated }: Props) {
  const queryClient = useQueryClient()
  const [submitError, setSubmitError] = useState<string | null>(null)
  const isEdit = product !== undefined

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: product?.name ?? '',
      description: product?.description ?? '',
      // New products start without one, so staff always choose it
      ...(product && { category: product.category }),
      price: product ? String(product.price) : '',
      imageUrl: product?.imageUrl ?? '',
      available: product?.available ?? true,
    },
  })

  const price = useWatch({ control, name: 'price' })
  const category = useWatch({ control, name: 'category' })
  const pricePreview = /^\d+$/.test((price ?? '').trim()) ? formatMoney(Number(price)) : null

  const mutation = useMutation({
    mutationFn: (values: ProductFormValues) =>
      isEdit ? updateProduct(product.id, toProductInput(values)) : createProduct(toProductInput(values)),
    onSuccess: (saved) => {
      // Product lists and the order form's product search both read these
      queryClient.invalidateQueries({ queryKey: ['products'] })
      onClose()
      if (!isEdit) onCreated?.(saved)
    },
    onError: (error) => {
      setSubmitError(
        error instanceof ApiError && error.status === 409
          ? 'Ya existe un producto con ese nombre.'
          : apiErrorMessage(error),
      )
    },
  })

  return (
    <Dialog open onOpenChange={(open) => !open && !mutation.isPending && onClose()}>
      <DialogContent>
        <form
          onSubmit={handleSubmit((values) => {
            setSubmitError(null)
            mutation.mutate(values)
          })}
          noValidate
          className="flex flex-col gap-4"
        >
          <DialogHeader>
            <DialogTitle>{isEdit ? 'Editar producto' : 'Nuevo producto'}</DialogTitle>
            <DialogDescription>
              {isEdit ? 'Los cambios de precio aplican a los pedidos nuevos.' : 'Aparecerá al crear pedidos.'}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-2">
            <Label htmlFor="product-name">Nombre</Label>
            <Input id="product-name" autoFocus aria-invalid={!!errors.name} {...register('name')} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium">Categoría</span>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Categoría">
              {PRODUCT_CATEGORIES.map((option) => (
                <Button
                  key={option}
                  type="button"
                  size="sm"
                  role="radio"
                  aria-checked={category === option}
                  variant={category === option ? 'default' : 'outline'}
                  onClick={() => setValue('category', option, { shouldValidate: true })}
                >
                  {CATEGORY_LABELS[option]}
                </Button>
              ))}
            </div>
            {errors.category && <p className="text-sm text-destructive">{errors.category.message}</p>}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="product-price">Precio (en pesos)</Label>
            <Input
              id="product-price"
              inputMode="numeric"
              autoComplete="off"
              aria-invalid={!!errors.price}
              {...register('price')}
            />
            {errors.price ? (
              <p className="text-sm text-destructive">{errors.price.message}</p>
            ) : (
              pricePreview && <p className="text-xs text-muted-foreground">{pricePreview}</p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="product-description">Descripción (opcional)</Label>
            <Textarea id="product-description" maxLength={500} {...register('description')} />
            {errors.description && <p className="text-sm text-destructive">{errors.description.message}</p>}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="product-image">Enlace de la imagen (opcional)</Label>
            <Input
              id="product-image"
              type="url"
              placeholder="https://…"
              aria-invalid={!!errors.imageUrl}
              {...register('imageUrl')}
            />
            {errors.imageUrl && <p className="text-sm text-destructive">{errors.imageUrl.message}</p>}
          </div>

          <Controller
            control={control}
            name="available"
            render={({ field }) => (
              <div className="flex items-center gap-2">
                <Switch id="product-available" checked={field.value} onCheckedChange={field.onChange} />
                <Label htmlFor="product-available">Disponible para vender</Label>
              </div>
            )}
          />

          {submitError && (
            <p role="alert" className="text-sm text-destructive">
              {submitError}
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={mutation.isPending}>
              Volver
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Crear producto'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
