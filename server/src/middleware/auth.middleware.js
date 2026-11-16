import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma.js';

// Verifies the JWT, loads the user, attaches it to req.user.
// Use on any route that requires the caller to be logged in.
export async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) {
      return res.status(401).json({ success: false, message: 'Missing token' });
    }

    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }

    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) {
      return res.status(401).json({ success: false, message: 'User no longer exists' });
    }
    if (user.status !== 'active') {
      return res.status(403).json({ success: false, message: 'Account is not active' });
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

// Restrict to one or more roles, e.g. requireRole('broker') or requireRole('admin').
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    next();
  };
}
