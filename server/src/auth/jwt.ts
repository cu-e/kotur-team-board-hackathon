import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const JWT_TTL = process.env.JWT_TTL || '7d';

export function signToken(payload: object) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_TTL });
}

export function verifyToken(token: string): any {
  return jwt.verify(token, JWT_SECRET);
}
