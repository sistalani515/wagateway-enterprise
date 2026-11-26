import express from 'express';
import { createClient } from '@supabase/supabase-js';
import { ENV } from './config/env.js';
import { BaileysClientAdapter } from './infrastructure/whatsapp/baileys-client.adapter.js';
import {
  JsonStorageContext,
  JsonDashboardUserRepository,
  JsonClientRepository,
  JsonApiKeyRepository,
  JsonMessageLogRepository,
  JsonWhatsAppEngineRepository,
  JsonSystemSettingsRepository
} from './infrastructure/storage/json-file-database.adapter.js';
import {
  SupabaseClientRepository,
  SupabaseApiKeyRepository,
  SupabaseDashboardUserRepository,
  SupabaseWhatsAppEngineRepository,
  SupabaseSystemSettingsRepository,
  SupabaseMessageLogRepository
} from './infrastructure/storage/supabase-database.adapter.js';
import { AuthDashboardUseCase } from './application/usecases/auth-dashboard.usecase.js';
import { DashboardUserManagementUseCase } from './application/usecases/dashboard-user-management.usecase.js';
import { ClientManagementUseCase } from './application/usecases/client-management.usecase.js';
import { WhatsAppEngineManagementUseCase } from './application/usecases/whatsapp-engine-management.usecase.js';
import { SystemSettingsUseCase } from './application/usecases/system-settings.usecase.js';
import { GatewayRouteMessageUseCase } from './application/usecases/gateway-route-message.usecase.js';
import { GetClientStatusUseCase } from './application/usecases/get-client-status.usecase.js';
import { BotCommandService } from './application/services/bot-command.service.js';
import { HandleMessageUseCase } from './application/usecases/handle-message.usecase.js';
import { createAdminRouter } from './presentation/controllers/admin.controller.js';
import { createGatewayRouter } from './presentation/controllers/gateway.controller.js';

async function bootstrap() {
  console.log(`[Bootstrap] Memulai WAGateway Pro Enterprise [Clean Architecture]...`);

  // 1. Inisialisasi Database Storage & WhatsApp Client
  const useSupabase = Boolean(ENV.SUPABASE_URL && ENV.SUPABASE_KEY);
  let supabaseClient: any = null;

  let dashboardUserRepo: any;
  let clientRepo: any;
  let apiKeyRepo: any;
  let engineRepo: any;
  let settingsRepo: any;
  let logRepo: any;

  if (useSupabase) {
    console.log(`[Storage] 🌐 Database mode: SUPABASE CLOUD (${ENV.SUPABASE_URL})`);
    supabaseClient = createClient(ENV.SUPABASE_URL, ENV.SUPABASE_KEY);

    dashboardUserRepo = new SupabaseDashboardUserRepository(supabaseClient);
    clientRepo = new SupabaseClientRepository(supabaseClient);
    apiKeyRepo = new SupabaseApiKeyRepository(supabaseClient);
    engineRepo = new SupabaseWhatsAppEngineRepository(supabaseClient);
    settingsRepo = new SupabaseSystemSettingsRepository(supabaseClient);
    logRepo = new SupabaseMessageLogRepository(supabaseClient);
  } else {
    console.log(`[Storage] 💾 Database mode: LOCAL JSON FILE (${ENV.SESSION_DIR}/database.json)`);
    const storageContext = new JsonStorageContext(ENV.SESSION_DIR);

    dashboardUserRepo = new JsonDashboardUserRepository(storageContext);
    clientRepo = new JsonClientRepository(storageContext);
    apiKeyRepo = new JsonApiKeyRepository(storageContext);
    engineRepo = new JsonWhatsAppEngineRepository(storageContext);
    settingsRepo = new JsonSystemSettingsRepository(storageContext);
    logRepo = new JsonMessageLogRepository(storageContext);
  }

  // Inisialisasi WhatsApp Client (dengan Supabase Cloud Auth Persistence jika aktif)
  const whatsappClient = new BaileysClientAdapter(
    ENV.SESSION_DIR,
    ENV.AUTO_RECONNECT,
    supabaseClient || undefined,
    ENV.SESSION_ID
  );

  // 2. Inisialisasi Application Use Cases
  const authUseCase = new AuthDashboardUseCase(dashboardUserRepo);
  const dashboardUserManagementUseCase = new DashboardUserManagementUseCase(dashboardUserRepo);
  const clientManagementUseCase = new ClientManagementUseCase(clientRepo, apiKeyRepo);
  const engineManagementUseCase = new WhatsAppEngineManagementUseCase(engineRepo);
  const settingsUseCase = new SystemSettingsUseCase(settingsRepo);

  const gatewayRouteMessageUseCase = new GatewayRouteMessageUseCase(
    apiKeyRepo,
    clientRepo,
    engineRepo,
    logRepo,
    whatsappClient
  );
  const getClientStatusUseCase = new GetClientStatusUseCase(apiKeyRepo, clientRepo);

  // Bot Auto Reply Use Case (untuk pesan masuk langsung ke nomor WA bot)
  const commandService = new BotCommandService();
  const handleMessageUseCase = new HandleMessageUseCase(whatsappClient, commandService);
  whatsappClient.onMessage(async (msg) => {
    await handleMessageUseCase.execute(msg);
  });

  // 3. Inisialisasi Presentation Web Server (Express)
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Mount Admin Dashboard & Controller
  const adminRouter = createAdminRouter(
    clientManagementUseCase,
    authUseCase,
    dashboardUserManagementUseCase,
    engineManagementUseCase,
    settingsUseCase,
    whatsappClient
  );
  app.use('/', adminRouter);

  // Mount Client Gateway API v1
  const gatewayRouter = createGatewayRouter(gatewayRouteMessageUseCase, getClientStatusUseCase, whatsappClient);
  app.use('/v1', gatewayRouter);

  // 4. Jalankan Web Server
  app.listen(ENV.PORT, () => {
    console.log(`[Express] 👑 Admin Login Page: http://localhost:${ENV.PORT}/login`);
    console.log(`[Express] 🛡️ Admin Dashboard (Protected): http://localhost:${ENV.PORT}/`);
    console.log(`[Express] ⚡ Client Gateway Endpoint: http://localhost:${ENV.PORT}/v1/messages/send`);
    console.log(`[Express] 📖 Client Docs Endpoint: http://localhost:${ENV.PORT}/v1/docs`);

    // Layanan Keep-Alive (Self-Ping agar Render Free tidak pernah tertidur/spin-down)
    if (ENV.KEEP_ALIVE && ENV.APP_URL) {
      const pingUrl = `${ENV.APP_URL.replace(/\/$/, '')}/v1/docs`;
      console.log(`[KeepAlive] ⏱️ Mengaktifkan self-ping otomatis setiap 10 menit ke: ${pingUrl}`);
      setInterval(async () => {
        try {
          const res = await fetch(pingUrl);
          console.log(`[KeepAlive] 💓 Self-ping berhasil (Status: ${res.status}) pada ${new Date().toISOString()}`);
        } catch (err: any) {
          console.warn(`[KeepAlive] ⚠️ Gagal self-ping: ${err.message}`);
        }
      }, 10 * 60 * 1000);
    }
  });

  // 5. Hubungkan ke Socket WhatsApp
  await whatsappClient.connect();
}

bootstrap().catch((err) => {
  console.error('[Fatal Error] Gagal menjalankan aplikasi:', err);
  process.exit(1);
});
