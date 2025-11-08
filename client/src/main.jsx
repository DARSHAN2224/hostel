import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Suppress Framer Motion oklab color warning (known library issue, doesn't affect functionality)
if (import.meta.env.DEV) {
  const originalWarn = console.warn
  console.warn = (...args) => {
    const msg = args[0]
    if (typeof msg === 'string' && msg.includes('oklab') && msg.includes('not an animatable color')) {
      return // Suppress this specific warning
    }
    originalWarn.apply(console, args)
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
