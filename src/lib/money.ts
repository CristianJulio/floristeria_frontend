const money = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
})

// Whole Colombian pesos: 135000 -> "$ 135.000"
export function formatMoney(amount: number) {
  return money.format(amount)
}
