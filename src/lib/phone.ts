// Countries offered in phone fields; "Otro" lets staff type any country code
export const PHONE_COUNTRIES = [
  { code: '57', label: 'Colombia (+57)' },
  { code: '1', label: 'Estados Unidos (+1)' },
  { code: '34', label: 'España (+34)' },
  { code: '58', label: 'Venezuela (+58)' },
] as const

export const CONTACT_TYPES = ['PHONE', 'WHATSAPP_USERNAME'] as const
export type ContactType = (typeof CONTACT_TYPES)[number]

export const OTHER_COUNTRY = 'otro'

export function onlyDigits(value: string) {
  return value.replace(/\D/g, '')
}

// "57" + "300 123 4567" -> "+573001234567", the international format the API expects
export function toInternationalPhone(countryCode: string, number: string) {
  return `+${onlyDigits(countryCode)}${onlyDigits(number)}`
}

// The API accepts "+" and 8 to 15 digits, the international limit
export function isValidInternationalPhone(phone: string) {
  return /^\+\d{8,15}$/.test(phone)
}

// Same rule as the API: 3 to 35 letters, digits, periods or underscores; the "@" is not stored
export function cleanWhatsappUsername(value: string) {
  return value.trim().replace(/^@/, '')
}

export function isValidWhatsappUsername(username: string) {
  return /^[A-Za-z0-9._]{3,35}$/.test(username)
}
