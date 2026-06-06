export interface JwtPayload {
  sub: number;
  role: 'client' | 'admin' | 'root';
  isTemporaryPassword?: boolean;
  exp?: number; // Unix timestamp (segundos) - campo estándar JWT
  iat?: number; // Unix timestamp (segundos) - campo estándar JWT
}
