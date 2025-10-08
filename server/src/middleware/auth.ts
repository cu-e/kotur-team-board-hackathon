import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../auth/jwt';

export function authRequired(req: Request, res: Response, next: NextFunction) {
  const hdr = req.headers.authorization || '';
  const token = hdr.startsWith('Bearer ') ? hdr.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'NO_TOKEN' });
  try {
    const payload = verifyToken(token) as any;
    req.userId = String(payload.sub);
    return next();
  } catch (e) {
    return res.status(401).json({ error: 'BAD_TOKEN' });
  }
}
