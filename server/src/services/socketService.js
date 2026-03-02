// server/src/services/socketService.js
/**
 * socketService.js — Central emit helpers for outpass real-time events.
 *
 * ROOM STRATEGY
 * ─────────────
 * Every connected socket automatically joins:
 *   • "user:<userId>"          — personal room (any role)
 *   • "role:<role>"            — role-wide room  (e.g. "role:warden")
 *   • "hostelType:<type>"      — hostel-type room (wardens/security: "hostelType:boys")
 *   • "hostelBlock:<block>"    — block room       (students/wardens: "hostelBlock:A")
 *   • "dept:<department>"      — department room  (hod/counsellor/students)
 */

import { getIOSafe } from '../config/socket.js'
import logger from '../config/logger.js'

// ─── Room Helpers ────────────────────────────────────────────────────────────

export const Rooms = {
  user: (id) => `user:${id}`,
  role: (role) => `role:${role}`,
  hostelType: (type) => `hostelType:${type}`,
  hostelBlock: (block) => `hostelBlock:${block}`,
  dept: (dept) => `dept:${dept}`,
}

/**
 * Register a connected socket into the appropriate rooms.
 * Call this inside io.on('connection').
 */
export function joinUserRooms(socket) {
  const u = socket.user
  if (!u) return

  const rooms = [Rooms.user(u.id), Rooms.role(u.role)]

  if (u.hostelType) rooms.push(Rooms.hostelType(u.hostelType))
  if (u.hostelBlock) rooms.push(Rooms.hostelBlock(u.hostelBlock))
  if (u.department) rooms.push(Rooms.dept(u.department))

  socket.join(rooms)
  logger.debug(`[Socket] ${u.role}(${u.id}) joined rooms: ${rooms.join(', ')}`)
}

// ─── Generic Emitter ─────────────────────────────────────────────────────────

function emit(rooms, event, data) {
  const io = getIOSafe()
  if (!io) {
    logger.debug(`[Socket] io not ready — skipping event '${event}'`)
    return
  }

  const roomList = Array.isArray(rooms) ? rooms : [rooms]
  for (const room of roomList) {
    io.to(room).emit(event, data)
  }
  logger.debug(`[Socket] Emitted '${event}' to [${roomList.join(', ')}]`)
}

// ─── Outpass Events ──────────────────────────────────────────────────────────

/**
 * NEW outpass request created by student.
 * Wardens need to see this immediately — emit to role:warden directly,
 * plus hostelType room as a secondary channel.
 */
export function emitOutpassCreated(outpass, student) {
  const payload = {
    type: 'outpass_created',
    outpass: sanitizeOutpass(outpass),
    timestamp: new Date().toISOString(),
  }

  const rooms = [
    Rooms.user(student._id.toString()),  // confirm to student
    Rooms.role('warden'),                // ALL wardens see new requests
    Rooms.role('admin'),
    Rooms.role('hod'),
  ]

  // Also target by hostelType for scoped filtering (wardens can ignore if different type)
  if (student.hostelType) rooms.push(Rooms.hostelType(student.hostelType))

  // Counsellor room if counsellor approval needed
  if (outpass.counsellorApprovalRequested) {
    rooms.push(Rooms.role('counsellor'))
  }

  emit(rooms, 'outpass:created', payload)
}

/**
 * Warden approved an outpass.
 */
export function emitOutpassApproved(outpass, student) {
  const payload = {
    type: 'outpass_approved',
    outpass: sanitizeOutpass(outpass),
    timestamp: new Date().toISOString(),
  }

  const rooms = [
    Rooms.user(student._id.toString()),  // notify the student
    Rooms.role('warden'),                // update warden's list
    Rooms.role('security'),              // security dashboard needs approved list
    Rooms.role('admin'),
  ]

  if (outpass.hodApprovalRequested && outpass.hod) {
    rooms.push(Rooms.user(outpass.hod.toString()))
  }

  emit(rooms, 'outpass:approved', payload)
}

/**
 * Warden rejected an outpass.
 */
export function emitOutpassRejected(outpass, student) {
  const payload = {
    type: 'outpass_rejected',
    outpass: sanitizeOutpass(outpass),
    timestamp: new Date().toISOString(),
  }

  const rooms = [
    Rooms.user(student._id.toString()),
    Rooms.role('warden'),
    Rooms.role('admin'),
  ]

  emit(rooms, 'outpass:rejected', payload)
}

/**
 * HOD approved an outpass.
 */
export function emitHodApproved(outpass, student) {
  const payload = {
    type: 'hod_approved',
    outpass: sanitizeOutpass(outpass),
    timestamp: new Date().toISOString(),
  }

  const rooms = [
    Rooms.user(student._id.toString()),
    Rooms.role('warden'),
    Rooms.role('security'),
    Rooms.role('admin'),
  ]

  emit(rooms, 'outpass:hod_approved', payload)
}

/**
 * HOD rejected an outpass.
 */
export function emitHodRejected(outpass, student) {
  const payload = {
    type: 'hod_rejected',
    outpass: sanitizeOutpass(outpass),
    timestamp: new Date().toISOString(),
  }

  const rooms = [
    Rooms.user(student._id.toString()),
    Rooms.role('warden'),
    Rooms.role('admin'),
  ]

  emit(rooms, 'outpass:hod_rejected', payload)
}

