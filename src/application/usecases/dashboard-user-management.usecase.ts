import crypto from 'node:crypto';
import { IDashboardUserRepository } from '../../domain/repositories/dashboard-user.repository.interface.js';
import { DashboardRole, DashboardUserEntity } from '../../domain/entities/dashboard-user.entity.js';
import { AuthDashboardUseCase } from './auth-dashboard.usecase.js';

export class DashboardUserManagementUseCase {
  constructor(private readonly userRepo: IDashboardUserRepository) {}

  public async createUser(data: {
    username: string;
    email: string;
    passwordPlain: string;
    fullName: string;
    role: DashboardRole;
  }): Promise<Omit<DashboardUserEntity, 'passwordHash'>> {
    const existing = await this.userRepo.findByUsername(data.username.trim());
    if (existing) {
      throw new Error(`Username "${data.username}" sudah digunakan`);
    }

    const now = new Date();
    const newUser: DashboardUserEntity = {
      id: crypto.randomUUID(),
      username: data.username.trim().toLowerCase(),
      email: data.email.trim(),
      fullName: data.fullName.trim(),
      role: data.role || 'admin',
      passwordHash: AuthDashboardUseCase.hashPassword(data.passwordPlain),
      createdAt: now,
      updatedAt: now
    };

    await this.userRepo.save(newUser);
    const { passwordHash, ...safeUser } = newUser;
    return safeUser;
  }

  public async listUsers(): Promise<Array<Omit<DashboardUserEntity, 'passwordHash'>>> {
    const users = await this.userRepo.findAll();
    return users.map(({ passwordHash, ...safe }) => safe);
  }

  public async deleteUser(id: string, currentUserId: string): Promise<void> {
    if (id === currentUserId) {
      throw new Error('Anda tidak dapat menghapus akun Anda sendiri saat ini');
    }
    const all = await this.userRepo.findAll();
    if (all.length <= 1) {
      throw new Error('Tidak dapat menghapus user terakhir di dashboard');
    }
    await this.userRepo.delete(id);
  }

  public async changePassword(id: string, newPasswordPlain: string): Promise<void> {
    const user = await this.userRepo.findById(id);
    if (!user) {
      throw new Error('User dashboard tidak ditemukan');
    }
    user.passwordHash = AuthDashboardUseCase.hashPassword(newPasswordPlain);
    user.updatedAt = new Date();
    await this.userRepo.update(user);
  }
}
