import { z } from 'zod'
import { todayInColombia } from '@/lib/dates'
import {
  OTHER_COUNTRY,
  CONTACT_TYPES,
  type ContactType,
  isValidWhatsappUsername,
  PHONE_COUNTRIES,
  isValidInternationalPhone,
  onlyDigits,
  toInternationalPhone,
} from '@/lib/phone'
import { PRODUCT_CATEGORIES } from '@/features/products/products-api'
import type { CreateOrderInput, Order, OrderExtraInput, OrderItemInput, UpdateOrderInput } from './orders-api'

// The form fields behind each contact: who is responsible for the order, and the optional one
// for the recipient. The contact input component works with either set
export const RESPONSIBLE_CONTACT_FIELDS = {
  type: 'contactType',
  username: 'whatsappUsername',
  country: 'phoneCountry',
  otherCode: 'phoneOtherCode',
  number: 'phoneNumber',
} as const

export const RECIPIENT_CONTACT_FIELDS = {
  type: 'recipientContactType',
  username: 'recipientWhatsappUsername',
  country: 'recipientPhoneCountry',
  otherCode: 'recipientPhoneOtherCode',
  number: 'recipientPhoneNumber',
} as const

export type ContactFields = typeof RESPONSIBLE_CONTACT_FIELDS | typeof RECIPIENT_CONTACT_FIELDS

export const CITIES = ['Barranquilla', 'Soledad'] as const

const required = (max: number) => z.string().trim().min(1, 'Este campo es obligatorio').max(max, `Máximo ${max} caracteres`)
const optional = (max: number) => z.string().trim().max(max, `Máximo ${max} caracteres`)
const time = z.string().regex(/^(([01]\d|2[0-3]):[0-5]\d)?$/, 'Hora no válida')

// The order's own fields, shared by the new-order and edit forms.
// Same limits as the backend; every input holds text, empty means "not given"
const orderDetailsFields = z.object({
  recipientName: required(50),
  recipientContactType: z.enum(CONTACT_TYPES),
  recipientWhatsappUsername: z.string(),
  recipientPhoneCountry: z.string(),
  recipientPhoneOtherCode: z.string(),
  recipientPhoneNumber: z.string(),
  addressLine1: required(40),
  addressLine2: optional(100),
  neighborhood: optional(100),
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

const contactValues = (values: DetailsValues, fields: ContactFields) => ({
  type: values[fields.type],
  username: values[fields.username],
  country: values[fields.country],
  otherCode: values[fields.otherCode],
  number: values[fields.number],
})

// Whether anything was typed for the contact: a username, or the phone number
function hasContact(values: DetailsValues, fields: ContactFields) {
  const contact = contactValues(values, fields)
  return contact.type === 'WHATSAPP_USERNAME' ? !!contact.username.trim() : !!onlyDigits(contact.number)
}

// The contact as the API takes it: a username, or the phone in international format
function contactOf(values: DetailsValues, fields: ContactFields) {
  const contact = contactValues(values, fields)
  if (contact.type === 'WHATSAPP_USERNAME') return contact.username.trim()
  const code = contact.country === OTHER_COUNTRY ? contact.otherCode : contact.country
  return toInternationalPhone(code, contact.number)
}

// An optional contact left empty is fine; one that is started has to be valid
function checkContact(values: DetailsValues, fields: ContactFields, ctx: z.RefinementCtx, optionalContact: boolean) {
  if (optionalContact && !hasContact(values, fields)) return
  const contact = contactValues(values, fields)

  if (contact.type === 'WHATSAPP_USERNAME') {
    const username = contact.username.trim()
    if (!username) {
      ctx.addIssue({ code: 'custom', path: [fields.username], message: 'Escribe el usuario de WhatsApp' })
    } else if (!isValidWhatsappUsername(username)) {
      ctx.addIssue({
        code: 'custom',
        path: [fields.username],
        message: 'Escribe el usuario sin "@", de 3 a 35 letras, números, puntos o guiones bajos',
      })
    }
    return
  }

  if (contact.country === OTHER_COUNTRY && !onlyDigits(contact.otherCode)) {
    ctx.addIssue({ code: 'custom', path: [fields.otherCode], message: 'Escribe el código del país' })
  } else if (!onlyDigits(contact.number)) {
    ctx.addIssue({ code: 'custom', path: [fields.number], message: 'Escribe el teléfono' })
  } else if (!isValidInternationalPhone(contactOf(values, fields))) {
    ctx.addIssue({ code: 'custom', path: [fields.number], message: 'El teléfono no parece válido' })
  }
}

// Rules that involve more than one field. The delivery date may be in the past
function checkDetails(values: DetailsValues, ctx: z.RefinementCtx) {
  checkContact(values, RESPONSIBLE_CONTACT_FIELDS, ctx, false)
  checkContact(values, RECIPIENT_CONTACT_FIELDS, ctx, true)

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
    // The text only goes with a ribbon, and is left out when empty
    ...(item.withRibbon && item.ribbonText.trim() && { ribbonText: item.ribbonText.trim() }),
    withCard: item.withCard,
  }
}

export type FormExtra = {
  key: string
  name: string
  price: string
  quantity: number
}

export const toExtraInput = (extra: FormExtra): OrderExtraInput => ({
  name: extra.name.trim(),
  price: Number(extra.price),
  quantity: extra.quantity,
})

// What the extras cost as typed so far; an unfinished price counts as 0 until it's fixed
export const extrasTotal = (extras: FormExtra[]) =>
  extras.reduce((sum, extra) => sum + typedDeliveryFee(extra.price) * extra.quantity, 0)

// Every extra has a name and a price made of digits
export const extrasValid = (extras: FormExtra[]) =>
  extras.every((extra) => extra.name.trim() && /^\d+$/.test(extra.price.trim()) && Number(extra.price) <= 2_147_483_647)

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
          ribbonText: z.string().trim().max(100, 'Máximo 100 caracteres'),
          withCard: z.boolean(),
        }),
      ),
    // Extras that aren't catalog products; the price is typed as text, like the other amounts
    extras: z
      .array(
        z.object({
          key: z.string(),
          name: z.string().trim().min(1, 'Escribe el nombre').max(80, 'Máximo 80 caracteres'),
          price: z
            .string()
            .trim()
            .regex(/^\d+$/, 'Escribe el precio, solo números')
            .refine((value) => Number(value) <= 2_147_483_647, 'El valor es demasiado alto'),
          quantity: z.number().int().min(1, 'Mínimo 1').max(999, 'Máximo 999'),
        }),
      )
      .max(50, 'Máximo 50 adicionales'),
  })
  .superRefine((values, ctx) => {
    checkDetails(values, ctx)
    checkCrowns(values.items, ctx)
    // An order of only extras is fine; an empty one is not
    if (values.items.length + values.extras.length === 0) {
      ctx.addIssue({ code: 'custom', path: ['items'], message: 'Agrega al menos un producto o un adicional' })
    }
  })

