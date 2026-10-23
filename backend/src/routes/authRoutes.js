import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { getIsMongoConnected, memoryStore } from '../db.js';
import { requireAuth, JWT_SECRET } from '../middleware/authMiddleware.js';
import { recordAuditEvent } from '../services/auditLogService.js';

const router = express.Router();

const PROFILE_FIELDS = ['name', 'phone', 'dateOfBirth', 'avatarColor'];
const PASSWORD_FIELDS = ['currentPassword', 'newPassword', 'confirmPassword'];

function publicUser(user) {
  const source = user.toObject ? user.toObject() : user;
  const { passwordHash, ...safeUser } = source;
  return {
    ...safeUser,
    _id: safeUser._id ? safeUser._id.toString() : safeUser.id,
    id: safeUser._id ? safeUser._id.toString() : safeUser.id,
    avatarColor: safeUser.avatarColor || '#2563EB',
    phone: safeUser.phone || '',
    dateOfBirth: safeUser.dateOfBirth || '',
  };
}

function parseDateOfBirth(value) {
  if (!/^\d{2}-\d{2}-\d{4}$/.test(value || '')) return null;
  const [day, month, year] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  const today = new Date();
  let age = today.getFullYear() - year;
  const birthdayPassed = today.getMonth() + 1 > month
    || (today.getMonth() + 1 === month && today.getDate() >= day);
  if (!birthdayPassed) age -= 1;
  return age >= 16 && age <= 100 ? value : null;
}

function validateProfileBody(body) {
  const allowed = new Set([...PROFILE_FIELDS, ...PASSWORD_FIELDS]);
  const unknown = Object.keys(body).find((key) => !allowed.has(key));
  if (unknown) return `Không thể thay đổi trường: ${unknown}`;
  if (!body.name?.trim()) return 'Họ tên không được để trống';
  if (!/^0\d{9}$/.test(body.phone || '')) return 'Số điện thoại phải có 10 chữ số Việt Nam';
  if (!parseDateOfBirth(body.dateOfBirth)) return 'Ngày sinh phải theo dạng DD-MM-YYYY và tuổi từ 16 đến 100';
  if (!/^#[0-9a-fA-F]{6}$/.test(body.avatarColor || '')) return 'Màu avatar không hợp lệ';
  const hasPassword = PASSWORD_FIELDS.some((key) => body[key] !== undefined && body[key] !== '');
  if (hasPassword && (!body.currentPassword || !body.newPassword || !body.confirmPassword)) {
    return 'Vui lòng nhập đủ thông tin mật khẩu';
  }
  if (hasPassword && body.newPassword.length < 6) return 'Mật khẩu mới phải có ít nhất 6 ký tự';
  if (hasPassword && body.newPassword !== body.confirmPassword) return 'Xác nhận mật khẩu không khớp';
  return null;
}

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
    user: publicUser(req.user)
  });
});

/**
 * PUT /api/auth/me
 */
