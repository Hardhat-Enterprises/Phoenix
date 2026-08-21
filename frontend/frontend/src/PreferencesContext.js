import { createContext, useContext } from 'react'

export const PreferencesContext = createContext(null)

export const usePreferences = () => {
  const context = useContext(PreferencesContext)

  if (!context) {
    throw new Error('usePreferences must be used within a PreferencesProvider')
  }

  return context
}
