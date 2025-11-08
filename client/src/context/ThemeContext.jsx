import { useEffect, useMemo, useState } from 'react'
import PropTypes from 'prop-types'
import { STORAGE_KEYS } from '../constants'
import { ThemeContext } from './theme'

/**
 * Get system color scheme preference
 * @returns {string} 'dark' or 'light'
 */
const getSystemPref = () => (
  globalThis.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
)

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => localStorage.getItem(STORAGE_KEYS.THEME) || 'auto')

  useEffect(() => {
    const effective = theme === 'auto' ? getSystemPref() : theme
    const root = document.documentElement
    
    if (effective === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
    
    localStorage.setItem(STORAGE_KEYS.THEME, theme)
    
    console.log('Theme updated:', { theme, effective, hasClass: root.classList.contains('dark') })
  }, [theme])

  // React to system changes in auto mode
  useEffect(() => {
    if (theme !== 'auto') return
    
    const media = globalThis.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => {
      const newPref = media.matches ? 'dark' : 'light'
      const root = document.documentElement
      if (newPref === 'dark') {
        root.classList.add('dark')
      } else {
        root.classList.remove('dark')
      }
    }
    
    media.addEventListener?.('change', handler)
    return () => media.removeEventListener?.('change', handler)
  }, [theme])

  const value = useMemo(() => ({ theme, setTheme }), [theme])
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

ThemeProvider.propTypes = {
  children: PropTypes.node.isRequired,
}

// Remove useTheme export from this file
