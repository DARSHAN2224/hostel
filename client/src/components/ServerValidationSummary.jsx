import React from 'react'
import { useServerValidationErrors } from '../hooks/useServerValidationErrors'

export default function ServerValidationSummary() {
  const { errors, clear } = useServerValidationErrors()

  if (!errors || errors.length === 0) return null

  return (
    <div style={{
      position: 'fixed',
      top: 80,
      right: 20,
      zIndex: 9999,
      maxWidth: 420,
      background: '#fff',
      border: '1px solid #eee',
      boxShadow: '0 6px 18px rgba(0,0,0,0.08)',
      padding: '12px 14px',
      borderRadius: 8
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <strong style={{ fontSize: 14 }}>Validation errors</strong>
        <button onClick={clear} style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}>Dismiss</button>
      </div>
      <ul style={{ margin: 0, paddingLeft: 16 }}>
        {errors.map((e, idx) => (
          <li key={`${e.field}-${idx}`} style={{ fontSize: 13, color: '#333', marginBottom: 6 }}>
            <strong style={{ color: '#e74c3c' }}>{e.field || 'field'}</strong>: {e.message}
          </li>
        ))}
      </ul>
    </div>
  )
}
