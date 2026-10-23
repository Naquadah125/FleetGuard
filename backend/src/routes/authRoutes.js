import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { getIsMongoConnected, memoryStore } from '../db.js';
import { requireAuth, JWT_SECRET } from '../middleware/authMiddleware.js';

const router = express.Router();

/**
 * POST /api/auth/register
 */
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Missing required fields: name, email, password' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const role = req.body.role || (email.toLowerCase().includes('admin') ? 'ADMIN' : 'USER');

    let organizationId = null;
    let organizationName = null;

    if (role === 'ADMIN') {
      organizationId = req.body.organizationId || `org_${Date.now()}`;
      organizationName = (req.body.orgName || req.body.organizationName || 'testcty').trim();
    } else if (req.body.organizationId) {
      organizationId = req.body.organizationId;
      organizationName = req.body.organizationName || null;
    } else {
      // Driver or User self-registered independently
      organizationId = null;
      organizationName = null;
    }

    if (getIsMongoConnected()) {
      const existing = await User.findOne({ email: email.toLowerCase() });
      if (existing) {
        return res.status(409).json({ success: false, message: 'Email already registered' });
      }

      const user = await User.create({
        name: name.trim(),
        email: email.toLowerCase().trim(),
        passwordHash,
        role,
        organizationId,
        organizationName
      });

      const token = jwt.sign(
        {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          role: user.role,
          organizationId: user.organizationId,
          organizationName: user.organizationName
        },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      return res.status(201).json({
        success: true,
        token,
        user: {
          id: user._id.toString(),
          _id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
          organizationId: user.organizationId,
          organizationName: user.organizationName
        }
      });
    } else {
      // In-memory fallback
      for (const u of memoryStore.users.values()) {
        if (u.email.toLowerCase() === email.toLowerCase()) {
          return res.status(409).json({ success: false, message: 'Email already registered' });
        }
      }

      const id = 'mem_usr_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
      const user = {
        _id: id,
        id,
        name: name.trim(),
        email: email.toLowerCase().trim(),
        passwordHash,
        role,
        organizationId,
        organizationName,
        created_at: new Date()
      };
      memoryStore.users.set(id, user);

      const token = jwt.sign(
        { id, email: user.email, name: user.name, role, organizationId, organizationName },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      return res.status(201).json({
        success: true,
        token,
        user: {
          id,
          _id: id,
          name: user.name,
          email: user.email,
          role: user.role,
          organizationId,
          organizationName
        }
      });
    }
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/auth/login
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password required' });
    }

    let user = null;
    if (getIsMongoConnected()) {
      user = await User.findOne({ email: email.toLowerCase() });
    } else {
      for (const u of memoryStore.users.values()) {
        if (u.email.toLowerCase() === email.toLowerCase()) {
          user = u;
          break;
        }
      }
    }

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const userId = user._id ? user._id.toString() : user.id;
    const userRole = user.role || (user.email.toLowerCase().includes('admin') ? 'ADMIN' : 'USER');
    const token = jwt.sign(
      {
        id: userId,
        email: user.email,
        name: user.name,
        role: userRole,
        organizationId: user.organizationId || null,
        organizationName: user.organizationName || null
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({
      success: true,
      token,
      user: {
        id: userId,
        _id: userId,
        name: user.name,
        email: user.email,
        role: userRole,
        organizationId: user.organizationId || null,
        organizationName: user.organizationName || null
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/auth/me
 */
router.get('/me', requireAuth, (req, res) => {
  return res.json({
    success: true,
    user: req.user
  });
});

/**
 * GET /api/auth/employees
 * List organization employees / drivers
 */
router.get('/employees', async (req, res) => {
  try {
    // Determine target organizationId
    let targetOrgId = req.query.organizationId;
    if (!targetOrgId && req.headers.authorization) {
      try {
        const token = req.headers.authorization.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);
        targetOrgId = decoded.organizationId;
      } catch {
        // ignore token decode error
      }
    }
    if (!targetOrgId) {
      targetOrgId = 'org_6adb1f069a6b13c161dc5f70';
    }

    let employees = [];
    if (getIsMongoConnected()) {
      employees = await User.find({
        role: 'DRIVER',
        organizationId: targetOrgId
      }).select('-passwordHash');
    } else {
      employees = Array.from(memoryStore.users.values()).filter(
        u => u.role === 'DRIVER' && u.organizationId === targetOrgId
      );
    }

    return res.json({
      success: true,
      employees: employees.map(e => ({
        _id: e._id ? e._id.toString() : e.id,
        id: e._id ? e._id.toString() : e.id,
        name: e.name,
        email: e.email,
        role: e.role,
        organizationId: e.organizationId,
        organizationName: e.organizationName,
        status: e.status || 'resting',
        cameraActive: e.cameraActive || false,
        avatarColor: e.avatarColor || '#2563EB',
        notes: e.notes || '',
        createdAt: e.created_at || e.createdAt || new Date().toISOString()
      }))
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/auth/employees
 * Admin creates a new driver / employee for organization
 */
router.post('/employees', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp đầy đủ họ tên và email' });
    }

    let organizationId = req.body.organizationId;
    let organizationName = req.body.organizationName;

    // Extract from token if not provided in body
    if (!organizationId && req.headers.authorization) {
      try {
        const token = req.headers.authorization.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);
        organizationId = decoded.organizationId;
        organizationName = decoded.organizationName;
      } catch {
        // ignore
      }
    }

    // Default fallback to user's specified organization if empty
    if (!organizationId) {
      organizationId = 'org_6adb1f069a6b13c161dc5f70';
    }
    if (!organizationName) {
      organizationName = 'testcty';
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password || '123456', salt);

    if (getIsMongoConnected()) {
      const existing = await User.findOne({ email: email.toLowerCase().trim() });
      if (existing) {
        return res.status(409).json({ success: false, message: 'Email này đã tồn tại trong hệ thống' });
      }

      const user = await User.create({
        name: name.trim(),
        email: email.toLowerCase().trim(),
        passwordHash,
        role: 'DRIVER',
        organizationId,
        organizationName
      });

      return res.status(201).json({
        success: true,
        message: 'Tạo tài khoản nhân viên thành công',
        user: {
          _id: user._id.toString(),
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
          organizationId: user.organizationId,
          organizationName: user.organizationName,
          status: 'resting',
          cameraActive: false,
          avatarColor: '#2563EB',
          notes: '',
          createdAt: user.created_at
        }
      });
    } else {
      // In-memory fallback
      for (const u of memoryStore.users.values()) {
        if (u.email.toLowerCase() === email.toLowerCase().trim()) {
          return res.status(409).json({ success: false, message: 'Email này đã tồn tại trong hệ thống' });
        }
      }

      const id = 'mem_driver_' + Date.now();
      const user = {
        _id: id,
        id,
        name: name.trim(),
        email: email.toLowerCase().trim(),
        passwordHash,
        role: 'DRIVER',
        organizationId,
        organizationName,
        status: 'resting',
        cameraActive: false,
        avatarColor: '#2563EB',
        notes: '',
        createdAt: new Date().toISOString()
      };
      memoryStore.users.set(id, user);

      return res.status(201).json({
        success: true,
        message: 'Tạo tài khoản nhân viên thành công',
        user
      });
    }
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * PUT /api/auth/employees/:id
 * Edit employee
 */
router.put('/employees/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, password, notes, status, cameraActive } = req.body;

    if (getIsMongoConnected()) {
      const updateData = {};
      if (name) updateData.name = name.trim();
      if (email) updateData.email = email.toLowerCase().trim();
      if (notes !== undefined) updateData.notes = notes;
      if (password) {
        const salt = await bcrypt.genSalt(10);
        updateData.passwordHash = await bcrypt.hash(password, salt);
      }

      const updated = await User.findByIdAndUpdate(id, updateData, { new: true }).select('-passwordHash');
      if (!updated) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản nhân viên' });
      }

      return res.json({ success: true, user: updated });
    } else {
      const user = memoryStore.users.get(id);
      if (!user) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản nhân viên' });
      }
      if (name) user.name = name.trim();
      if (email) user.email = email.toLowerCase().trim();
      if (notes !== undefined) user.notes = notes;
      if (status !== undefined) user.status = status;
      if (cameraActive !== undefined) user.cameraActive = cameraActive;
      return res.json({ success: true, user });
    }
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * DELETE /api/auth/employees/:id
 * Remove employee
 */
router.delete('/employees/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (getIsMongoConnected()) {
      const deleted = await User.findByIdAndDelete(id);
      if (!deleted) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản' });
      }
    } else {
      memoryStore.users.delete(id);
    }
    return res.json({ success: true, message: 'Đã xóa tài khoản thành công' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/auth/users
 * List users
 */
router.get('/users', requireAuth, async (req, res) => {
  try {
    let list = [];

    if (getIsMongoConnected()) {
      list = await User.find({}).select('-passwordHash');
    } else {
      list = Array.from(memoryStore.users.values()).map(u => ({
        id: u.id || u._id,
        name: u.name,
        email: u.email,
        created_at: u.created_at
      }));
    }

    return res.json({ success: true, users: list });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
