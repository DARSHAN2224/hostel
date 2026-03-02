import { useState, useEffect } from 'react'
import userService from '../services/userService'

/**
 * Fetches wardens, HODs, and counsellors for assignment dropdowns.
 * Automatically filters by hostelType and department when provided.
 */
export function useAssignmentOptions({ hostelType, department } = {}) {
  const [wardens,     setWardens]     = useState([])
  const [hods,        setHods]        = useState([])
  const [counsellors, setCounsellors] = useState([])
  const [loading,     setLoading]     = useState(false)

  useEffect(() => {
    let cancelled = false
    const fetch = async () => {
      setLoading(true)
      try {
        const [wRes, hRes, cRes] = await Promise.all([
          userService.getAll({ role: 'warden',     limit: 100, ...(hostelType ? { hostelType } : {}) }),
          userService.getAll({ role: 'hod',        limit: 100 }),
          userService.getAll({ role: 'counsellor', limit: 100 }),
        ])

        if (cancelled) return

        const extract = (res) => {
          if (Array.isArray(res)) return res
          const d = res?.data || res
          if (Array.isArray(d)) return d
          return d?.users || d?.counsellors || d?.wardens || d?.hods || d?.data || []
        }

        setWardens(extract(wRes))
        setHods(extract(hRes))
        setCounsellors(extract(cRes))
      } catch (e) {
        console.warn('useAssignmentOptions fetch failed', e)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetch()
    return () => { cancelled = true }
  }, [hostelType, department])

  // Filter HODs and counsellors by department if provided
  const filteredHods        = department ? hods.filter(h => h.department === department)        : hods
  const filteredCounsellors = department ? counsellors.filter(c => c.department === department) : counsellors

  return { wardens, hods: filteredHods, counsellors: filteredCounsellors, loading }
}