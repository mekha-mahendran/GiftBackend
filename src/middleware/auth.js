import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || '2e2eba324c19a79334980068b0d57077d3846030576675d5d4f942de6071156b';

export const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Authentication token required' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired authentication token' });
  }
};

export const requireAdmin = (req, res, next) => {
  requireAuth(req, res, () => {
    if (req.user && (req.user.role === 'ADMIN' || req.user.role === 'SUPERADMIN')) {
      next();
    } else {
      return res.status(403).json({ success: false, message: 'Admin privileges required' });
    }
  });
};
