import { useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { selectValidationErrors, clearValidationErrors } from '../store/uiSlice'

/**
 * Hook to access server-side validation errors stored in Redux.
 * Returns the errors array and a helper to clear them.
 */
export function useServerValidationErrors() {
  const dispatch = useDispatch()
  const errors = useSelector(selectValidationErrors)

  const clear = () => dispatch(clearValidationErrors())

  // Optionally auto-clear on unmount
  useEffect(() => {
    return () => {
      if (errors && errors.length > 0) dispatch(clearValidationErrors())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { errors, clear }
}

/**
 * Apply server errors to a form's setError function (e.g. react-hook-form setError)
 * setError(fieldOrNull, { type: 'server', message })
 */
export function applyServerErrorsToForm(setError, errors = []) {
  if (!setError || typeof setError !== 'function') return

  errors.forEach(e => {
    const field = e.field || 'form'
    // best-effort: try to set the field error
    setError(field, { type: 'server', message: e.message })
  })
}

export default useServerValidationErrors
