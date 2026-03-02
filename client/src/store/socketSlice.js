// client/src/store/socketSlice.js
/**
 * socketSlice — tracks WebSocket connection status in Redux.
 *
 * State shape:
 *   socket: {
 *     status: 'idle' | 'connected' | 'disconnected' | 'reconnecting' | 'error' | 'failed'
 *     isConnected: boolean
 *   }
 *
 * Usage in components:
 *   const { isConnected, status } = useSelector(selectSocket)
 */

import { createSlice } from '@reduxjs/toolkit'

const initialState = {
  status: 'idle',       // before first connect attempt
  isConnected: false,
}

const socketSlice = createSlice({
  name: 'socket',
  initialState,
  reducers: {
    /**
     * Called by useSocketStatus() whenever the connection status changes.
     * @param {string} action.payload - new status string
     */
    setSocketStatus(state, action) {
      state.status      = action.payload
      state.isConnected = action.payload === 'connected'
    },

    resetSocket(state) {
      state.status      = 'idle'
      state.isConnected = false
    },
  },
})

export const { setSocketStatus, resetSocket } = socketSlice.actions

// ── Selectors ─────────────────────────────────────────────────────────────────

export const selectSocket      = (state) => state.socket
export const selectIsConnected = (state) => state.socket.isConnected
export const selectSocketStatus= (state) => state.socket.status

export default socketSlice.reducer