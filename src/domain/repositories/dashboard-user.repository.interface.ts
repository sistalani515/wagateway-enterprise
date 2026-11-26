import { DashboardUserEntity } from '../entities/dashboard-user.entity.js';

export interface IDashboardUserRepository {
  findById(id: string): Promise<DashboardUserEntity | null>;
  findByUsername(username: string): Promise<DashboardUserEntity | null>;
  findAll(): Promise<DashboardUserEntity[]>;
  save(user: DashboardUserEntity): Promise<void>;
  update(user: DashboardUserEntity): Promise<void>;
  delete(id: string): Promise<void>;
}