export type OrderFormValues = z.infer<typeof orderFormSchema>

export const orderDetailsFormSchema = orderDetailsFields.superRefine(checkDetails)

export type OrderDetailsFormValues = DetailsValues

export function emptyOrderForm(): OrderFormValues {
  return {
    recipientName: '',
    recipientContactType: 'PHONE',
    recipientWhatsappUsername: '',
    recipientPhoneCountry: '57',
    recipientPhoneOtherCode: '',
    recipientPhoneNumber: '',
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
    extras: [],
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
  if (country) return { country: country.code, otherCode: '', number: digits.slice(country.code.length) }
  const numberLength = Math.min(10, digits.length - 1)
  return {
    country: OTHER_COUNTRY,
    otherCode: digits.slice(0, digits.length - numberLength),
    number: digits.slice(-numberLength),
  }
}

// A saved contact (or none) as the form's fields
function contactToForm(fields: ContactFields, contact: string | null, type: ContactType | null) {
  const phone = type === 'PHONE' && contact ? splitPhone(contact) : { country: '57', otherCode: '', number: '' }
  return {
    [fields.type]: type ?? 'PHONE',
    [fields.username]: type === 'WHATSAPP_USERNAME' && contact ? contact : '',
    [fields.country]: phone.country,
    [fields.otherCode]: phone.otherCode,
    [fields.number]: phone.number,
  } as Pick<DetailsValues, ContactFields[keyof ContactFields]>
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
    ...contactToForm(RESPONSIBLE_CONTACT_FIELDS, order.responsiblePhone, order.responsibleContactType),
    ...contactToForm(RECIPIENT_CONTACT_FIELDS, order.recipientContact, order.recipientContactType),
    deliveryDate: order.deliveryDate,
    deliveryTimeFrom: order.deliveryTimeFrom ?? '',
    deliveryTimeTo: order.deliveryTimeTo ?? '',
    deliveryFee: String(order.deliveryFee),
  }
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
    responsiblePhone: contactOf(values, RESPONSIBLE_CONTACT_FIELDS),
    responsibleContactType: values.contactType,
    ...(hasContact(values, RECIPIENT_CONTACT_FIELDS) && {
      recipientContact: contactOf(values, RECIPIENT_CONTACT_FIELDS),
      recipientContactType: values.recipientContactType,
    }),
    deliveryDate: values.deliveryDate,
    deliveryTimeFrom: values.deliveryTimeFrom || undefined,
    deliveryTimeTo: values.deliveryTimeTo || undefined,
    deliveryFee: Number(values.deliveryFee),
    items: values.items.map(toItemInput),
    extras: values.extras.map(toExtraInput),
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
    responsiblePhone: contactOf(values, RESPONSIBLE_CONTACT_FIELDS),
    responsibleContactType: values.contactType,
    recipientContact: hasContact(values, RECIPIENT_CONTACT_FIELDS) ? contactOf(values, RECIPIENT_CONTACT_FIELDS) : null,
    recipientContactType: hasContact(values, RECIPIENT_CONTACT_FIELDS) ? values.recipientContactType : null,
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
  if ('recipientContact' in changes || 'recipientContactType' in changes) {
    changes.recipientContact = next.recipientContact
    changes.recipientContactType = next.recipientContactType
  }
  return changes
}
