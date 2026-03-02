import Joi from 'joi';
import { ApiResponse } from '../utils/ApiResponse.js';
import logger from '../config/logger.js';

/**
 * Validation Middleware Factory
 * Creates a middleware that validates request data against a Joi schema
 *
 * @param {Joi.Schema} schema - Joi validation schema
 * @param {string} property - Request property to validate ('body', 'query', 'params')
 * @returns {Function} Express middleware function
 */
export const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,   // Return all errors, not just the first one
      stripUnknown: true,  // Remove unknown keys
      convert: true,       // Type conversion
    });

    if (error) {
      const errorMessages = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message.replace(/"/g, ''),
      }));

      const maskedData = { ...req[property] };
      if (maskedData.password)        maskedData.password        = '***MASKED***';
      if (maskedData.currentPassword) maskedData.currentPassword = '***MASKED***';
      if (maskedData.newPassword)     maskedData.newPassword     = '***MASKED***';
      if (maskedData.confirmPassword) maskedData.confirmPassword = '***MASKED***';

      logger.warn('Validation Failed', {
        property,
        errors: errorMessages,
        receivedData: maskedData,
        request: {
          method: req.method,
          url: req.originalUrl,
          ip: req.ip || req.connection.remoteAddress,
        },
      });

      return res.status(400).json(
        new ApiResponse(400, { errors: errorMessages }, 'Validation Error')
      );
    }

    req[property] = value;
    next();
  };
};

// ─── Hostel block constants (mirror server/src/utils/constants.js) ────────────
// Boys hostel  → A, B, C, D
// Girls hostel → E, F, G, H
// Kept inline here so validation.js has zero extra imports and stays self-contained.
const BOYS_BLOCKS  = ['A', 'B', 'C', 'D']
const GIRLS_BLOCKS = ['E', 'F', 'G', 'H']
const ALL_BLOCKS   = [...BOYS_BLOCKS, ...GIRLS_BLOCKS]  // ['A','B','C','D','E','F','G','H']

// ─── COMMON SCHEMAS ──────────────────────────────────────────────────────────

const emailSchema = Joi.string()
  .email({ minDomainSegments: 2 })
  .lowercase()
  .trim()
  .required()
  .messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required',
  });

const passwordSchema = Joi.string()
  .min(8)
  .max(128)
  .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
  .required()
  .messages({
    'string.min': 'Password must be at least 8 characters long',
    'string.max': 'Password cannot exceed 128 characters',
    'string.pattern.base':
      'Password must contain at least one uppercase letter, one lowercase letter, and one number',
    'any.required': 'Password is required',
  });

const phoneSchema = Joi.string()
  .pattern(/^[6-9]\d{9}$/)
  .required()
  .messages({
    'string.pattern.base': 'Please provide a valid 10-digit Indian mobile number',
    'any.required': 'Phone number is required',
  });

const objectIdSchema = Joi.string()
  .pattern(/^[0-9a-fA-F]{24}$/)
  .required()
  .messages({
    'string.pattern.base': 'Invalid ID format',
    'any.required': 'ID is required',
  });

// ─── AUTH SCHEMAS ─────────────────────────────────────────────────────────────

