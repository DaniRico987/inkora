export interface AuthenticatedUser {
  userId: number;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  userType: 'client' | 'admin' | 'root';
  status: 'active' | 'inactive' | 'blocked';
}
