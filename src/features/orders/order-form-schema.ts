import { z } from 'zod'
import { todayInColombia } from '@/lib/dates'
import {
  OTHER_COUNTRY,
  CONTACT_TYPES,
  isValidWhatsappUsername,
  PHONE_COUNTRIES,
  isValidInternationalPhone,
  onlyDigits,
  toInternationalPhone,
} from '@/lib/phone'
import { PRODUCT_CATEGORIES } from '@/features/products/products-api'
import type { CreateOrderInput, Order, OrderItemInput, UpdateOrderInput } from './orders-api'

export const CITIES = ['Barranquilla', 'Soledad'] as const

const required = (max: number) => z.string().trim().min(1, 'Este campo es obligatorio').max(max, `Máximo ${max} caracteres`)
const optional = (max: number) => z.string().trim().max(max, `Máximo ${max} caracteres`)
const time = z.string().regex(/^(([01]\d|2[0-3]):[0-5]\d)?$/, 'Hora no válida')

// The order's own fields, shared by the new-order and edit forms.
// Same limits as the backend; every input holds text, empty means "not given"
const orderDetailsFields = z.object({
  recipientName: required(50),
  addressLine1: required(40),
  addressLine2: optional(100),
  neighborhood: optional(30),
  city: z.enum(CITIES, { error: 'Elige la ciudad' }),
  deliveryNotes: optional(255),
  cardMessage: optional(1000),
  senderName: required(50),
  contactType: z.enum(CONTACT_TYPES),
  whatsappUsername: z.string(),
  phoneCountry: z.string(),
  phoneOtherCode: z.string(),
  phoneNumber: z.string(),
  deliveryDate: z.string().min(1, 'Elige la fecha de entrega'),
  deliveryTimeFrom: time,
  deliveryTimeTo: time,
  // Typed as text like product prices; empty counts as no fee
  deliveryFee: z
    .string()
    .trim()
    .regex(/^\d*$/, 'Escribe solo números, sin puntos ni signos')
    .refine((value) => Number(value) <= 2_147_483_647, 'El valor es demasiado alto'),
})

type DetailsValues = z.infer<typeof orderDetailsFields>

// Rules that involve more than one field. A date already in the past is only accepted if it
// isn't being changed (e.g. editing the address of an overdue order that's still being prepared)
function checkDetails(values: DetailsValues, ctx: z.RefinementCtx, unchangedDate?: string) {
  if (values.deliveryDate < todayInColombia() && values.deliveryDate !== unchangedDate) {
    ctx.addIssue({ code: 'custom', path: ['deliveryDate'], message: 'La fecha de entrega no puede estar en el pasado' })
  }

  if (values.contactType === 'WHATSAPP_USERNAME') {
    const username = values.whatsappUsername.trim()
    if (!username) {
      ctx.addIssue({ code: 'custom', path: ['whatsappUsername'], message: 'Escribe el usuario de WhatsApp' })
    } else if (!isValidWhatsappUsername(username)) {
      ctx.addIssue({ code: 'custom', path: ['whatsappUsername'], message: 'Escribe el usuario sin "@", de 3 a 35 letras, números, puntos o guiones bajos' })
    }
  } else {
    const code = values.phoneCountry === OTHER_COUNTRY ? values.phoneOtherCode : values.phoneCountry
    if (values.phoneCountry === OTHER_COUNTRY && !onlyDigits(values.phoneOtherCode)) {
      ctx.addIssue({ code: 'custom', path: ['phoneOtherCode'], message: 'Escribe el código del país' })
    } else if (!onlyDigits(values.phoneNumber)) {
      ctx.addIssue({ code: 'custom', path: ['phoneNumber'], message: 'Escribe el teléfono' })
    } else if (!isValidInternationalPhone(toInternationalPhone(code, values.phoneNumber))) {
      ctx.addIssue({ code: 'custom', path: ['phoneNumber'], message: 'El teléfono no parece válido' })
    }
  }

  if (values.deliveryTimeFrom && values.deliveryTimeTo && values.deliveryTimeFrom > values.deliveryTimeTo) {
    ctx.addIssue({ code: 'custom', path: ['deliveryTimeTo'], message: 'La hora final no puede ser antes de la inicial' })
  }
}