export const registerSchema = Joi.object({
  email: emailSchema,
  password: passwordSchema,
  phone: phoneSchema,

  role: Joi.string()
    .valid('student', 'warden', 'admin', 'parent', 'security')
    .default('student')
    .messages({ 'any.only': 'Role must be one of: student, warden, admin, parent, security' }),

  name: Joi.string().min(2).max(100).trim()
    .when('role', { is: 'student', then: Joi.required(), otherwise: Joi.forbidden() })
    .messages({
      'string.min': 'Name must be at least 2 characters long',
      'string.max': 'Name cannot exceed 100 characters',
      'any.required': 'Name is required',
    }),

  firstName: Joi.string().min(2).max(50).trim()
    .when('role', {
      is: Joi.valid('warden', 'admin', 'security'),
      then: Joi.required(),
      otherwise: Joi.forbidden(),
    })
    .messages({
      'string.min': 'First name must be at least 2 characters long',
      'string.max': 'First name cannot exceed 50 characters',
      'any.required': 'First name is required',
    }),

  lastName: Joi.string().min(2).max(50).trim()
    .when('role', {
      is: Joi.valid('warden', 'admin', 'security'),
      then: Joi.required(),
      otherwise: Joi.forbidden(),
    })
    .messages({
      'string.min': 'Last name must be at least 2 characters long',
      'string.max': 'Last name cannot exceed 50 characters',
      'any.required': 'Last name is required',
    }),

  // ── Student-specific ────────────────────────────────────────────────────────
  // hostelBlock drives hostelType: A-D → boys, E-H → girls (derived on backend)
  hostelBlock: Joi.string()
    .valid(...ALL_BLOCKS)
    .when('role', { is: 'student', then: Joi.required(), otherwise: Joi.forbidden() })
    .messages({
      'any.only': `Hostel block must be one of: ${ALL_BLOCKS.join(', ')}`,
      'any.required': 'Hostel block is required for students',
    }),

  roomNumber: Joi.string()
    .pattern(/^\d{3}$/)
    .when('role', { is: 'student', then: Joi.required(), otherwise: Joi.forbidden() })
    .messages({
      'string.pattern.base': 'Room number must be a 3-digit number',
      'any.required': 'Room number is required for students',
    }),

  enrollmentNumber: Joi.string()
    .pattern(/^[A-Z0-9]{6,20}$/)
    .when('role', { is: 'student', then: Joi.required(), otherwise: Joi.forbidden() })
    .messages({
      'string.pattern.base': 'Enrollment number must be 6-20 alphanumeric characters',
      'any.required': 'Enrollment number is required for students',
    }),

  department: Joi.string()
    .when('role', { is: 'student', then: Joi.required(), otherwise: Joi.forbidden() })
    .messages({ 'any.required': 'Department is required for students' }),

  year: Joi.number().integer().min(2000).max(2100)
    .when('role', { is: 'student', then: Joi.required(), otherwise: Joi.forbidden() })
    .messages({
      'number.min': 'Year must be a valid academic year (e.g. 2025)',
      'number.max': 'Year must be a valid academic year (e.g. 2025)',
      'any.required': 'Academic year is required for students',
    }),

  parentContact: Joi.string()
    .pattern(/^[6-9]\d{9}$/)
    .when('role', { is: 'student', then: Joi.required(), otherwise: Joi.forbidden() })
    .messages({
      'string.pattern.base': 'Parent contact must be a valid 10-digit mobile number',
      'any.required': 'Parent contact is required for students',
    }),

  // ── Warden-specific ─────────────────────────────────────────────────────────
  // hostelType for warden is explicit (admin sets which hostel they manage)
  hostelType: Joi.string()
    .valid('boys', 'girls')
    .when('role', { is: 'warden', then: Joi.required(), otherwise: Joi.forbidden() })
    .messages({
      'any.only': 'Hostel type must be either boys or girls',
      'any.required': 'Hostel type is required for wardens',
    }),

  block: Joi.string().trim()
    .when('role', { is: 'warden', then: Joi.optional(), otherwise: Joi.forbidden() }),
});

export const registerInitialAdminSchema = Joi.object({
  email: emailSchema,
  password: passwordSchema,
  firstName: Joi.string().min(2).max(50).trim().required(),
  lastName:  Joi.string().min(2).max(50).trim().required(),
  phone: phoneSchema,
  secretKey: Joi.string().required().messages({ 'any.required': 'Secret key is required' }),
});

export const loginSchema = Joi.object({
  email: emailSchema,
  password: Joi.string().required().messages({ 'any.required': 'Password is required' }),
});

export const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required().messages({ 'any.required': 'Current password is required' }),
  newPassword: passwordSchema,
  confirmPassword: Joi.string()
    .valid(Joi.ref('newPassword'))
    .required()
    .messages({ 'any.only': 'Passwords do not match', 'any.required': 'Confirm password is required' }),
});

export const forgotPasswordSchema = Joi.object({ email: emailSchema });

export const resetPasswordSchema = Joi.object({
  token: Joi.string().required().messages({ 'any.required': 'Reset token is required' }),
  newPassword: passwordSchema,
  confirmPassword: Joi.string()
    .valid(Joi.ref('newPassword'))
    .required()
    .messages({ 'any.only': 'Passwords do not match', 'any.required': 'Confirm password is required' }),
});

export const verifyEmailSchema = Joi.object({
  email: emailSchema,
  verificationCode: Joi.string()
    .length(6)
    .pattern(/^\d{6}$/)
    .required()
    .messages({
      'string.length': 'Verification code must be 6 digits',
      'string.pattern.base': 'Verification code must contain only numbers',
      'any.required': 'Verification code is required',
    }),
});

export const resendVerificationEmailSchema = Joi.object({ email: emailSchema });

