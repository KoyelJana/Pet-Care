const jwt = require('jsonwebtoken');

/**
 * Middleware for JWT authentication + role-based authorization
 * @param {Array|string} roles - Allowed roles (optional)
 */
const userAuth = (roles = []) => {
  // Ensure roles is an array
  if (typeof roles === 'string') roles = [roles];

  return async (req, res, next) => {
    try {
      // 1️⃣ Extract token
      let token =
        req?.body?.token ||
        req?.query?.token ||
        req?.headers['x-access-token'] ||
        req?.headers['authorization'];

      if (!token) {
        return res.status(400).json({
          status: false,
          message: 'Token is required for authentication'
        });
      }

      // 2️⃣ Remove 'Bearer ' prefix if present
      if (token.startsWith('Bearer ')) {
        token = token.slice(7, token.length).trim();
      }

      // 3️⃣ Verify token
      const decoded = jwt.verify(token, process.env.JWT_TOKEN_SECRET_KEY);
      req.user = decoded; // { id, role, email, name }

      // 4️⃣ Role-based authorization
      if (roles.length > 0 && !roles.includes(req.user.role)) {
        return res.status(403).json({
          status: false,
          message: "Forbidden: You don't have permission"
        });
      }

      // ✅ Passed all checks
      next();
    } catch (err) {
      console.error('JWT Error:', err.message);
      return res.status(400).json({
        status: false,
        message: 'Invalid or expired token'
      });
    }
  };
};

module.exports = userAuth;
