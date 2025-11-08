import {asyncHandler} from '../utils/asyncHandler.js'
import { ApiResponse } from '../utils/ApiResponse.js'
import Parent from '../models/Parent.js'
import Student from '../models/Student.js'

/**
 * @desc    Get all parents with search, filter and pagination
 * @route   GET /api/v1/parents
 * @access  Private (Admin, Warden)
 */
export const getAllParents = asyncHandler(async (req, res) => {
  const {
    search = '',
    relationship = '',
    city = '',
    state = '',
    page = 1,
    limit = 10,
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = req.query

  const query = {}

  // Search by name, phone, or email
  if (search) {
    query.$or = [
      { firstName: { $regex: search, $options: 'i' } },
      { lastName: { $regex: search, $options: 'i' } },
      { primaryPhone: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } }
    ]
  }

  // Filter by relationship
  if (relationship) {
    query.relationshipToStudent = relationship
  }

  // Filter by city
  if (city) {
    query['address.city'] = { $regex: city, $options: 'i' }
  }

  // Filter by state
  if (state) {
    query['address.state'] = { $regex: state, $options: 'i' }
  }

  const skip = (page - 1) * limit
  const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 }

  const [parents, total] = await Promise.all([
    Parent.find(query)
      .populate('students.student', 'firstName lastName rollNumber email phone hostel')
      .sort(sort)
      .skip(skip)
      .limit(Number.parseInt(limit, 10))
      .lean(),
    Parent.countDocuments(query)
  ])

  res
    .status(200)
    .json(
      new ApiResponse(200, {
        parents,
        pagination: {
          total,
          page: Number.parseInt(page, 10),
          pages: Math.ceil(total / limit),
          limit: Number.parseInt(limit, 10)
        }
      }, 'Parents retrieved successfully')
    )
})

/**
 * @desc    Get parent by ID
 * @route   GET /api/v1/parents/:id
 * @access  Private (Admin, Warden, Parent themselves)
 */
export const getParentById = asyncHandler(async (req, res) => {
  const parent = await Parent.findById(req.params.id)
    .populate('students.student', 'firstName lastName rollNumber email phone hostel department year section')
    .lean()

  if (!parent) {
    return res
      .status(404)
      .json(new ApiResponse(404, null, 'Parent not found'))
  }

  res
    .status(200)
    .json(new ApiResponse(200, parent, 'Parent details retrieved successfully'))
})

/**
 * @desc    Create new parent
 * @route   POST /api/v1/parents
 * @access  Private (Admin)
 */
export const createParent = asyncHandler(async (req, res) => {
  const {
    firstName,
    lastName,
    primaryPhone,
    secondaryPhone,
    email,
    relationshipToStudent,
    students,
    address,
    occupation,
    emergencyContact
  } = req.body

  // Verify all student IDs exist
  if (students && students.length > 0) {
    const studentIds = students.map(s => s.student)
    const existingStudents = await Student.find({ _id: { $in: studentIds } })
    
    if (existingStudents.length !== studentIds.length) {
      return res
        .status(400)
        .json(new ApiResponse(400, null, 'One or more student IDs are invalid'))
    }
  }

  const parent = await Parent.create({
    firstName,
    lastName,
    primaryPhone,
    secondaryPhone,
    email,
    relationshipToStudent,
    students,
    address,
    occupation,
    emergencyContact
  })

  // Update student records to include this parent
  if (students && students.length > 0) {
    for (const studentData of students) {
      await Student.findByIdAndUpdate(
        studentData.student,
        {
          $push: {
            parents: {
              parent: parent._id,
              relationship: studentData.relationship,
              isPrimaryContact: studentData.isPrimaryContact
            }
          }
        }
      )
    }
  }

  const populatedParent = await Parent.findById(parent._id)
    .populate('students.student', 'firstName lastName rollNumber')
    .lean()

  res
    .status(201)
    .json(new ApiResponse(201, populatedParent, 'Parent created successfully'))
})

/**
 * @desc    Update parent
 * @route   PATCH /api/v1/parents/:id
 * @access  Private (Admin)
 */
export const updateParent = asyncHandler(async (req, res) => {
  const parent = await Parent.findById(req.params.id)

  if (!parent) {
    return res
      .status(404)
      .json(new ApiResponse(404, null, 'Parent not found'))
  }

  /** @type {Set<string>} */
  const allowedUpdates = new Set([
    'firstName',
    'lastName',
    'primaryPhone',
    'secondaryPhone',
    'email',
    'relationshipToStudent',
    'address',
    'occupation',
    'emergencyContact'
  ])

  const updates = {}
  for (const key of Object.keys(req.body)) {
    if (allowedUpdates.has(key)) {
      updates[key] = req.body[key]
    }
  }

  const updatedParent = await Parent.findByIdAndUpdate(
    req.params.id,
    updates,
    { new: true, runValidators: true }
  ).populate('students.student', 'firstName lastName rollNumber')

  res
    .status(200)
    .json(new ApiResponse(200, updatedParent, 'Parent updated successfully'))
})

