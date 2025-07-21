const jwt = require('jsonwebtoken');

const authMiddleware = {
  // Verify JWT token
  verifyToken(req, res, next) {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
      next();
    } catch (error) {
      return res.status(401).json({ error: 'Invalid token.' });
    }
  },

  // Check if user has required role
  requireRole(roles) {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({ error: 'Access denied. No token provided.' });
      }

      const userRole = req.user.role;

      if (Array.isArray(roles)) {
        if (!roles.includes(userRole)) {
          return res.status(403).json({ error: 'Access denied. Insufficient permissions.' });
        }
      } else {
        if (userRole !== roles) {
          return res.status(403).json({ error: 'Access denied. Insufficient permissions.' });
        }
      }

      next();
    };
  },

  // Check if user is manager or admin
  requireManager(req, res, next) {
    return authMiddleware.requireRole(['manager', 'admin'])(req, res, next);
  },

  // Check if user is admin only
  requireAdmin(req, res, next) {
    return authMiddleware.requireRole('admin')(req, res, next);
  },

  // Optional authentication (doesn't fail if no token)
  optionalAuth(req, res, next) {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
      } catch (error) {
        // Token is invalid, but we don't fail the request
        req.user = null;
      }
    } else {
      req.user = null;
    }

    next();
  }
};

module.exports = authMiddleware;