// A crown needs who it is for and the room
function checkCrowns(items: OrderFormValues['items'], ctx: z.RefinementCtx) {
  items.forEach((item, index) => {
    if (item.category !== 'CORONAS') return
    if (!item.deceasedName.trim()) {
      ctx.addIssue({ code: 'custom', path: ['items', index, 'deceasedName'], message: 'Escribe el nombre del fallecido' })
    }
    if (!item.roomNumber.trim()) {
      ctx.addIssue({ code: 'custom', path: ['items', index, 'roomNumber'], message: 'Escribe la sala' })
    }
  })
}

// What the API takes for a line: crown details only go with crowns
export function toItemInput(item: OrderFormValues['items'][number]): OrderItemInput {
  if (item.category !== 'CORONAS') return { productId: item.productId, quantity: item.quantity }
  return {
    productId: item.productId,
    quantity: 1,
    deceasedName: item.deceasedName.trim(),
    roomNumber: item.roomNumber.trim(),
    withRibbon: item.withRibbon,
    withCard: item.withCard,
  }
}

export const orderFormSchema = orderDetailsFields
  .extend({
    items: z
      .array(
        z.object({
          // Tells lines apart on screen; crowns can repeat a product
          key: z.string(),
          productId: z.string(),
          productName: z.string(),
          category: z.enum(PRODUCT_CATEGORIES),
          price: z.number(),
          quantity: z.number().int().min(1, 'Mínimo 1').max(999, 'Máximo 999'),
          // Only for crowns; empty for any other product
          deceasedName: z.string().trim().max(100, 'Máximo 100 caracteres'),
          roomNumber: z.string().trim().max(20, 'Máximo 20 caracteres'),
          withRibbon: z.boolean(),
          withCard: z.boolean(),
        }),
      )
      .min(1, 'Agrega al menos un producto'),
  })
  .superRefine((values, ctx) => {
    checkDetails(values, ctx)
    checkCrowns(values.items, ctx)
  })

export type OrderFormValues = z.infer<typeof orderFormSchema>

export function orderDetailsFormSchema(order: Order) {
  return orderDetailsFields.superRefine((values, ctx) => checkDetails(values, ctx, order.deliveryDate))
}

export type OrderDetailsFormValues = DetailsValues

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
    contactType: 'PHONE',
    whatsappUsername: '',
    phoneCountry: '57',
    phoneOtherCode: '',
    phoneNumber: '',
    deliveryDate: todayInColombia(),
    deliveryTimeFrom: '',
    deliveryTimeTo: '',
    deliveryFee: '0',
    items: [],
  }
}

// The fee as typed so far, for totals shown while editing; an invalid value counts as no fee until it's fixed
export function typedDeliveryFee(text: string | undefined) {
  const value = (text ?? '').trim()
  return /^\d+$/.test(value) ? Number(value) : 0
}

// "+573001234567" -> Colombia + "3001234567". Country codes never start with another code,
// so matching the listed ones by prefix is safe. Other countries go under "Otro", guessing
// that the last 10 digits are the number; staff can correct the split
function splitPhone(phone: string) {
  const digits = onlyDigits(phone)
  const country = PHONE_COUNTRIES.find((c) => digits.startsWith(c.code))
  if (country) return { phoneCountry: country.code, phoneOtherCode: '', phoneNumber: digits.slice(country.code.length) }
  const numberLength = Math.min(10, digits.length - 1)
  return {
    phoneCountry: OTHER_COUNTRY,
    phoneOtherCode: digits.slice(0, digits.length - numberLength),
    phoneNumber: digits.slice(-numberLength),
  }
}

