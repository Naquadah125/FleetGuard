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

    if (getIsMongoConnected()) {
      const existing = await User.findOne({ email: email.toLowerCase() });
      if (existing) {
        return res.status(409).json({ success: false, message: 'Email already registered' });
      }

      const role = req.body.role || (email.toLowerCase().includes('admin') ? 'ADMIN' : 'USER');
      const user = await User.create({
        name,
        email: email.toLowerCase(),
        passwordHash,
        role
      });

      const token = jwt.sign(
        { id: user._id.toString(), email: user.email, name: user.name, role: user.role },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      return res.status(201).json({
        success: true,
        token,
        user: { id: user._id, name: user.name, email: user.email, role: user.role }
      });
    } else {
      // In-memory fallback
      for (const u of memoryStore.users.values()) {
        if (u.email.toLowerCase() === email.toLowerCase()) {
          return res.status(409).json({ success: false, message: 'Email already registered' });
        }
      }

      const id = 'mem_usr_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
      const role = req.body.role || (email.toLowerCase().includes('admin') ? 'ADMIN' : 'USER');
      const user = {
        _id: id,
        id,
        name,
        email: email.toLowerCase(),
        passwordHash,
        role,
        created_at: new Date()
      };
      memoryStore.users.set(id, user);

      const token = jwt.sign(
        { id, email: user.email, name: user.name, role },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      return res.status(201).json({
        success: true,
        token,
        user: { id, name: user.name, email: user.email, role }
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
        role: userRole
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({
      success: true,
      token,
      user: {
        id: userId,
        name: user.name,
        email: user.email,
        role: userRole
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
