import jwt from 'jsonwebtoken';

export function verifyAdminToken(token) {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role === 'admin') {
      return decoded;
    }
    return null;
  } catch (error) {
    console.error('Token verification error:', error);
    return null;
  }
}

export function generateAdminToken(username) {
  return jwt.sign(
    { 
      username,
      role: 'admin',
      iat: Math.floor(Date.now() / 1000),
    },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}