export const updateProfileSchema = Joi.object({
  firstName:  Joi.string().min(2).max(50).trim().optional(),
  lastName:   Joi.string().min(2).max(50).trim().optional(),
  phone:      Joi.string().pattern(/^[0-9]{10,15}$/).optional(),
  dateOfBirth: Joi.date().optional(),
  gender:     Joi.string().valid('male', 'female', 'other').optional(),
  bloodGroup: Joi.string().valid('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-').optional(),
  roomNumber: Joi.string().pattern(/^\d{3}$/).optional(),
  permanentAddress: Joi.object({
    street:  Joi.string().optional(),
    city:    Joi.string().optional(),
    state:   Joi.string().optional(),
    zipCode: Joi.string().optional(),
    country: Joi.string().optional(),
  }).optional(),
  emergencyContact: Joi.object({
    name:         Joi.string().optional(),
    phone:        Joi.string().pattern(/^[0-9]{10,15}$/).optional(),
    relationship: Joi.string().optional(),
  }).optional(),
}).min(1).messages({ 'object.min': 'At least one field must be provided for update' });

// ─── STUDENT SCHEMAS ──────────────────────────────────────────────────────────

export const studentIdSchema = Joi.object({ id: objectIdSchema });

export const searchStudentsSchema = Joi.object({
  query:       Joi.string().min(1).trim().optional(),
  // Allow any valid block A-H; controller will further restrict by role
  hostelBlock: Joi.string().valid(...ALL_BLOCKS).optional(),
  department:  Joi.string().optional(),
  year:        Joi.number().integer().min(2000).max(2100).optional(),
  yearOfStudy: Joi.number().integer().min(1).max(6).optional(),
  status:      Joi.string().valid('active', 'suspended', 'inactive').optional(),
  hostelType:  Joi.string().valid('boys', 'girls').optional(),
  page:        Joi.number().integer().min(1).default(1),
  limit:       Joi.number().integer().min(1).max(100).default(10),
  sortBy:      Joi.string().valid('name', 'enrollmentNumber', 'createdAt').default('name'),
  sortOrder:   Joi.string().valid('asc', 'desc').default('asc'),
});

export const suspendStudentSchema = Joi.object({
  reason: Joi.string().min(10).max(500).required().messages({
    'string.min': 'Reason must be at least 10 characters long',
    'string.max': 'Reason cannot exceed 500 characters',
    'any.required': 'Suspension reason is required',
  }),
  suspendedUntil: Joi.date().greater('now').optional().messages({
    'date.greater': 'Suspension end date must be in the future',
  }),
});

// ─── PAGINATION & QUERY SCHEMAS ───────────────────────────────────────────────

export const paginationSchema = Joi.object({
  page:      Joi.number().integer().min(1).default(1),
  limit:     Joi.number().integer().min(1).max(100).default(10),
  sortBy:    Joi.string().optional(),
  sortOrder: Joi.string().valid('asc', 'desc').default('asc'),
});

export const dateRangeSchema = Joi.object({
  startDate: Joi.date().iso().optional(),
  endDate:   Joi.date().iso().greater(Joi.ref('startDate')).optional().messages({
    'date.greater': 'End date must be after start date',
  }),
});

// ─── MANAGED USER CREATION ────────────────────────────────────────────────────

