import { Router, Request, Response, NextFunction } from 'express';
import { ClientManagementUseCase } from '../../application/usecases/client-management.usecase.js';
import { AuthDashboardUseCase } from '../../application/usecases/auth-dashboard.usecase.js';
import { DashboardUserManagementUseCase } from '../../application/usecases/dashboard-user-management.usecase.js';
import { WhatsAppEngineManagementUseCase } from '../../application/usecases/whatsapp-engine-management.usecase.js';
import { SystemSettingsUseCase } from '../../application/usecases/system-settings.usecase.js';
import { IWhatsAppClient } from '../../domain/repositories/whatsapp.client.interface.js';
import { renderWarmAdminDashboard } from '../views/warm-dashboard.view.js';
import { renderLoginView } from '../views/login.view.js';

function parseCookie(header?: string): Record<string, string> {
  const list: Record<string, string> = {};
  if (!header) return list;

  header.split(';').forEach((cookie) => {
    const parts = cookie.split('=');
    if (parts.length >= 2) {
      list[parts[0].trim()] = decodeURIComponent(parts.slice(1).join('=').trim());
    }
  });

  return list;
}

export function createAdminRouter(
  clientManagement: ClientManagementUseCase,
  authUseCase: AuthDashboardUseCase,
  userManagement: DashboardUserManagementUseCase,
  engineManagement: WhatsAppEngineManagementUseCase,
  settingsUseCase: SystemSettingsUseCase,
  waClient: IWhatsAppClient
): Router {
  const router = Router();

  // Middleware Autentikasi Dashboard
  const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
    const cookies = parseCookie(req.headers.cookie);
    const tokenFromCookie = cookies['wag_session'];
    const authHeader = req.headers.authorization;
    const tokenFromHeader = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
    const token = tokenFromCookie || tokenFromHeader;

    const user = await authUseCase.verifyToken(token);
    if (!user) {
      const acceptsHtml = req.headers.accept?.includes('text/html');
      if (acceptsHtml && req.method === 'GET') {
        return res.redirect('/login');
      }
      return res.status(401).json({
        success: false,
        error: 'Sesi login tidak valid atau kadaluarsa. Silakan login kembali.'
      });
    }

    (req as any).user = user;
    next();
  };

  // --- AUTHENTICATION ROUTES ---
  router.get('/login', async (req: Request, res: Response) => {
    const cookies = parseCookie(req.headers.cookie);
    const user = await authUseCase.verifyToken(cookies['wag_session']);
    if (user) {
      return res.redirect('/');
    }
    res.setHeader('Content-Type', 'text/html');
    res.send(renderLoginView());
  });

  router.post('/api/auth/login', async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;
      const { token, user } = await authUseCase.login(username, password);

      res.setHeader('Set-Cookie', `wag_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800`);
      return res.json({ success: true, data: { user } });
    } catch (err: any) {
      return res.status(400).json({ success: false, error: err.message });
    }
  });

  router.post('/api/auth/logout', (req: Request, res: Response) => {
    res.setHeader('Set-Cookie', 'wag_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0');
    return res.json({ success: true, message: 'Logout berhasil' });
  });

  // --- PROTECTED DASHBOARD VIEW ---
  router.get('/', requireAuth, (req: Request, res: Response) => {
    const session = waClient.getSession();
    const currentUser = (req as any).user;
    res.setHeader('Content-Type', 'text/html');
    res.send(renderWarmAdminDashboard(session, currentUser));
  });

  router.get('/admin', requireAuth, (req: Request, res: Response) => {
    res.redirect('/');
  });

  // --- WHATSAPP ENGINE / HUGGING FACE MANAGEMENT API ---
  router.get('/api/admin/engines', requireAuth, async (req: Request, res: Response) => {
    try {
      const engines = await engineManagement.listEngines();
      res.json({ success: true, data: engines });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  router.post('/api/admin/engines', requireAuth, async (req: Request, res: Response) => {
    try {
      const { id, name, type, url, secretKey } = req.body;
      if (!id || !name || !url || !secretKey) {
        return res.status(400).json({ success: false, error: 'ID, Nama, URL, dan SecretKey wajib diisi' });
      }

      const created = await engineManagement.createEngine({ id, name, type, url, secretKey });
      res.status(201).json({ success: true, data: created });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  router.get('/api/admin/engines/:id/status-qr', requireAuth, async (req: Request, res: Response) => {
    try {
      const localSession = waClient.getSession();
      const statusData = await engineManagement.getEngineStatusAndQr(req.params.id, localSession);
      res.json({ success: true, data: statusData });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  router.post('/api/admin/engines/:id/ping', requireAuth, async (req: Request, res: Response) => {
    try {
      const result = await engineManagement.pingEngine(req.params.id);
      res.json({ success: true, data: result });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  router.delete('/api/admin/engines/:id', requireAuth, async (req: Request, res: Response) => {
    try {
      await engineManagement.deleteEngine(req.params.id);
      res.json({ success: true, message: 'Engine berhasil dihapus' });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // --- SYSTEM SETTINGS API ---
  router.get('/api/admin/settings', requireAuth, async (req: Request, res: Response) => {
    try {
      const settings = await settingsUseCase.getSettings();
      res.json({ success: true, data: settings });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  router.put('/api/admin/settings', requireAuth, async (req: Request, res: Response) => {
    try {
      const updated = await settingsUseCase.updateSettings(req.body);
      res.json({ success: true, data: updated });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // --- DASHBOARD STAFF/ADMIN USER MANAGEMENT API ---
  router.get('/api/admin/users', requireAuth, async (req: Request, res: Response) => {
    try {
      const users = await userManagement.listUsers();
      res.json({ success: true, data: users });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  router.post('/api/admin/users', requireAuth, async (req: Request, res: Response) => {
    try {
      const { username, email, passwordPlain, fullName, role } = req.body;
      if (!username || !passwordPlain || !fullName) {
        return res.status(400).json({ success: false, error: 'Username, password, dan nama lengkap wajib diisi' });
      }

      const created = await userManagement.createUser({
        username,
        email: email || `${username}@wagateway.local`,
        passwordPlain,
        fullName,
        role: role || 'admin'
      });

      res.status(201).json({ success: true, data: created });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  router.delete('/api/admin/users/:id', requireAuth, async (req: Request, res: Response) => {
    try {
      const currentUserId = (req as any).user.id;
      await userManagement.deleteUser(req.params.id, currentUserId);
      res.json({ success: true, message: 'Pengguna dashboard berhasil dihapus' });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // --- CLIENT API (SUBSCRIBER) MANAGEMENT ---
  router.get('/api/admin/clients', requireAuth, async (req: Request, res: Response) => {
    try {
      const clients = await clientManagement.getAllClients();
      res.json({ success: true, data: clients });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  router.post('/api/admin/clients', requireAuth, async (req: Request, res: Response) => {
    try {
      const { clientName, email, phoneNumber, engineId, expiredAt, monthlyQuota } = req.body;
      if (!clientName || !expiredAt) {
        return res.status(400).json({ success: false, error: 'clientName dan expiredAt wajib diisi' });
      }

      const result = await clientManagement.createClient({
        clientName,
        email,
        phoneNumber,
        engineId: engineId || 'engine-local-01',
        expiredAt: new Date(expiredAt),
        monthlyQuota: monthlyQuota ? parseInt(monthlyQuota, 10) : 5000
      });

      res.status(201).json({ success: true, data: result });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  router.put('/api/admin/clients/:id', requireAuth, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { clientName, email, phoneNumber, engineId, status, expiredAt, monthlyQuota } = req.body;

      const updated = await clientManagement.updateClient(id, {
        clientName,
        email,
        phoneNumber,
        engineId,
        status,
        expiredAt: expiredAt ? new Date(expiredAt) : undefined,
        monthlyQuota: monthlyQuota ? parseInt(monthlyQuota, 10) : undefined
      });

      res.json({ success: true, data: updated });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  router.delete('/api/admin/clients/:id', requireAuth, async (req: Request, res: Response) => {
    try {
      await clientManagement.deleteClient(req.params.id);
      res.json({ success: true, message: 'Klien berhasil dihapus' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  router.post('/api/admin/clients/:id/keys', requireAuth, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { label } = req.body;
      const key = await clientManagement.generateApiKey(id, label || 'Production Key');
      res.status(201).json({ success: true, data: key });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  router.post('/api/admin/keys/:id/toggle', requireAuth, async (req: Request, res: Response) => {
    try {
      const key = await clientManagement.toggleApiKey(req.params.id);
      res.json({ success: true, data: key });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  router.get('/api/admin/engine/status', requireAuth, (req: Request, res: Response) => {
    res.json({ success: true, data: waClient.getSession() });
  });

  return router;
}