router.put('/me', requireAuth, async (req, res) => {
  try {
    const validationError = validateProfileBody(req.body || {});
    if (validationError) return res.status(400).json({ success: false, message: validationError });

    const userId = req.user._id?.toString() || req.user.id;
    const user = getIsMongoConnected()
      ? await User.findById(userId)
      : memoryStore.users.get(userId);
    if (!user) return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản' });

    const hasPassword = PASSWORD_FIELDS.some((key) => req.body[key] !== undefined && req.body[key] !== '');
    if (hasPassword && !(await bcrypt.compare(req.body.currentPassword, user.passwordHash))) {
      return res.status(401).json({ success: false, message: 'Mật khẩu hiện tại không đúng' });
    }

    const changedFields = PROFILE_FIELDS.filter((field) => user[field] !== req.body[field]);
    Object.assign(user, {
      name: req.body.name.trim(),
      phone: req.body.phone,
      dateOfBirth: req.body.dateOfBirth,
      avatarColor: req.body.avatarColor,
    });
    if (hasPassword) {
      user.passwordHash = await bcrypt.hash(req.body.newPassword, 10);
      changedFields.push('password');
    }
    if (getIsMongoConnected()) await user.save();
    else memoryStore.users.set(userId, user);

    await recordAuditEvent({
      actor: {
        id: userId,
        name: user.name,
        email: user.email,
        organizationId: user.organizationId || `user_${userId}`,
      },
      action: 'UPDATE_PROFILE',
      resourceType: 'user',
      resourceId: userId,
      description: 'Cập nhật hồ sơ cá nhân',
      metadata: { changedFields },
      deduplicate: false,
    });
    return res.json({ success: true, user: publicUser(user) });
  } catch (err) {
    console.error('[Profile update error]:', err);
    return res.status(500).json({ success: false, message: 'Không thể cập nhật hồ sơ' });
  }
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
        role: { $in: ['DRIVER', 'USER'] },
        organizationId: targetOrgId
      }).select('-passwordHash');

      if (employees.length === 0 && targetOrgId === 'org_6adb1f069a6b13c161dc5f70') {
        employees = await User.find({
          role: { $in: ['DRIVER', 'USER'] }
        }).select('-passwordHash');
      }
    } else {
      employees = Array.from(memoryStore.users.values()).filter(
        u => (u.role === 'DRIVER' || u.role === 'USER') && u.organizationId === targetOrgId
      );
      if (employees.length === 0 && targetOrgId === 'org_6adb1f069a6b13c161dc5f70') {
        employees = Array.from(memoryStore.users.values()).filter(
          u => u.role === 'DRIVER' || u.role === 'USER'
        );
      }
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
    let requesterUser = null;
    if (req.headers.authorization) {
      try {
        const token = req.headers.authorization.split(' ')[1];
        requesterUser = jwt.verify(token, JWT_SECRET);
        if (!organizationId) {
          organizationId = requesterUser.organizationId;
          organizationName = requesterUser.organizationName;
        }
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

      await recordAuditEvent({
        actor: {
          id: requesterUser?.userId || requesterUser?._id || requesterUser?.id || 'admin',
          name: requesterUser?.name || 'Quản Trị Viên',
          email: requesterUser?.email || '',
          organizationId: user.organizationId,
        },
        action: 'CREATE_EMPLOYEE',
        resourceType: 'employee',
        resourceId: user._id.toString(),
        description: `Tạo tài khoản tài xế: ${user.name} (${user.email})`,
        metadata: { role: user.role, email: user.email, name: user.name }
      }).catch(() => {});

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

      await recordAuditEvent({
        actor: {
          id: requesterUser?.userId || requesterUser?._id || requesterUser?.id || 'admin',
          name: requesterUser?.name || 'Quản Trị Viên',
          email: requesterUser?.email || '',
          organizationId: user.organizationId,
        },
        action: 'CREATE_EMPLOYEE',
        resourceType: 'employee',
        resourceId: id,
        description: `Tạo tài khoản tài xế: ${user.name} (${user.email})`,
        metadata: { role: user.role, email: user.email, name: user.name }
      }).catch(() => {});

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

    let requesterUser = null;
    if (req.headers.authorization) {
      try {
        const token = req.headers.authorization.split(' ')[1];
        requesterUser = jwt.verify(token, JWT_SECRET);
      } catch {}
    }

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

      await recordAuditEvent({
        actor: {
          id: requesterUser?.userId || requesterUser?._id || requesterUser?.id || 'admin',
          name: requesterUser?.name || 'Quản Trị Viên',
          email: requesterUser?.email || '',
          organizationId: updated.organizationId || requesterUser?.organizationId,
        },
        action: 'UPDATE_EMPLOYEE',
        resourceType: 'employee',
        resourceId: id,
        description: `Cập nhật thông tin tài xế: ${updated.name}`,
        metadata: { name: updated.name, email: updated.email }
      }).catch(() => {});

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

      await recordAuditEvent({
        actor: {
          id: requesterUser?.userId || requesterUser?._id || requesterUser?.id || 'admin',
          name: requesterUser?.name || 'Quản Trị Viên',
          email: requesterUser?.email || '',
          organizationId: user.organizationId || requesterUser?.organizationId,
        },
        action: 'UPDATE_EMPLOYEE',
        resourceType: 'employee',
        resourceId: id,
        description: `Cập nhật thông tin tài xế: ${user.name}`,
        metadata: { name: user.name, email: user.email }
      }).catch(() => {});

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

    let requesterUser = null;
    if (req.headers.authorization) {
      try {
        const token = req.headers.authorization.split(' ')[1];
        requesterUser = jwt.verify(token, JWT_SECRET);
      } catch {}
    }

    let deletedUser = null;
    if (getIsMongoConnected()) {
      deletedUser = await User.findById(id);
      const deleted = await User.findByIdAndDelete(id);
      if (!deleted) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản' });
      }
    } else {
      deletedUser = memoryStore.users.get(id);
      memoryStore.users.delete(id);
    }

    await recordAuditEvent({
      actor: {
        id: requesterUser?.userId || requesterUser?._id || requesterUser?.id || 'admin',
        name: requesterUser?.name || 'Quản Trị Viên',
        email: requesterUser?.email || '',
        organizationId: deletedUser?.organizationId || requesterUser?.organizationId,
      },
      action: 'DELETE_EMPLOYEE',
      resourceType: 'employee',
      resourceId: id,
      description: `Xóa tài khoản tài xế: ${deletedUser?.name || id} (${deletedUser?.email || ''})`,
      metadata: { name: deletedUser?.name, email: deletedUser?.email }
    }).catch(() => {});

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
