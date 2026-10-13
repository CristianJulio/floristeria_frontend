// All dates are "YYYY-MM-DD" calendar days in Colombia's time zone, like the backend's delivery dates

export function todayInColombia() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date())
}

export function addDays(date: string, days: number) {
  const [year, month, day] = date.split('-').map(Number)
  const result = new Date(Date.UTC(year, month - 1, day + days))
  return result.toISOString().slice(0, 10)
}

// Monday to Sunday of the week that contains the given day
export function weekRange(date: string) {
  const [year, month, day] = date.split('-').map(Number)
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay() // 0 = Sunday
  const monday = addDays(date, weekday === 0 ? -6 : 1 - weekday)
  return { from: monday, to: addDays(monday, 6) }
}

// First to last day of the month that contains the given day
export function monthRange(date: string) {
  const [year, month] = date.split('-').map(Number)
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate()
  const pad = (value: number) => String(value).padStart(2, '0')
  return { from: `${year}-${pad(month)}-01`, to: `${year}-${pad(month)}-${pad(last)}` }
}
