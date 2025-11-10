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
      abortEarly: false, // Return all errors, not just the first one
      stripUnknown: true, // Remove unknown keys
      convert: true, // Type conversion
    });

    if (error) {
      const errorMessages = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message.replace(/"/g, ''),
      }));

      // Log validation failure with details
      const maskedData = { ...req[property] };
      if (maskedData.password) maskedData.password = '***MASKED***';
      if (maskedData.currentPassword) maskedData.currentPassword = '***MASKED***';
      if (maskedData.newPassword) maskedData.newPassword = '***MASKED***';
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

      // Return structured validation errors in the `data` field so clients can show details
      return res.status(400).json(
        new ApiResponse(400, { errors: errorMessages }, 'Validation Error')
      );
    }

    // Replace request data with validated and sanitized data
    req[property] = value;
    next();
  };
};

// ==================== COMMON VALIDATION SCHEMAS ====================

// Email validation
const emailSchema = Joi.string()
  .email({ minDomainSegments: 2 })
  .lowercase()
  .trim()
  .required()
  .messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required',
  });

// Password validation (8-128 chars, at least one uppercase, one lowercase, one number)
const passwordSchema = Joi.string()
  .min(8)
  .max(128)
  .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
  .required()
  .messages({
    'string.min': 'Password must be at least 8 characters long',
    'string.max': 'Password cannot exceed 128 characters',
    'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
    'any.required': 'Password is required',
  });

// Phone number validation (Indian format)
const phoneSchema = Joi.string()
  .pattern(/^[6-9]\d{9}$/)
  .required()
  .messages({
    'string.pattern.base': 'Please provide a valid 10-digit Indian mobile number',
    'any.required': 'Phone number is required',
  });

// MongoDB ObjectId validation
const objectIdSchema = Joi.string()
  .pattern(/^[0-9a-fA-F]{24}$/)
  .required()
  .messages({
    'string.pattern.base': 'Invalid ID format',
    'any.required': 'ID is required',
  });

// ==================== AUTH VALIDATION SCHEMAS ====================

export const registerSchema = Joi.object({
  // Common fields for all roles
  email: emailSchema,
  password: passwordSchema,
  phone: phoneSchema,
  
  role: Joi.string()
    .valid('student', 'warden', 'admin', 'parent', 'security')
    .default('student')
    .messages({
      'any.only': 'Role must be one of: student, warden, admin, parent, security',
    }),
  
  // Student fields (name is single field)
  name: Joi.string()
    .min(2)
    .max(100)
    .trim()
    .when('role', {
      is: 'student',
      then: Joi.required(),
      otherwise: Joi.forbidden(),
    })
    .messages({
      'string.min': 'Name must be at least 2 characters long',
      'string.max': 'Name cannot exceed 100 characters',
      'any.required': 'Name is required',
    }),
  
  // Warden/Admin/Staff fields (firstName + lastName)
  firstName: Joi.string()
    .min(2)
    .max(50)
    .trim()
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
  
  lastName: Joi.string()
    .min(2)
    .max(50)
    .trim()
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
  
  // Student-specific fields
  hostelBlock: Joi.string()
    .valid('A', 'B', 'C', 'D', 'E')
    .when('role', {
      is: 'student',
      then: Joi.required(),
      otherwise: Joi.forbidden(),
    })
    .messages({
      'any.only': 'Hostel block must be one of: A, B, C, D, E',
      'any.required': 'Hostel block is required for students',
    }),
  
  roomNumber: Joi.string()
    .pattern(/^\d{3}$/)
    .when('role', {
      is: 'student',
      then: Joi.required(),
      otherwise: Joi.forbidden(),
    })
    .messages({
      'string.pattern.base': 'Room number must be a 3-digit number',
      'any.required': 'Room number is required for students',
    }),
  
  enrollmentNumber: Joi.string()
    .pattern(/^[A-Z0-9]{6,20}$/)
    .when('role', {
      is: 'student',
      then: Joi.required(),
      otherwise: Joi.forbidden(),
    })
    .messages({
      'string.pattern.base': 'Enrollment number must be 6-20 alphanumeric characters',
      'any.required': 'Enrollment number is required for students',
    }),
  
  department: Joi.string()
    .valid('CSE', 'ECE', 'ME', 'CE', 'EE', 'IT')
    .when('role', {
      is: 'student',
      then: Joi.required(),
      otherwise: Joi.forbidden(),
    })
    .messages({
      'any.only': 'Department must be one of: CSE, ECE, ME, CE, EE, IT',
      'any.required': 'Department is required for students',
    }),
  
  year: Joi.number()
    .integer()
    .min(1)
    .max(4)
    .when('role', {
      is: 'student',
      then: Joi.required(),
      otherwise: Joi.forbidden(),
    })
    .messages({
      'number.min': 'Year must be between 1 and 4',
      'number.max': 'Year must be between 1 and 4',
      'any.required': 'Year is required for students',
    }),
  
  parentContact: Joi.string()
    .pattern(/^[6-9]\d{9}$/)
    .when('role', {
      is: 'student',
      then: Joi.required(),
      otherwise: Joi.forbidden(),
    })
    .messages({
      'string.pattern.base': 'Parent contact must be a valid 10-digit mobile number',
      'any.required': 'Parent contact is required for students',
    }),
  
  // Warden-specific fields
  hostelType: Joi.string()
    .valid('boys', 'girls')
    .when('role', {
      is: 'warden',
      then: Joi.required(),
      otherwise: Joi.forbidden(),
    })
    .messages({
      'any.only': 'Hostel type must be either boys or girls',
      'any.required': 'Hostel type is required for wardens',
    }),
  
  block: Joi.string()
    .trim()
    .when('role', {
      is: 'warden',
      then: Joi.optional(),
      otherwise: Joi.forbidden(),
    })
    .messages({
      'any.only': 'Block must be a valid hostel block',
    }),
});

