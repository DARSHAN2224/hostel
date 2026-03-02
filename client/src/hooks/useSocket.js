// client/src/hooks/useSocket.js
/**
 * useSocket — React hook for consuming real-time socket events.
 *
 * Examples
 * ────────
 * // Listen to a single event and do something with the data:
 * useSocket('outpass:created', (data) => {
 *   setOutpasses(prev => [data.outpass, ...prev])
 * })
 *
 * // Listen with a dependency (re-registers when dep changes):
 * useSocket('outpass:approved', handleApproved, [activeTab])
 *
 * // Get connection status:
 * const { isConnected, status } = useSocketStatus()
 */

import { useEffect, useRef, useCallback } from 'react'
import { useDispatch } from 'react-redux'
import socketService from '../services/socketService'
import { setSocketStatus } from '../store/socketSlice'

// ── Primary hook ──────────────────────────────────────────────────────────────

/**
 * Subscribe to a socket event for the lifetime of the component.
 *
 * @param {string}    event   - Socket event name (e.g. 'outpass:created')
 * @param {Function}  handler - Called with the event payload
 * @param {any[]}     deps    - Extra dependencies that should re-register the handler
 */
export function useSocket(event, handler, deps = []) {
  // Wrap handler in a ref so we don't re-register on every render
  const handlerRef = useRef(handler)
  useEffect(() => { handlerRef.current = handler })

  const stableHandler = useCallback((...args) => {
    handlerRef.current?.(...args)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  useEffect(() => {
    if (!event) return
    const off = socketService.on(event, stableHandler)
    return off
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event, stableHandler])
}

// ── Status hook ───────────────────────────────────────────────────────────────

/**
 * Subscribe to socket connection status changes.
 * Also syncs status to Redux (socketSlice).
 *
 * @returns {{ isConnected: boolean, status: string }}
 */
export function useSocketStatus() {
  const dispatch = useDispatch()

  useEffect(() => {
    const off = socketService.onStatusChange((status) => {
      dispatch(setSocketStatus(status))
    })
    return off
  }, [dispatch])

  return {
    isConnected: socketService.isConnected,
  }
}

// ── Outpass-specific hooks ────────────────────────────────────────────────────

/**
 * useOutpassEvents — subscribes to ALL outpass lifecycle events.
 * Pass handler functions for each event you care about; omit the rest.
 *
 * Designed to be dropped into OutpassManagement, SecurityDashboard,
 * StudentDashboard, AdminDashboard, HODDashboard, etc.
 *
 * @param {{
 *   onCreated?:           (data) => void,
 *   onApproved?:          (data) => void,
 *   onRejected?:          (data) => void,
 *   onHodApproved?:       (data) => void,
 *   onHodRejected?:       (data) => void,
 *   onCounsellorApproved?:(data) => void,
 *   onCounsellorRejected?:(data) => void,
 *   onParentApproved?:    (data) => void,
 *   onExit?:              (data) => void,
 *   onReturn?:            (data) => void,
 *   onCancelled?:         (data) => void,
 *   onDashboardRefresh?:  (data) => void,
 * }} handlers
 * @param {any[]} deps - Extra deps for re-registration
 */
export function useOutpassEvents(handlers = {}, deps = []) {
  useSocket('outpass:created',              handlers.onCreated,            deps)
  useSocket('outpass:approved',             handlers.onApproved,           deps)
  useSocket('outpass:rejected',             handlers.onRejected,           deps)
  useSocket('outpass:hod_approved',         handlers.onHodApproved,        deps)
  useSocket('outpass:hod_rejected',         handlers.onHodRejected,        deps)
  useSocket('outpass:counsellor_approved',  handlers.onCounsellorApproved, deps)
  useSocket('outpass:counsellor_rejected',  handlers.onCounsellorRejected, deps)
  useSocket('outpass:parent_approved',      handlers.onParentApproved,     deps)
  useSocket('outpass:exit',                 handlers.onExit,               deps)
  useSocket('outpass:return',               handlers.onReturn,             deps)
  useSocket('outpass:cancelled',            handlers.onCancelled,          deps)
  useSocket('dashboard:refresh',            handlers.onDashboardRefresh,   deps)
}

// Default export for convenience
export default useSocket