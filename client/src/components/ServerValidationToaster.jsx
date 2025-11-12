import React, { useEffect, useRef } from 'react'
import toast from 'react-hot-toast'
import { useServerValidationErrors } from '../hooks/useServerValidationErrors'

export default function ServerValidationToaster() {
  const { errors, clear } = useServerValidationErrors()
  const shownRef = useRef(false)

  useEffect(() => {
    if (errors && errors.length > 0 && !shownRef.current) {
      // show each validation error as a toast
      errors.forEach((e) => {
        toast.error(e.message)
      })
      shownRef.current = true
      // clear after showing so subsequent requests re-trigger
      clear()
      // reset shownRef after a short delay to allow future errors
      setTimeout(() => { shownRef.current = false }, 500)
    }
  }, [errors, clear])

  return null
}
