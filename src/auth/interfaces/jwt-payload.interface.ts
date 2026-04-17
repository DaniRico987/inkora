export interface JwtPayload {
  sub: number;
  role: 'client' | 'admin' | 'root';
  isTemporaryPassword?: boolean;
}
