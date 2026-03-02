// client/src/services/socketService.js
/**
 * Socket.io client — connection manager.
 *
 * Usage:
 *   import socketService from './socketService'
 *
 *   // Connect (call once after login, e.g. in App.jsx)
 *   socketService.connect(token)
 *
 *   // Subscribe to an event
 *   const off = socketService.on('outpass:created', (data) => { ... })
 *   off() // unsubscribe
 *
 *   // Disconnect (call on logout)
 *   socketService.disconnect()
 */

import { io } from 'socket.io-client'

// ── Config ────────────────────────────────────────────────────────────────────

// Vite exposes env vars as import.meta.env.VITE_*
// Add VITE_SOCKET_URL=http://localhost:5000 to your .env if the API is on a
// different port/host than the frontend dev server.
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 
                   import.meta.env.VITE_API_URL?.replace('/api/v1', '') || 
                   (import.meta.env.DEV ? 'http://localhost:5000' : window.location.origin)

const RECONNECTION_ATTEMPTS = 5
const RECONNECTION_DELAY    = 1000  // ms (doubles on each attempt)

// ── State ─────────────────────────────────────────────────────────────────────

let socket = null
let connectionStatusListeners = []  // (status: string) => void

// ── Helpers ───────────────────────────────────────────────────────────────────

function notifyStatus(status) {
  connectionStatusListeners.forEach(fn => {
    try { fn(status) } catch (_) {}
  })
}

// ── Public API ────────────────────────────────────────────────────────────────

const socketService = {
  /**
   * Create and connect the socket.
   * Safe to call multiple times — will reuse an existing connected socket.
   *
   * @param {string} token - JWT access token
   */
  connect(token) {
    if (socket?.connected) return socket

    // Clean up any stale socket before creating a new one
    if (socket) {
      socket.removeAllListeners()
      socket.disconnect()
      socket = null
    }

    socket = io(SOCKET_URL, {
      ...(token ? { auth: { token } } : {}),
      withCredentials: true,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: RECONNECTION_ATTEMPTS,
      reconnectionDelay: RECONNECTION_DELAY,
      reconnectionDelayMax: 10000,
      timeout: 20000,
    })

    // ── Connection lifecycle ────────────────────────────────────────────────
    socket.on('connect', () => {
      console.info('[Socket] Connected:', socket.id)
      notifyStatus('connected')
    })

    socket.on('disconnect', (reason) => {
      console.info('[Socket] Disconnected:', reason)
      notifyStatus('disconnected')
    })

    socket.on('connect_error', (err) => {
      console.warn('[Socket] Connection error:', err.message)
      notifyStatus('error')
    })

    socket.on('reconnect', (attempt) => {
      console.info(`[Socket] Reconnected after ${attempt} attempt(s)`)
      notifyStatus('connected')
    })

    socket.on('reconnect_attempt', (attempt) => {
      console.info(`[Socket] Reconnect attempt ${attempt}/${RECONNECTION_ATTEMPTS}`)
      notifyStatus('reconnecting')
    })

    socket.on('reconnect_failed', () => {
      console.error('[Socket] Reconnection failed — giving up')
      notifyStatus('failed')
    })

    return socket
  },

  /**
   * Disconnect and destroy the socket.
   * Call this on logout.
   */
  disconnect() {
    if (socket) {
      socket.removeAllListeners()
      socket.disconnect()
      socket = null
      notifyStatus('disconnected')
      console.info('[Socket] Disconnected by client')
    }
  },

  /**
   * Subscribe to a socket event.
   * Returns an unsubscribe function — call it in useEffect cleanup.
   *
   * @param {string}   event   - Event name (e.g. 'outpass:created')
   * @param {Function} handler - Callback
   * @returns {Function} Unsubscribe
   */
  on(event, handler) {
    if (!socket) {
      console.warn(`[Socket] on('${event}') called before connect()`)
      return () => {}
    }
    socket.on(event, handler)
    return () => socket?.off(event, handler)
  },

  /**
   * Emit an event to the server.
   *
   * @param {string} event
   * @param {*}      data
   */
  emit(event, data) {
    if (!socket?.connected) {
      console.warn(`[Socket] emit('${event}') — not connected`)
      return
    }
    socket.emit(event, data)
  },

  /**
   * Request a manual dashboard refresh from the server.
   */
  requestRefresh() {
    this.emit('request:refresh', {})
  },

  /**
   * Subscribe to connection status changes.
   * Status values: 'connected' | 'disconnected' | 'reconnecting' | 'error' | 'failed'
   *
   * @param {Function} listener - (status: string) => void
   * @returns {Function} Unsubscribe
   */
  onStatusChange(listener) {
    connectionStatusListeners.push(listener)
    return () => {
      connectionStatusListeners = connectionStatusListeners.filter(fn => fn !== listener)
    }
  },

  /**
   * True if the socket is currently connected.
   */
  get isConnected() {
    return socket?.connected === true
  },

  /**
   * The underlying socket instance (use sparingly).
   */
  get socket() {
    return socket
  },
}

export default socketService