export function orderToDetailsForm(order: Order): OrderDetailsFormValues {
  return {
    recipientName: order.recipientName,
    addressLine1: order.addressLine1,
    addressLine2: order.addressLine2 ?? '',
    neighborhood: order.neighborhood ?? '',
    city: (CITIES as readonly string[]).includes(order.city) ? (order.city as (typeof CITIES)[number]) : 'Barranquilla',
    deliveryNotes: order.deliveryNotes ?? '',
    cardMessage: order.cardMessage ?? '',
    senderName: order.senderName,
    contactType: order.responsibleContactType,
    whatsappUsername: order.responsibleContactType === 'WHATSAPP_USERNAME' ? order.responsiblePhone : '',
    ...(order.responsibleContactType === 'PHONE'
      ? splitPhone(order.responsiblePhone)
      : { phoneCountry: '57', phoneOtherCode: '', phoneNumber: '' }),
    deliveryDate: order.deliveryDate,
    deliveryTimeFrom: order.deliveryTimeFrom ?? '',
    deliveryTimeTo: order.deliveryTimeTo ?? '',
    deliveryFee: String(order.deliveryFee),
  }
}

function phoneOf(values: DetailsValues) {
  if (values.contactType === 'WHATSAPP_USERNAME') return values.whatsappUsername.trim()
  const code = values.phoneCountry === OTHER_COUNTRY ? values.phoneOtherCode : values.phoneCountry
  return toInternationalPhone(code, values.phoneNumber)
}

// Not trimmed inside, so the card keeps its line breaks
const cardText = (value: string) => (value.trim() ? value : null)
const optionalText = (value: string) => value.trim() || null

// Empty optional fields are left out, as the API expects
export function toCreateOrderInput(values: OrderFormValues): CreateOrderInput {
  return {
    senderName: values.senderName.trim(),
    recipientName: values.recipientName.trim(),
    addressLine1: values.addressLine1.trim(),
    addressLine2: optionalText(values.addressLine2) ?? undefined,
    neighborhood: optionalText(values.neighborhood) ?? undefined,
    city: values.city,
    deliveryNotes: optionalText(values.deliveryNotes) ?? undefined,
    cardMessage: cardText(values.cardMessage) ?? undefined,
    responsiblePhone: phoneOf(values),
    responsibleContactType: values.contactType,
    deliveryDate: values.deliveryDate,
    deliveryTimeFrom: values.deliveryTimeFrom || undefined,
    deliveryTimeTo: values.deliveryTimeTo || undefined,
    deliveryFee: Number(values.deliveryFee),
    items: values.items.map(toItemInput),
  }
}

// Only the fields that changed are sent; emptied optional fields become null, which clears them
export function toUpdateOrderInput(values: OrderDetailsFormValues, order: Order): UpdateOrderInput {
  const next: Required<UpdateOrderInput> = {
    senderName: values.senderName.trim(),
    recipientName: values.recipientName.trim(),
    addressLine1: values.addressLine1.trim(),
    addressLine2: optionalText(values.addressLine2),
    neighborhood: optionalText(values.neighborhood),
    city: values.city,
    deliveryNotes: optionalText(values.deliveryNotes),
    cardMessage: cardText(values.cardMessage),
    responsiblePhone: phoneOf(values),
    responsibleContactType: values.contactType,
    deliveryDate: values.deliveryDate,
    deliveryTimeFrom: values.deliveryTimeFrom || null,
    deliveryTimeTo: values.deliveryTimeTo || null,
    deliveryFee: Number(values.deliveryFee),
  }
  const changes: UpdateOrderInput = {}
  for (const key of Object.keys(next) as (keyof UpdateOrderInput)[]) {
    if (next[key] !== order[key]) Object.assign(changes, { [key]: next[key] })
  }
  // The API takes the contact and its type together
  if ('responsiblePhone' in changes || 'responsibleContactType' in changes) {
    changes.responsiblePhone = next.responsiblePhone
    changes.responsibleContactType = next.responsibleContactType
  }
  return changes
}
