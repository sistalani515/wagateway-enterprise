export type DashboardRole = 'superadmin' | 'admin' | 'operator';

export interface DashboardUserEntity {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  role: DashboardRole;
  fullName: string;
  createdAt: Date;
  updatedAt: Date;
}