/**
 * @desc    Delete parent
 * @route   DELETE /api/v1/parents/:id
 * @access  Private (Admin)
 */
export const deleteParent = asyncHandler(async (req, res) => {
  const parent = await Parent.findById(req.params.id)

  if (!parent) {
    return res
      .status(404)
      .json(new ApiResponse(404, null, 'Parent not found'))
  }

  // Remove parent reference from all associated students
  if (parent.students && parent.students.length > 0) {
    for (const studentData of parent.students) {
      await Student.findByIdAndUpdate(
        studentData.student,
        {
          $pull: { parents: { parent: parent._id } }
        }
      )
    }
  }

  await parent.deleteOne()

  res
    .status(200)
    .json(new ApiResponse(200, null, 'Parent deleted successfully'))
})

/**
 * @desc    Add student to parent
 * @route   POST /api/v1/parents/:id/students
 * @access  Private (Admin)
 */
export const addStudentToParent = asyncHandler(async (req, res) => {
  const { studentId, relationship, isPrimaryContact, canApproveOutpass } = req.body

  const parent = await Parent.findById(req.params.id)
  if (!parent) {
    return res
      .status(404)
      .json(new ApiResponse(404, null, 'Parent not found'))
  }

  const student = await Student.findById(studentId)
  if (!student) {
    return res
      .status(404)
      .json(new ApiResponse(404, null, 'Student not found'))
  }

  // Check if student is already linked
  const exists = parent.students.some(
    s => s.student.toString() === studentId
  )

  if (exists) {
    return res
      .status(400)
      .json(new ApiResponse(400, null, 'Student is already linked to this parent'))
  }

  // Add student to parent
  parent.students.push({
    student: studentId,
    studentId: student.studentId,
    rollNumber: student.rollNumber,
    relationship,
    isPrimaryContact: isPrimaryContact || false,
    canApproveOutpass: canApproveOutpass !== false
  })

  await parent.save()

  // Add parent to student
  student.parents.push({
    parent: parent._id,
    relationship,
    isPrimaryContact: isPrimaryContact || false
  })

  await student.save()

  const updatedParent = await Parent.findById(parent._id)
    .populate('students.student', 'firstName lastName rollNumber')
    .lean()

  res
    .status(200)
    .json(new ApiResponse(200, updatedParent, 'Student added to parent successfully'))
})

/**
 * @desc    Remove student from parent
 * @route   DELETE /api/v1/parents/:id/students/:studentId
 * @access  Private (Admin)
 */
export const removeStudentFromParent = asyncHandler(async (req, res) => {
  const { id: parentId, studentId } = req.params

  const parent = await Parent.findById(parentId)
  if (!parent) {
    return res
      .status(404)
      .json(new ApiResponse(404, null, 'Parent not found'))
  }

  // Remove student from parent
  parent.students = parent.students.filter(
    s => s.student.toString() !== studentId
  )

  await parent.save()

  // Remove parent from student
  await Student.findByIdAndUpdate(
    studentId,
    {
      $pull: { parents: { parent: parentId } }
    }
  )

  const updatedParent = await Parent.findById(parentId)
    .populate('students.student', 'firstName lastName rollNumber')
    .lean()

  res
    .status(200)
    .json(new ApiResponse(200, updatedParent, 'Student removed from parent successfully'))
})

/**
 * @desc    Get parent statistics
 * @route   GET /api/v1/parents/stats
 * @access  Private (Admin)
 */
export const getParentStats = asyncHandler(async (req, res) => {
  const [
    totalParents,
    relationshipStats,
    cityStats,
    parentsWithMultipleChildren
  ] = await Promise.all([
    Parent.countDocuments(),
    Parent.aggregate([
      {
        $group: {
          _id: '$relationshipToStudent',
          count: { $sum: 1 }
        }
      }
    ]),
    Parent.aggregate([
      {
        $group: {
          _id: '$address.city',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]),
    Parent.countDocuments({
      $expr: { $gte: [{ $size: '$students' }, 2] }
    })
  ])

  res
    .status(200)
    .json(
      new ApiResponse(200, {
        totalParents,
        relationshipStats,
        cityStats,
        parentsWithMultipleChildren
      }, 'Parent statistics retrieved successfully')
    )
})
