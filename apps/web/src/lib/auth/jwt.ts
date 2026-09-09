import jwt from 'jsonwebtoken';

function getSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      'JWT_SECRET is not set (or is too short). Set a random 32+ character secret in your .env file — ' +
      'generate one with: node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'base64\'))"'
    );
  }
  return secret;
}

export interface JwtPayload {
  userId: string;
  tenantId: string;
  role: string;
  email: string;
  name: string;
}

// Web keeps the original 7-day cookie-only token. Mobile access tokens are
// short-lived (see src/lib/auth/refreshToken.ts) since they're paired with
// a long-lived refresh token instead.
export function signToken(payload: JwtPayload, expiresIn: string = '7d') {
  return jwt.sign(payload, getSecret(), { expiresIn } as jwt.SignOptions);
}

export function verifyToken(token: string) {
  try {
    return jwt.verify(token, getSecret()) as JwtPayload;
  } catch {
    return null;
  }
}
