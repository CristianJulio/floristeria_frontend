import { z } from 'zod'
import { todayInColombia } from '@/lib/dates'
import { OTHER_COUNTRY, isValidInternationalPhone, onlyDigits, toInternationalPhone } from '@/lib/phone'
import type { CreateOrderInput } from './orders-api'

export const CITIES = ['Barranquilla', 'Soledad'] as const

const required = (max: number) => z.string().trim().min(1, 'Este campo es obligatorio').max(max, `Máximo ${max} caracteres`)
const optional = (max: number) => z.string().trim().max(max, `Máximo ${max} caracteres`)
const time = z.string().regex(/^(([01]\d|2[0-3]):[0-5]\d)?$/, 'Hora no válida')

// Same limits as the backend's create-order schema; every input holds text, empty means "not given"
export const orderFormSchema = z
  .object({
    recipientName: required(50),
    addressLine1: required(40),
    addressLine2: optional(40),
    neighborhood: optional(30),
    city: z.enum(CITIES, { error: 'Elige la ciudad' }),
    deliveryNotes: optional(255),
    cardMessage: optional(255),
    senderName: required(50),
    phoneCountry: z.string(),
    phoneOtherCode: z.string(),
    phoneNumber: z.string(),
    deliveryDate: z
      .string()
      .min(1, 'Elige la fecha de entrega')
      .refine((date) => date >= todayInColombia(), 'La fecha de entrega no puede estar en el pasado'),
    deliveryTimeFrom: time,
    deliveryTimeTo: time,
    items: z
      .array(
        z.object({
          productId: z.string(),
          productName: z.string(),
          price: z.number(),
          quantity: z.number().int().min(1, 'Mínimo 1').max(999, 'Máximo 999'),
        }),
      )
      .min(1, 'Agrega al menos un producto'),
  })
  .superRefine((values, ctx) => {
    const code = values.phoneCountry === OTHER_COUNTRY ? values.phoneOtherCode : values.phoneCountry
    if (values.phoneCountry === OTHER_COUNTRY && !onlyDigits(values.phoneOtherCode)) {
      ctx.addIssue({ code: 'custom', path: ['phoneOtherCode'], message: 'Escribe el código del país' })
    } else if (!onlyDigits(values.phoneNumber)) {
      ctx.addIssue({ code: 'custom', path: ['phoneNumber'], message: 'Escribe el teléfono' })
    } else if (!isValidInternationalPhone(toInternationalPhone(code, values.phoneNumber))) {
      ctx.addIssue({ code: 'custom', path: ['phoneNumber'], message: 'El teléfono no parece válido' })
    }

    if (values.deliveryTimeFrom && values.deliveryTimeTo && values.deliveryTimeFrom > values.deliveryTimeTo) {
      ctx.addIssue({
        code: 'custom',
        path: ['deliveryTimeTo'],
        message: 'La hora final no puede ser antes de la inicial',
      })
    }
  })

export type OrderFormValues = z.infer<typeof orderFormSchema>

export function emptyOrderForm(): OrderFormValues {
  return {
    recipientName: '',
    addressLine1: '',
    addressLine2: '',
    neighborhood: '',
    city: 'Barranquilla',
    deliveryNotes: '',
    cardMessage: '',
    senderName: '',
    phoneCountry: '57',
    phoneOtherCode: '',
    phoneNumber: '',
    deliveryDate: todayInColombia(),
    deliveryTimeFrom: '',
    deliveryTimeTo: '',
    items: [],
  }
}

// Empty optional fields are left out, as the API expects
export function toCreateOrderInput(values: OrderFormValues): CreateOrderInput {
  const code = values.phoneCountry === OTHER_COUNTRY ? values.phoneOtherCode : values.phoneCountry
  const optionalText = (value: string) => value.trim() || undefined

  return {
    senderName: values.senderName.trim(),
    recipientName: values.recipientName.trim(),
    addressLine1: values.addressLine1.trim(),
    addressLine2: optionalText(values.addressLine2),
    neighborhood: optionalText(values.neighborhood),
    city: values.city,
    deliveryNotes: optionalText(values.deliveryNotes),
    // Not trimmed inside, so the card keeps its line breaks
    cardMessage: values.cardMessage.trim() ? values.cardMessage : undefined,
    responsiblePhone: toInternationalPhone(code, values.phoneNumber),
    deliveryDate: values.deliveryDate,
    deliveryTimeFrom: values.deliveryTimeFrom || undefined,
    deliveryTimeTo: values.deliveryTimeTo || undefined,
    items: values.items.map((item) => ({ productId: item.productId, quantity: item.quantity })),
  }
}
