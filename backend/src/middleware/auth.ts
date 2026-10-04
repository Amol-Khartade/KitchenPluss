import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export const JWT_SECRET = process.env.JWT_SECRET || 'kitchenpulse-secret-key-super-secure-2026';

export interface AuthJwtPayload {
  userId: string;
  email: string;
  role: string;
  organizationId: string;
  organizationName: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthJwtPayload;
}

export function generateToken(payload: AuthJwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    res.status(401).json({ error: 'Access token required. Please sign in.' });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthJwtPayload;
    req.user = decoded;
    next();
  } catch (err) {
    res.status(403).json({ error: 'Invalid or expired token. Please sign in again.' });
    return;
  }
}

export function requireRole(allowedRoles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const userRole = req.user.role;
    // 'Owner' always has access to everything
    if (userRole === 'Owner' || allowedRoles.includes(userRole)) {
      next();
      return;
    }

    res.status(403).json({
      error: 'Forbidden: Insufficient privileges',
      message: `This action requires one of the following roles: [${allowedRoles.join(', ')}]. Current role: '${userRole}'`,
    });
  };
}

export function optionalAuth(req: AuthenticatedRequest, _res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as AuthJwtPayload;
      req.user = decoded;
    } catch {
      // Ignored for optional auth
    }
  }
  next();
}
