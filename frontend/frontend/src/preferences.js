export const PREFERENCES_STORAGE_KEY = 'phoenixSettings'
export const PREFERENCES_VERSION = 1

const ALLOWED_THEMES = new Set(['light', 'dark', 'system'])
const ALLOWED_ALERT_RADII = new Set(['20', '50', '100'])
const ALLOWED_DENSITIES = new Set(['comfortable', 'compact'])
const ALLOWED_DATE_FORMATS = new Set([
  'system',
  'day-month-year',
  'month-day-year',
  'year-month-day',
])

const isRecord = (value) => value !== null && typeof value === 'object' && !Array.isArray(value)

const hasUnsupportedVersion = (value) => (
  isRecord(value)
  && Number.isInteger(value.version)
  && value.version > PREFERENCES_VERSION
)

const validateLocation = (value) => {
  if (!isRecord(value)) return null

  const latitude = value.latitude
  const longitude = value.longitude

  if (
    typeof latitude !== 'number'
    || !Number.isFinite(latitude)
    || latitude < -90
    || latitude > 90
    || typeof longitude !== 'number'
    || !Number.isFinite(longitude)
    || longitude < -180
    || longitude > 180
  ) {
    return null
  }

  return { latitude, longitude }
}

export const getDefaultPreferences = () => ({
  version: PREFERENCES_VERSION,
  theme: 'system',
  reducedMotion: false,
  density: 'comfortable',
  largerText: false,
  highContrast: false,
  dateFormat: 'system',
  sidebarCollapsed: false,
  confirmImportantActions: true,
  alertTypes: {
    flood: false,
    cyber: true,
    bushfire: false,
  },
  locationTracking: false,
  alertRadius: '20',
  location: null,
})

export const validatePreferences = (value) => {
  const defaults = getDefaultPreferences()

  if (!isRecord(value) || hasUnsupportedVersion(value)) return defaults

  const alertTypes = isRecord(value.alertTypes) ? value.alertTypes : {}

  return {
    version: PREFERENCES_VERSION,
    theme: ALLOWED_THEMES.has(value.theme) ? value.theme : defaults.theme,
    reducedMotion: typeof value.reducedMotion === 'boolean'
      ? value.reducedMotion
      : defaults.reducedMotion,
    density: ALLOWED_DENSITIES.has(value.density)
      ? value.density
      : defaults.density,
    largerText: typeof value.largerText === 'boolean'
      ? value.largerText
      : defaults.largerText,
    highContrast: typeof value.highContrast === 'boolean'
      ? value.highContrast
      : defaults.highContrast,
    dateFormat: ALLOWED_DATE_FORMATS.has(value.dateFormat)
      ? value.dateFormat
      : defaults.dateFormat,
    sidebarCollapsed: typeof value.sidebarCollapsed === 'boolean'
      ? value.sidebarCollapsed
      : defaults.sidebarCollapsed,
    confirmImportantActions: typeof value.confirmImportantActions === 'boolean'
      ? value.confirmImportantActions
      : defaults.confirmImportantActions,
    alertTypes: {
      flood: typeof alertTypes.flood === 'boolean' ? alertTypes.flood : defaults.alertTypes.flood,
      cyber: typeof alertTypes.cyber === 'boolean' ? alertTypes.cyber : defaults.alertTypes.cyber,
      bushfire: typeof alertTypes.bushfire === 'boolean' ? alertTypes.bushfire : defaults.alertTypes.bushfire,
    },
    locationTracking: typeof value.locationTracking === 'boolean'
      ? value.locationTracking
      : defaults.locationTracking,
    alertRadius: ALLOWED_ALERT_RADII.has(value.alertRadius)
      ? value.alertRadius
      : defaults.alertRadius,
    location: validateLocation(value.location),
  }
}

const readStoredPreferences = () => {
  const storedValue = window.localStorage.getItem(PREFERENCES_STORAGE_KEY)
  return storedValue === null ? null : JSON.parse(storedValue)
}

export const loadPreferences = () => {
  const defaults = getDefaultPreferences()

  if (typeof window === 'undefined') return defaults

  try {
    const storedPreferences = readStoredPreferences()
    return storedPreferences === null ? defaults : validatePreferences(storedPreferences)
  } catch {
    return defaults
  }
}

export const savePreferences = (preferences) => {
  const safePreferences = validatePreferences(preferences)

  if (typeof window === 'undefined') {
    return { ok: false, reason: 'storage-unavailable', preferences: safePreferences }
  }

  try {
    const storedValue = window.localStorage.getItem(PREFERENCES_STORAGE_KEY)
    let storedPreferences = null

    if (storedValue !== null) {
      try {
        storedPreferences = JSON.parse(storedValue)
      } catch {
        storedPreferences = null
      }
    }

    if (hasUnsupportedVersion(storedPreferences)) {
      return {
        ok: false,
        reason: 'unsupported-version',
        preferences: getDefaultPreferences(),
      }
    }

    window.localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(safePreferences))
    return { ok: true, preferences: safePreferences }
  } catch {
    return { ok: false, reason: 'storage-unavailable', preferences: safePreferences }
  }
}

export const clearPreferences = () => {
  if (typeof window === 'undefined') {
    return { ok: false, reason: 'storage-unavailable' }
  }

  try {
    window.localStorage.removeItem(PREFERENCES_STORAGE_KEY)
    return { ok: true }
  } catch {
    return { ok: false, reason: 'storage-unavailable' }
  }
}
