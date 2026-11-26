import dotenv from 'dotenv';
dotenv.config();

export const ENV = {
  PORT: parseInt(process.env.PORT || '7860', 10),
  SESSION_DIR: process.env.SESSION_DIR || './sessions',
  SESSION_ID: process.env.SESSION_ID || 'engine-primary',
  BOT_NAME: process.env.BOT_NAME || 'WABot Enterprise',
  COMMAND_PREFIX: process.env.COMMAND_PREFIX || '!',
  AUTO_RECONNECT: process.env.AUTO_RECONNECT !== 'false',
  
  // Supabase Configuration (Optional for Cloud / Hugging Face Persistence)
  SUPABASE_URL: process.env.SUPABASE_URL || '',
  SUPABASE_KEY: process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  
  // Internal Engine Authentication (for Render / Cloudflare communication)
  INTERNAL_ENGINE_SECRET: process.env.INTERNAL_ENGINE_SECRET || 'sec_render_internal_default_key',

  // Render & Cloud Stay-Awake / Self-Ping Service
  APP_URL: process.env.RENDER_EXTERNAL_URL || process.env.APP_URL || '',
  KEEP_ALIVE: process.env.KEEP_ALIVE !== 'false'
};
