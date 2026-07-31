import jwt from 'jsonwebtoken';

const secret = process.env.JWT_SECRET ?? 'development-secret';

export interface JwtPayload {
  userId: string;
  tenantId: string;
  role: string;
  email: string;
  name: string;
}

export function signToken(payload: JwtPayload) {
  return jwt.sign(payload, secret, { expiresIn: '7d' });
}

export function verifyToken(token: string) {
  try {
    return jwt.verify(token, secret) as JwtPayload;
  } catch {
    return null;
  }
}