export const registerInitialAdminSchema = Joi.object({
  email: emailSchema,
  password: passwordSchema,
  firstName: Joi.string().min(2).max(50).trim().required().messages({
    'string.min': 'First name must be at least 2 characters',
    'string.max': 'First name cannot exceed 50 characters',
    'any.required': 'First name is required',
  }),
  lastName: Joi.string().min(2).max(50).trim().required().messages({
    'string.min': 'Last name must be at least 2 characters',
    'string.max': 'Last name cannot exceed 50 characters',
    'any.required': 'Last name is required',
  }),
  phone: phoneSchema,
  secretKey: Joi.string().required().messages({
    'any.required': 'Secret key is required',
  }),
});

export const loginSchema = Joi.object({
  email: emailSchema,
  password: Joi.string().required().messages({
    'any.required': 'Password is required',
  }),
});

export const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required().messages({
    'any.required': 'Current password is required',
  }),
  newPassword: passwordSchema,
  confirmPassword: Joi.string()
    .valid(Joi.ref('newPassword'))
    .required()
    .messages({
      'any.only': 'Passwords do not match',
      'any.required': 'Confirm password is required',
    }),
});

export const forgotPasswordSchema = Joi.object({
  email: emailSchema,
});

export const resetPasswordSchema = Joi.object({
  token: Joi.string().required().messages({
    'any.required': 'Reset token is required',
  }),
  newPassword: passwordSchema,
  confirmPassword: Joi.string()
    .valid(Joi.ref('newPassword'))
    .required()
    .messages({
      'any.only': 'Passwords do not match',
      'any.required': 'Confirm password is required',
    }),
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

export const resendVerificationEmailSchema = Joi.object({
  email: emailSchema,
});

export const updateProfileSchema = Joi.object({
  // Basic profile fields
  firstName: Joi.string().min(2).max(50).trim().optional(),
  lastName: Joi.string().min(2).max(50).trim().optional(),
  phone: Joi.string().pattern(/^[0-9]{10,15}$/).optional(),
  
  // Student-specific fields
  dateOfBirth: Joi.date().optional(),
  gender: Joi.string().valid('male', 'female', 'other').optional(),
  bloodGroup: Joi.string().valid('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-').optional(),
  
  // Hostel info (students can update room)
  roomNumber: Joi.string().pattern(/^\d{3}$/).optional(),
  
  // NOTE: parentDetails is NOT allowed in student profile updates
  // It can only be updated by admin/warden and will auto-create/update Parent model
  
  // Address
  permanentAddress: Joi.object({
    street: Joi.string().optional(),
    city: Joi.string().optional(),
    state: Joi.string().optional(),
    zipCode: Joi.string().optional(),
    country: Joi.string().optional(),
  }).optional(),
  
  // Emergency contact
  emergencyContact: Joi.object({
    name: Joi.string().optional(),
    phone: Joi.string().pattern(/^[0-9]{10,15}$/).optional(),
    relationship: Joi.string().optional(),
  }).optional(),
}).min(1).messages({
  'object.min': 'At least one field must be provided for update',
});

// ==================== STUDENT VALIDATION SCHEMAS ====================

export const studentIdSchema = Joi.object({
  id: objectIdSchema,
});

export const searchStudentsSchema = Joi.object({
  query: Joi.string().min(1).trim().optional(),
  hostelBlock: Joi.string().valid('A', 'B', 'C', 'D', 'E').optional(),
  department: Joi.string().valid('CSE', 'ECE', 'ME', 'CE', 'EE', 'IT').optional(),
  year: Joi.number().integer().min(1).max(4).optional(),
  status: Joi.string().valid('active', 'suspended', 'inactive').optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  sortBy: Joi.string().valid('name', 'enrollmentNumber', 'createdAt').default('name'),
  sortOrder: Joi.string().valid('asc', 'desc').default('asc'),
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

// ==================== PAGINATION & QUERY SCHEMAS ====================

export const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  sortBy: Joi.string().optional(),
  sortOrder: Joi.string().valid('asc', 'desc').default('asc'),
});

export const dateRangeSchema = Joi.object({
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().greater(Joi.ref('startDate')).optional().messages({
    'date.greater': 'End date must be after start date',
  }),
});

// ==================== MANAGED USER CREATION ====================

export const managedCreateSchema = Joi.object({
  role: Joi.string().valid('student', 'parent', 'warden', 'security', 'admin').required(),
  email: emailSchema,
  password: passwordSchema,

  // Common fields
  firstName: Joi.string().min(2).max(50).when('role', {
    is: Joi.valid('student', 'warden', 'security', 'admin', 'parent'),
    then: Joi.required(),
  }),
  lastName: Joi.string().min(2).max(50).when('role', {
    is: Joi.valid('student', 'warden', 'security', 'admin', 'parent'),
    then: Joi.required(),
  }),
  phone: phoneSchema.when('role', {
    is: Joi.valid('student', 'warden', 'security', 'admin'),
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),

  // Warden-specific
  hostelType: Joi.string().valid('boys', 'girls').when('role', { is: 'warden', then: Joi.required(), otherwise: Joi.forbidden() }),
  block: Joi.string().when('role', { is: 'warden', then: Joi.optional(), otherwise: Joi.forbidden() }),

  // Admin-specific
  adminRole: Joi.string().when('role', { is: 'admin', then: Joi.required(), otherwise: Joi.forbidden() }),

  // Security-specific (required by model)
  employeeId: Joi.string().when('role', { is: 'security', then: Joi.required(), otherwise: Joi.forbidden() }),
  dateOfBirth: Joi.date().when('role', { is: 'security', then: Joi.required(), otherwise: Joi.forbidden() }),
  gender: Joi.string().valid('male', 'female', 'other').when('role', { is: 'security', then: Joi.required(), otherwise: Joi.forbidden() }),
  joiningDate: Joi.date().when('role', { is: 'security', then: Joi.required(), otherwise: Joi.forbidden() }),
  designation: Joi.string().when('role', { is: 'security', then: Joi.required(), otherwise: Joi.forbidden() }),
  currentShift: Joi.string().when('role', { is: 'security', then: Joi.required(), otherwise: Joi.forbidden() }),
  address: Joi.object({
    city: Joi.string().required(),
    state: Joi.string().required(),
    zipCode: Joi.string().required(),
    street: Joi.string().optional(),
    country: Joi.string().optional(),
  }).when('role', { is: 'security', then: Joi.required(), otherwise: Joi.forbidden() }),
  emergencyContact: Joi.object({
    name: Joi.string().required(),
    phone: Joi.string().pattern(/^[0-9]{10,15}$/).required(),
    relationship: Joi.string().required(),
  }).when('role', { is: 'security', then: Joi.required(), otherwise: Joi.forbidden() }),

  // Student-specific (minimal required for creation, can complete profile later)
  student: Joi.object({
    rollNumber: Joi.string().required(),
    course: Joi.string().required(),
    year: Joi.number().integer().min(1).max(6).required(),
    semester: Joi.number().integer().min(1).max(12).required(),
    department: Joi.string().required(),
    hostelType: Joi.string().valid('boys', 'girls').required(),
    hostelBlock: Joi.string().required(),
    roomNumber: Joi.string().required(),
    // Optional fields for profile completion
    dateOfBirth: Joi.date().optional(),
    gender: Joi.string().valid('male', 'female', 'other').optional(),
    bloodGroup: Joi.string().optional(),
    parentDetails: Joi.object({
      fatherName: Joi.string().optional(),
      motherName: Joi.string().optional(),
      guardianPhone: Joi.string().pattern(/^[0-9]{10,15}$/).optional(),
      guardianEmail: Joi.string().email().optional(),
    }).optional(),
    permanentAddress: Joi.object({
      city: Joi.string().optional(),
      state: Joi.string().optional(),
      zipCode: Joi.string().optional(),
      street: Joi.string().optional(),
      country: Joi.string().optional(),
    }).optional(),
  }).when('role', { is: 'student', then: Joi.required(), otherwise: Joi.forbidden() }),
})

// Admin/Warden can update student parent details (separate from student profile update)
export const updateStudentParentDetailsSchema = Joi.object({
  parentDetails: Joi.object({
    fatherName: Joi.string().trim().optional(),
    motherName: Joi.string().trim().optional(),
    guardianPhone: Joi.string().pattern(/^[0-9]{10,15}$/).optional(),
    guardianEmail: Joi.string().email().optional(),
  }).required().min(1).messages({
    'object.min': 'At least one parent detail field must be provided',
  }),
}).required()

