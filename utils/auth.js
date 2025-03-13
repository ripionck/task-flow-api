const jwt = require('jsonwebtoken');

// Generate JWT token
exports.generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE,
  });
};

// Verify JWT token
exports.verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return null;
  }
};

// Extract user ID from token
exports.getUserIdFromToken = (token) => {
  const decoded = this.verifyToken(token);
  return decoded ? decoded.id : null;
};

// Check if token is expired
exports.isTokenExpired = (token) => {
  const decoded = this.verifyToken(token);
  if (!decoded) return true;

  const currentTime = Date.now() / 1000;
  return decoded.exp < currentTime;
};
