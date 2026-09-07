const CUSTOM_DATE_FORMATS = new Set([
  'day-month-year',
  'month-day-year',
  'year-month-day',
])

const padDatePart = (value) => String(value).padStart(2, '0')

const formatCustomDatePart = (date, dateFormat) => {
  const day = padDatePart(date.getDate())
  const month = padDatePart(date.getMonth() + 1)
  const year = date.getFullYear()

  if (dateFormat === 'month-day-year') return `${month}/${day}/${year}`
  if (dateFormat === 'year-month-day') return `${year}/${month}/${day}`
  return `${day}/${month}/${year}`
}

export const formatDisplayDate = (
  value,
  dateFormat,
  {
    fallback = '',
    includeTime = false,
    systemOptions,
    timeOptions,
  } = {},
) => {
  if (!value) return fallback

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return fallback

  try {
    if (!CUSTOM_DATE_FORMATS.has(dateFormat)) {
      return includeTime
        ? date.toLocaleString(undefined, systemOptions)
        : date.toLocaleDateString(undefined, systemOptions)
    }

    const datePart = formatCustomDatePart(date, dateFormat)

    if (!includeTime) return datePart

    return `${datePart}, ${date.toLocaleTimeString(undefined, timeOptions)}`
  } catch {
    return fallback
  }
}
