# Hostel Management System - Backend API

A production-ready RESTful API for managing hostel operations, built with Node.js, Express, and MongoDB.

## ✨ Features

### Core Features
- 🔐 **JWT Authentication** - Access & refresh token system
- 👥 **Role-Based Access Control** - Student, Warden, Admin, Parent, Security
- 📧 **Email Notifications** - Verification, password reset, notifications
- 🏢 **Student Management** - CRUD operations with filtering & search
- 🔒 **Security Hardened** - Helmet.js, CORS, rate limiting
- ✅ **Input Validation** - Joi schema validation on all endpoints
- 📊 **Request Logging** - Winston + Morgan for comprehensive logging
- 🏥 **Health Monitoring** - Health check endpoints
- 📚 **API Documentation** - Interactive Swagger UI

### Industry Standards Implemented
- ✅ Input validation (Joi)
- ✅ Rate limiting (8 different limiters)
- ✅ Security headers (Helmet with 15+ headers)
- ✅ Request logging (Winston + Morgan)
- ✅ Health check endpoints
- ✅ CORS configuration
- ✅ API documentation (Swagger/OpenAPI 3.0)
- ✅ Unit & integration tests (Jest + Supertest)
- ✅ Error handling (Custom error classes)
- ✅ Standardized responses (ApiResponse class)

## 🚀 Quick Start

