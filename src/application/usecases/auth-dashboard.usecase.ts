import crypto from 'node:crypto';
import { IDashboardUserRepository } from '../../domain/repositories/dashboard-user.repository.interface.js';
import { DashboardUserEntity } from '../../domain/entities/dashboard-user.entity.js';

const AUTH_SALT = 'WAGateway_Dashboard_Secure_Salt_2026';
const TOKEN_SECRET = 'WAGateway_Secret_HMAC_Key_SuperSecure_9876';

export class AuthDashboardUseCase {
  constructor(private readonly userRepo: IDashboardUserRepository) {}

  public static hashPassword(password: string): string {
    return crypto.createHmac('sha256', AUTH_SALT).update(password).digest('hex');
  }

  public async login(
    username: string,
    passwordPlain: string
  ): Promise<{ token: string; user: Omit<DashboardUserEntity, 'passwordHash'> }> {
    if (!username || !passwordPlain) {
      throw new Error('Username dan password wajib diisi');
    }

    const user = await this.userRepo.findByUsername(username.trim());
    if (!user) {
      throw new Error('Username atau password salah');
    }

    const hashedInput = AuthDashboardUseCase.hashPassword(passwordPlain);
    if (hashedInput !== user.passwordHash) {
      throw new Error('Username atau password salah');
    }

    // Buat token sesi berdurasi 7 hari
    const token = this.generateSessionToken(user.id);

    const { passwordHash, ...userClean } = user;
    return { token, user: userClean };
  }

  public async verifyToken(token?: string): Promise<DashboardUserEntity | null> {
    if (!token) return null;

    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;

      const [userId, timestampStr, signature] = parts;
      const expectedSig = crypto
        .createHmac('sha256', TOKEN_SECRET)
        .update(`${userId}.${timestampStr}`)
        .digest('hex');

      if (signature !== expectedSig) return null;

      const timestamp = parseInt(timestampStr, 10);
      const now = Date.now();
      const maxAgeMs = 7 * 24 * 60 * 60 * 1000; // 7 hari

      if (now - timestamp > maxAgeMs) return null;

      return await this.userRepo.findById(userId);
    } catch {
      return null;
    }
  }

  private generateSessionToken(userId: string): string {
    const timestamp = Date.now();
    const payload = `${userId}.${timestamp}`;
    const signature = crypto.createHmac('sha256', TOKEN_SECRET).update(payload).digest('hex');
    return `${payload}.${signature}`;
  }
}
