import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { getIsMongoConnected, memoryStore } from '../db.js';

export const JWT_SECRET = process.env.JWT_SECRET || 'driver_safety_jwt_secret_key_2026';

/**
 * Authentication middleware: verifies Bearer token
 */
export async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Authorization token required' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    let user = null;
    if (getIsMongoConnected()) {
      user = await User.findById(decoded.id).select('-passwordHash');
    } else {
      user = memoryStore.users.get(decoded.id);
    }

    if (!user) {
      // Allow fallback if user object is inside decoded
      req.user = {
        _id: decoded.id,
        id: decoded.id,
        name: decoded.name,
        email: decoded.email,
        role: decoded.role
      };
      return next();
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token', error: err.message });
  }
}

export default {
  requireAuth,
  JWT_SECRET
};