### Prerequisites
- **Node.js** v18+ ([Download](https://nodejs.org/))
- **MongoDB** v6+ ([Download](https://www.mongodb.com/try/download/community))
- **npm** (comes with Node.js)

### Installation

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Set up environment variables**
   ```bash
   # Copy example file
   cp .env.example .env
   
   # Edit .env with your configuration
   ```

3. **Configure environment** (see `.env` file)
   - Set MongoDB connection string
   - Set JWT secrets
   - Configure Gmail SMTP for emails

### Development

```bash
# Start development server (auto-restart on changes)
npm run dev

# Start with debugging
npm run dev:debug
```

Server will start at: **http://localhost:5000**

### Production

```bash
# Start production server
npm start
```

## 📡 API Endpoints

### Health & Documentation
- **Health Check**: `GET /api/health`
- **API Documentation**: `GET /api-docs` (Swagger UI)

### Authentication (`/api/v1/auth`)
```
POST   /register              # Register new user
POST   /login                 # User login
POST   /logout                # User logout
POST   /refresh               # Refresh access token
GET    /me                    # Get current user profile
PUT    /profile               # Update user profile
PUT    /change-password       # Change password
POST   /verify-email          # Verify email address
POST   /resend-verification   # Resend verification email
POST   /forgot-password       # Request password reset
POST   /reset-password        # Reset password with token
GET    /hostel-blocks         # Get available hostel blocks
```

### Students (`/api/v1/students`)
```
POST   /register              # Register student
POST   /login                 # Student login
POST   /logout                # Student logout
GET    /profile               # Get student profile
PATCH  /profile               # Update student profile
POST   /change-password       # Change password
GET    /                      # Get all students (Admin/Warden)
GET    /:id                   # Get student by ID (Admin/Warden)
GET    /search                # Search students (Admin/Warden)
GET    /statistics            # Get student statistics (Admin/Warden)
POST   /:id/suspend           # Suspend student (Admin/Warden)
POST   /:id/activate          # Activate student (Admin/Warden)
GET    /can-request-outpass   # Check outpass eligibility
```

For complete API documentation, visit **http://localhost:5000/api-docs** after starting the server.

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm test -- --coverage
```

## 📊 Logging

```bash
# View all logs in real-time
npm run logs

# View error logs only
npm run logs:error

# Clear all log files
npm run clear:logs
```

Log files are stored in `logs/`:
- `combined.log` - All logs
- `error.log` - Error logs only
- `http.log` - HTTP request logs

## 🔧 Available Scripts

```bash
npm start              # Start production server
npm run dev            # Start development server with auto-restart
npm run dev:debug      # Start with debugging enabled
npm test               # Run tests with coverage
npm run test:watch     # Run tests in watch mode
npm run lint           # Check code for errors
npm run lint:fix       # Auto-fix linting errors
npm run logs           # Tail combined logs
npm run logs:error     # Tail error logs
npm run clear:logs     # Clear all log files
npm run db:health      # Check database health
npm run validate:env   # Validate environment variables
```

## 📁 Project Structure

```
server/
├── src/
│   ├── app.js                    # Express app setup
│   ├── server.js                 # Server entry point
│   ├── config/                   # Configuration files
│   │   ├── config.js             # Environment configuration
│   │   ├── logger.js             # Winston logger setup
│   │   ├── security.js           # Security middleware config
│   │   └── swagger.js            # Swagger/OpenAPI config
│   ├── controllers/              # Request handlers
│   │   ├── authController.js
│   │   └── studentController.js
│   ├── db/                       # Database configuration
│   │   └── database.js
│   ├── middleware/               # Custom middleware
│   │   ├── auth.js               # JWT authentication
│   │   ├── errorHandler.js       # Global error handling
│   │   ├── rateLimiter.js        # Rate limiting
│   │   ├── security.js           # Security middleware
│   │   └── validation.js         # Joi validation schemas
│   ├── models/                   # Mongoose models
│   │   ├── Student.js
│   │   ├── Admin.js
│   │   ├── Warden.js
│   │   └── ...
│   ├── repositories/             # Data access layer
│   │   ├── BaseRepository.js
│   │   └── StudentRepository.js
│   ├── routes/                   # API routes
│   │   ├── auth.js
│   │   ├── students.js
│   │   └── health.js
│   ├── services/                 # Business logic
│   │   ├── emailService.js
│   │   └── StudentService.js
│   └── utils/                    # Utility functions
│       ├── ApiResponse.js        # Standardized responses
│       ├── asyncHandler.js       # Async error wrapper
│       ├── customErrors.js       # Custom error classes
│       ├── email.js              # Email utility
│       ├── emailTemplates.js     # Email HTML templates
│       └── logger.js             # Winston logger
├── tests/                        # Test files
│   ├── setup.js                  # Test configuration
│   ├── integration/              # Integration tests
│   └── unit/                     # Unit tests
├── logs/                         # Log files (auto-generated)
├── docs/                         # Documentation
│   ├── README.md                 # Documentation index
│   ├── ARCHITECTURE.md           # System architecture
│   ├── EMAIL_SERVICE.md          # Email service guide
│   ├── GETTING_STARTED.md        # Detailed setup guide
│   ├── IMPLEMENTATION_SUMMARY.md # Features summary
│   └── QUICK_REFERENCE.md        # Quick reference
├── scripts/                      # Utility scripts
│   ├── checkDbHealth.js
│   └── validateEnv.js
├── .env.example                  # Environment variables template
├── jest.config.js                # Jest configuration
└── package.json                  # Dependencies and scripts
```

## 🔐 Security Features

- **Helmet.js** - Sets 15+ security headers
- **CORS** - Configurable cross-origin resource sharing
- **Rate Limiting** - 8 different rate limiters for various endpoints
- **Input Validation** - Joi schema validation on all inputs
- **Password Hashing** - bcrypt with salt rounds
- **JWT Tokens** - Short-lived access tokens + refresh tokens
- **HTTP-only Cookies** - Secure refresh token storage
- **Email Verification** - Verify user email addresses
- **Role-Based Access Control** - Fine-grained permissions

## 📊 Rate Limits

| Endpoint Type | Limit | Window |
|--------------|-------|--------|
| General API | 100 requests | 15 minutes |
| Authentication | 5 requests | 15 minutes |
| Password Reset | 3 requests | 1 hour |
| Email Verification | 3 requests | 1 hour |
| Account Creation | 3 accounts | 24 hours |
| Read Operations | 200 requests | 15 minutes |
| Write Operations | 30 requests | 15 minutes |

## 🌍 Environment Variables

Create a `.env` file in the server directory:

```env
# Server
NODE_ENV=development
PORT=5000

# Database
MONGODB_URI=mongodb://localhost:27017/hostel_management

# JWT
JWT_SECRET=your-jwt-secret-key
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Email (Gmail SMTP)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-gmail-app-password
EMAIL_FROM=Hostel Management <noreply@hostel.com>

# Client
CLIENT_URL=http://localhost:5173

# Cookie
COOKIE_SECRET=your-cookie-secret
```

## 📚 Documentation

Comprehensive documentation is available in the `docs/` folder:

- **[Getting Started](./docs/GETTING_STARTED.md)** - Detailed setup guide
- **[Architecture](./docs/ARCHITECTURE.md)** - System design and patterns
- **[Email Service](./docs/EMAIL_SERVICE.md)** - Email configuration and usage
- **[Quick Reference](./docs/QUICK_REFERENCE.md)** - Common commands and endpoints
- **[Implementation Summary](./docs/IMPLEMENTATION_SUMMARY.md)** - What's included

Or visit the interactive API documentation at **http://localhost:5000/api-docs** when the server is running.

## 🛠️ Tech Stack

- **Runtime**: Node.js v18+
- **Framework**: Express.js 5.x
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (jsonwebtoken)
- **Validation**: Joi
- **Logging**: Winston + Morgan
- **Testing**: Jest + Supertest
- **Documentation**: Swagger/OpenAPI 3.0
- **Security**: Helmet, CORS, express-rate-limit
- **Email**: Nodemailer (Gmail SMTP)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License.

## 👥 Team

Backend API developed with ❤️ by the Hostel Management Team

---

**Need Help?** Check the [documentation](./docs/) or visit [http://localhost:5000/api-docs](http://localhost:5000/api-docs) for interactive API documentation.

