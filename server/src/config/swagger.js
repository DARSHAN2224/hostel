import swaggerJsdoc from 'swagger-jsdoc';
import {config} from './config.js';

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Hostel Management System API',
    version: '1.0.0',
    description: `
      RESTful API for Hostel Management System
      
      ## Features
      - User Authentication (JWT with Access & Refresh Tokens)
      - Role-based Access Control (Student, Warden, Admin, Parent, Security)
      - Student Management
      - Outpass Request & Approval System
      - Email Notifications
      - Real-time Logging & Monitoring
      
      ## Authentication
      Most endpoints require authentication. Include the JWT access token in the Authorization header:
      \`\`\`
      Authorization: Bearer <access_token>
      \`\`\`
      
      ## Rate Limiting
      API requests are rate-limited:
      - General API: 100 requests per 15 minutes
      - Auth endpoints: 5 requests per 15 minutes
      - Password reset: 3 requests per hour
      - Email verification: 3 requests per hour
    `,
    contact: {
      name: 'API Support',
      email: 'support@hostelmanagement.com',
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT',
    },
  },
  servers: [
    {
      url: `http://localhost:${config.port}/api`,
      description: 'Development server',
    },
    {
      url: config.clientUrl ? `${config.clientUrl}/api` : 'http://localhost:5000/api',
      description: 'Production server',
    },
  ],
  tags: [
    {
      name: 'Authentication',
      description: 'User authentication and authorization endpoints',
    },
    {
      name: 'Students',
      description: 'Student management endpoints',
    },
    {
      name: 'HOD',
      description: 'Head of Department operations and management',
    },
    {
      name: 'Outpass',
      description: 'Outpass request creation, approval, and tracking',
    },
    {
      name: 'Users',
      description: 'User creation and management by admins and wardens',
    },
    {
      name: 'Health',
      description: 'Health check and monitoring endpoints',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter your JWT access token',
      },
      CookieAuth: {
        type: 'apiKey',
        in: 'cookie',
        name: 'refreshToken',
        description: 'Refresh token stored in HTTP-only cookie',
      },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          statusCode: {
            type: 'number',
            example: 400,
          },
          data: {
            type: 'object',
            nullable: true,
          },
          message: {
            type: 'string',
            example: 'Error message',
          },
          success: {
            type: 'boolean',
            example: false,
          },
          errors: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                field: {
                  type: 'string',
                },
                message: {
                  type: 'string',
                },
              },
            },
          },
        },
      },
      User: {
        type: 'object',
        properties: {
          _id: {
            type: 'string',
            example: '60d5ec49f1b2c72b8c8e4f1a',
          },
          name: {
            type: 'string',
            example: 'John Doe',
          },
          email: {
            type: 'string',
            example: 'john.doe@example.com',
          },
          role: {
            type: 'string',
            enum: ['student', 'warden', 'admin', 'parent', 'security'],
            example: 'student',
          },
          isEmailVerified: {
            type: 'boolean',
            example: true,
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
          },
        },
      },
      Student: {
        allOf: [
          { $ref: '#/components/schemas/User' },
          {
            type: 'object',
            properties: {
              enrollmentNumber: {
                type: 'string',
                example: 'CS2021001',
              },
              hostelBlock: {
                type: 'string',
                enum: ['A', 'B', 'C', 'D', 'E'],
                example: 'A',
              },
              roomNumber: {
                type: 'string',
                example: '101',
              },
              department: {
                type: 'string',
                enum: ['CSE', 'ECE', 'ME', 'CE', 'EE', 'IT'],
                example: 'CSE',
              },
              year: {
                type: 'number',
                example: 2,
              },
              phone: {
                type: 'string',
                example: '9876543210',
              },
              parentContact: {
                type: 'string',
                example: '9876543211',
              },
              status: {
                type: 'string',
                enum: ['active', 'suspended', 'inactive'],
                example: 'active',
              },
            },
          },
        ],
      },
    },
    responses: {
      UnauthorizedError: {
        description: 'Access token is missing or invalid',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error',
            },
            example: {
              statusCode: 401,
              data: null,
              message: 'Unauthorized - Please login to access this resource',
              success: false,
            },
          },
        },
      },
      ForbiddenError: {
        description: 'User does not have permission to access this resource',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error',
            },
            example: {
              statusCode: 403,
              data: null,
              message: 'Forbidden - You do not have permission to access this resource',
              success: false,
            },
          },
        },
      },
      NotFoundError: {
        description: 'Resource not found',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error',
            },
            example: {
              statusCode: 404,
              data: null,
              message: 'Resource not found',
              success: false,
            },
          },
        },
      },
      ValidationError: {
        description: 'Validation error',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error',
            },
            example: {
              statusCode: 400,
              data: null,
              message: 'Validation Error',
              success: false,
              errors: [
                {
                  field: 'email',
                  message: 'Please provide a valid email address',
                },
              ],
            },
          },
        },
      },
      RateLimitError: {
        description: 'Too many requests',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error',
            },
            example: {
              statusCode: 429,
              data: null,
              message: 'Too many requests from this IP, please try again later.',
              success: false,
              retryAfter: 900,
            },
          },
        },
      },
    },
  },
  security: [
    {
      bearerAuth: [],
    },
  ],
};

const options = {
  swaggerDefinition,
  // Path to the API docs (routes with JSDoc comments)
  apis: [
    './src/routes/*.js',
    './src/controllers/*.js',
    './src/models/*.js',
    './src/docs/*.js',
  ],
};

export const swaggerSpecs = swaggerJsdoc(options);