export const managedCreateSchema = Joi.object({
  role: Joi.string()
    .valid('student', 'parent', 'warden', 'security', 'admin', 'counsellor', 'hod')
    .required(),

  email: emailSchema,

  // Password is optional — server generates one when omitted
  password: passwordSchema.optional(),

  // ── Common name fields ────────────────────────────────────────────────────
  firstName: Joi.string().min(2).max(50).when('role', {
    is: Joi.valid('student', 'warden', 'security', 'admin', 'parent', 'counsellor', 'hod'),
    then: Joi.required(),
  }),
  lastName: Joi.string().min(2).max(50).when('role', {
    is: Joi.valid('student', 'warden', 'security', 'admin', 'parent', 'counsellor', 'hod'),
    then: Joi.required(),
  }),

  phone: Joi.string().pattern(/^[0-9]{10,15}$/).when('role', {
    is: Joi.valid('student', 'warden', 'security', 'admin', 'counsellor', 'hod'),
    then: Joi.required(),
    otherwise: Joi.optional(),
  }).messages({ 'string.pattern.base': 'Phone must be 10-15 digits' }),

  // ── Warden-specific ───────────────────────────────────────────────────────
  // hostelType required for warden so the system knows boys vs girls
  hostelType: Joi.string().valid('boys', 'girls').when('role', {
    is: 'warden',
    then: Joi.required(),
    otherwise: Joi.forbidden(),
  }),
  block: Joi.string().when('role', { is: 'warden', then: Joi.optional(), otherwise: Joi.forbidden() }),

  // ── Admin-specific ────────────────────────────────────────────────────────
  adminRole: Joi.string().when('role', { is: 'admin', then: Joi.required(), otherwise: Joi.forbidden() }),

  // Fields forbidden for security managed creation
  dateOfBirth:     Joi.forbidden(),
  gender:          Joi.forbidden(),
  joiningDate:     Joi.forbidden(),
  address:         Joi.forbidden(),
  emergencyContact: Joi.forbidden(),

  // ── Student-specific ──────────────────────────────────────────────────────
  student: Joi.object({
    rollNumber:  Joi.string().required(),
    course:      Joi.string().required(),
    year:        Joi.number().integer().min(2000).max(2100).required(),
    yearOfStudy: Joi.number().integer().min(1).max(6).required().messages({
      'any.required': 'Year of study is required',
      'number.base':  'Year of study must be a number',
      'number.min':   'Year of study must be at least 1',
      'number.max':   'Year of study cannot exceed 6',
    }),
    semester:   Joi.number().integer().min(1).max(12).required(),
    department: Joi.string().required(),

    // hostelBlock A-H → backend derives hostelType automatically
    hostelBlock: Joi.string().valid(...ALL_BLOCKS).required().messages({
      'any.only':    `Hostel block must be one of: ${ALL_BLOCKS.join(', ')}`,
      'any.required': 'Hostel block is required',
    }),

    // hostelType can be supplied but backend will always re-derive it from hostelBlock
    // Accept it here so the frontend doesn't get a 400, but treat it as informational
    hostelType: Joi.string().valid('boys', 'girls').optional(),

    roomNumber: Joi.string().required(),

    dateOfBirth: Joi.date().optional(),
    gender:      Joi.string().valid('male', 'female', 'other').optional(),
    bloodGroup:  Joi.string().optional(),

    parentDetails: Joi.object({
      fatherName:    Joi.string().optional(),
      motherName:    Joi.string().optional(),
      guardianPhone: Joi.string().pattern(/^[0-9]{10,15}$/).optional(),
      guardianEmail: Joi.string().email().optional(),
    }).optional(),

    permanentAddress: Joi.object({
      street:  Joi.string().min(1).required().messages({ 'any.required': 'Street is required' }),
      city:    Joi.string().min(1).required().messages({ 'any.required': 'City is required' }),
      state:   Joi.string().min(1).required().messages({ 'any.required': 'State is required' }),
      zipCode: Joi.string().min(3).required().messages({ 'any.required': 'ZIP Code is required' }),
      country: Joi.string().optional(),
    }).required(),
  }).when('role', { is: 'student', then: Joi.required(), otherwise: Joi.forbidden() }),

  // ── Counsellor-specific ───────────────────────────────────────────────────
  department: Joi.string().when('role', {
    is: 'counsellor',
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  // hostelType for counsellor — determines which hostel's students they can see
  counsellorHostelType: Joi.string().valid('boys', 'girls').when('role', {
    is: 'counsellor',
    then: Joi.optional(),
    otherwise: Joi.forbidden(),
  }),
  collegeHoursStart: Joi.string().pattern(/^\d{2}:\d{2}$/).when('role', {
    is: 'counsellor',
    then: Joi.optional(),
    otherwise: Joi.forbidden(),
  }),
  collegeHoursEnd: Joi.string().pattern(/^\d{2}:\d{2}$/).when('role', {
    is: 'counsellor',
    then: Joi.optional(),
    otherwise: Joi.forbidden(),
  }),

  // ── HOD-specific ──────────────────────────────────────────────────────────
  // HOD department is required; hostelType is optional (HOD may span boys+girls)
  hodDepartment: Joi.string().when('role', {
    is: 'hod',
    then: Joi.optional(),   // HOD department usually comes from 'department' field
    otherwise: Joi.forbidden(),
  }),
});

// Admin/Warden can update student parent details separately
export const updateStudentParentDetailsSchema = Joi.object({
  parentDetails: Joi.object({
    fatherName:    Joi.string().trim().optional(),
    motherName:    Joi.string().trim().optional(),
    guardianPhone: Joi.string().pattern(/^[0-9]{10,15}$/).optional(),
    guardianEmail: Joi.string().email().optional(),
  }).required().min(1).messages({
    'object.min': 'At least one parent detail field must be provided',
  }),
}).required();