/**
 * Counsellor approved or rejected an outpass.
 */
export function emitCounsellorDecision(outpass, student, approved) {
  const event = approved ? 'outpass:counsellor_approved' : 'outpass:counsellor_rejected'
  const payload = {
    type: approved ? 'counsellor_approved' : 'counsellor_rejected',
    outpass: sanitizeOutpass(outpass),
    timestamp: new Date().toISOString(),
  }

  const rooms = [
    Rooms.user(student._id.toString()),
    Rooms.role('warden'),
    Rooms.role('admin'),
  ]

  emit(rooms, event, payload)
}

/**
 * Parent OTP approval completed.
 */
export function emitParentApproved(outpass, student) {
  const payload = {
    type: 'parent_approved',
    outpass: sanitizeOutpass(outpass),
    timestamp: new Date().toISOString(),
  }

  const rooms = [
    Rooms.user(student._id.toString()),
    Rooms.role('warden'),
    Rooms.role('admin'),
  ]

  emit(rooms, 'outpass:parent_approved', payload)
}

/**
 * Security recorded a gate exit.
 */
export function emitExitRecorded(outpass, student) {
  const payload = {
    type: 'exit_recorded',
    outpass: sanitizeOutpass(outpass),
    studentId: student._id?.toString(),
    studentName: `${student.firstName || ''} ${student.lastName || ''}`.trim(),
    hostelBlock: student.hostelBlock || null,
    exitTime: outpass.gateEntry?.exitTime || new Date().toISOString(),
    timestamp: new Date().toISOString(),
  }

  const rooms = [
    Rooms.user(student._id.toString()),
    Rooms.role('security'),
    Rooms.role('warden'),
    Rooms.role('admin'),
  ]

  if (student.hostelType) rooms.push(Rooms.hostelType(student.hostelType))

  emit(rooms, 'outpass:exit', payload)
}

/**
 * Security recorded a gate return.
 */
export function emitReturnRecorded(outpass, student) {
  const payload = {
    type: 'return_recorded',
    outpass: sanitizeOutpass(outpass),
    studentId: student._id?.toString(),
    studentName: `${student.firstName || ''} ${student.lastName || ''}`.trim(),
    hostelBlock: student.hostelBlock || null,
    returnTime: outpass.gateEntry?.returnTime || new Date().toISOString(),
    isLate: outpass.isLateReturn || false,
    lateMinutes: outpass.lateReturnMinutes || 0,
    timestamp: new Date().toISOString(),
  }

  const rooms = [
    Rooms.user(student._id.toString()),
    Rooms.role('security'),
    Rooms.role('warden'),
    Rooms.role('admin'),
  ]

  if (student.hostelType) rooms.push(Rooms.hostelType(student.hostelType))

  emit(rooms, 'outpass:return', payload)
}

/**
 * Outpass cancelled by student or staff.
 */
export function emitOutpassCancelled(outpass, student) {
  const payload = {
    type: 'outpass_cancelled',
    outpass: sanitizeOutpass(outpass),
    timestamp: new Date().toISOString(),
  }

  const rooms = [
    Rooms.user(student._id.toString()),
    Rooms.role('warden'),
    Rooms.role('admin'),
    Rooms.role('security'),
  ]

  emit(rooms, 'outpass:cancelled', payload)
}

/**
 * Trigger a dashboard refresh for one or more roles.
 * Use after bulk operations or when a targeted event isn't enough.
 */
export function emitDashboardRefresh(roles = ['warden', 'admin', 'security', 'hod']) {
  const payload = { type: 'dashboard_refresh', timestamp: new Date().toISOString() }
  const rooms = roles.map(Rooms.role)
  emit(rooms, 'dashboard:refresh', payload)
}

// ─── Connection Handler ───────────────────────────────────────────────────────

/**
 * Register the Socket.io connection handler.
 * Call once after initSocket() in app.js.
 */
export function setupSocketHandlers(io) {
  io.on('connection', (socket) => {
    logger.info(`[Socket] Connected: socketId=${socket.id} userId=${socket.user?.id} role=${socket.user?.role}`)

    joinUserRooms(socket)

    socket.on('request:refresh', () => {
      socket.emit('dashboard:refresh', { type: 'manual_refresh', timestamp: new Date().toISOString() })
    })

    socket.on('disconnect', (reason) => {
      logger.info(`[Socket] Disconnected: socketId=${socket.id} userId=${socket.user?.id} reason=${reason}`)
    })

    socket.on('error', (err) => {
      logger.error(`[Socket] Error on socketId=${socket.id}: ${err.message}`)
    })
  })
}

// ─── Internal Helpers ─────────────────────────────────────────────────────────

function sanitizeOutpass(outpass) {
  const obj = typeof outpass.toObject === 'function' ? outpass.toObject() : { ...outpass }
  if (obj.parentApproval) {
    delete obj.parentApproval.otp
    delete obj.parentApproval.otpExpiresAt
  }
  return obj
}