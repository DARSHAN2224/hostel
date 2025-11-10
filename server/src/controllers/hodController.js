
import jwt from 'jsonwebtoken';
import { config } from '../config/config.js';
import Hod from '../models/Hod.js';
import bcrypt from 'bcryptjs';

const hodController = {
  // Create HOD (Super Admin only)
  async createHod(req, res) {
    try {
      if (req.user.role !== 'super_admin') {
        return res.status(403).json({ message: 'Forbidden' });
      }
      const { name, email, password, department, phone } = req.body;
      const existing = await Hod.findOne({ email });
      if (existing) {
        return res.status(400).json({ message: 'HOD already exists' });
      }
      const hashedPassword = await bcrypt.hash(password, 10);
      const hod = new Hod({
        name,
        email,
        password: hashedPassword,
        department,
        phone,
        createdBy: req.user._id
      });
      await hod.save();
      res.status(201).json({ message: 'HOD created', hod: { name, email, department, phone } });
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  },

  // Edit HOD (Super Admin only)
  async editHod(req, res) {
    try {
      if (req.user.role !== 'super_admin') {
        return res.status(403).json({ message: 'Forbidden' });
      }
      const { hodId } = req.params;
      const { name, email, department, phone } = req.body;
      const hod = await Hod.findById(hodId);
      if (!hod) {
        return res.status(404).json({ message: 'HOD not found' });
      }
      hod.name = name || hod.name;
      hod.email = email || hod.email;
      hod.department = department || hod.department;
      hod.phone = phone || hod.phone;
      hod.updatedBy = req.user._id;
      hod.updatedAt = Date.now();
      await hod.save();
      res.json({ message: 'HOD updated', hod: { name: hod.name, email: hod.email, department: hod.department, phone: hod.phone } });
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  },

  // HOD login
  async loginHod(req, res) {
    try {
      const { email, password } = req.body;
      const hod = await Hod.findOne({ email });
      if (!hod) {
        return res.status(404).json({ message: 'Invalid credentials' });
      }
      const valid = await bcrypt.compare(password, hod.password);
      if (!valid) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }
      // Generate JWT token
      const token = jwt.sign({ id: hod._id, role: 'hod', department: hod.department }, config.jwtSecret, { expiresIn: '1h' });
      res.json({
        message: 'Login successful',
        token,
        hod: {
          id: hod._id,
          name: hod.name,
          email: hod.email,
          department: hod.department,
          phone: hod.phone
        }
      });
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  },

  // Get HOD profile
  async getHodProfile(req, res) {
    try {
      if (req.user.role !== 'hod') {
        return res.status(403).json({ message: 'Access denied' });
      }
      const hod = await Hod.findById(req.user.id).select('-password');
      if (!hod) {
        return res.status(404).json({ message: 'HOD not found' });
      }
      res.json({ hod });
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  },

  // Get all HODs (Super Admin only)
  async getAllHods(req, res) {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Forbidden' });
      }
      const hods = await Hod.find().select('-password');
      res.json({ hods, count: hods.length });
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  },

  // Delete HOD (Super Admin only)
  async deleteHod(req, res) {
    try {
      if (req.user.role !== 'super_admin') {
        return res.status(403).json({ message: 'Forbidden' });
      }
      const { hodId } = req.params;
      const hod = await Hod.findByIdAndDelete(hodId);
      if (!hod) {
        return res.status(404).json({ message: 'HOD not found' });
      }
      res.json({ message: 'HOD deleted successfully' });
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  },

  // Get students by department (HOD only)
  async getStudentsByDepartment(req, res) {
    try {
      if (req.user.role !== 'hod') {
        return res.status(403).json({ message: 'Access denied' });
      }
      const hod = await Hod.findById(req.user.id);
      if (!hod) {
        return res.status(404).json({ message: 'HOD not found' });
      }
      
      const Student = (await import('../models/Student.js')).default;
      const students = await Student.find({ department: hod.department, hodId: hod._id }).select('-password');
      res.json({ students, count: students.length, department: hod.department });
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  }
};

export default hodController;
