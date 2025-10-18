import request from 'supertest';
import app from '../../src/app.js';
import { Student } from '../../src/models/index.js';

describe('Authentication API', () => {
  describe('POST /api/auth/register', () => {
    const validStudent = {
      name: 'John Doe',
      email: 'john.doe@example.com',
      password: 'Password123',
      phone: '9876543210',
      role: 'student',
      hostelBlock: 'A',
      roomNumber: '101',
      enrollmentNumber: 'CS2021001',
      department: 'CSE',
      year: 2,
      parentContact: '9876543211',
    };

    it('should register a new student successfully', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send(validStudent)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('registered successfully');
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data.user.email).toBe(validStudent.email);
      expect(response.body.data.user).not.toHaveProperty('password');
    });

    it('should fail with invalid email', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({ ...validStudent, email: 'invalid-email' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation Error');
    });

    it('should fail with weak password', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({ ...validStudent, password: 'weak' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should fail with duplicate email', async () => {
      // Register first student
      await request(app)
        .post('/api/auth/register')
        .send(validStudent)
        .expect(201);

      // Try to register with same email
      const response = await request(app)
        .post('/api/auth/register')
        .send(validStudent)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should fail without required student fields', async () => {
      const { hostelBlock, ...incompleteStudent } = validStudent;
      
      const response = await request(app)
        .post('/api/auth/register')
        .send(incompleteStudent)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/login', () => {
    const studentCredentials = {
      email: 'john.doe@example.com',
      password: 'Password123',
    };

    beforeEach(async () => {
      // Register a student before login tests
      await request(app)
        .post('/api/auth/register')
        .send({
          name: 'John Doe',
          email: studentCredentials.email,
          password: studentCredentials.password,
          phone: '9876543210',
          role: 'student',
          hostelBlock: 'A',
          roomNumber: '101',
          enrollmentNumber: 'CS2021001',
          department: 'CSE',
          year: 2,
          parentContact: '9876543211',
        });
    });

    it('should login successfully with correct credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send(studentCredentials)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data).toHaveProperty('user');
      expect(response.headers['set-cookie']).toBeDefined();
    });

    it('should fail with incorrect password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ ...studentCredentials, password: 'WrongPassword123' })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should fail with non-existent email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'nonexistent@example.com', password: 'Password123' })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should fail with invalid email format', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'invalid-email', password: 'Password123' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/auth/profile', () => {
    let accessToken;

    beforeEach(async () => {
      // Register and login
      await request(app)
        .post('/api/auth/register')
        .send({
          name: 'John Doe',
          email: 'john.doe@example.com',
          password: 'Password123',
          phone: '9876543210',
          role: 'student',
          hostelBlock: 'A',
          roomNumber: '101',
          enrollmentNumber: 'CS2021001',
          department: 'CSE',
          year: 2,
          parentContact: '9876543211',
        });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({ email: 'john.doe@example.com', password: 'Password123' });

      accessToken = loginResponse.body.data.accessToken;
    });

    it('should get user profile with valid token', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data.user.email).toBe('john.doe@example.com');
    });

    it('should fail without authorization token', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should fail with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });
});
