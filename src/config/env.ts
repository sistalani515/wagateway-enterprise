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
  
  // Internal Engine Authentication (for HF Spaces / Cloudflare communication)
  INTERNAL_ENGINE_SECRET: process.env.INTERNAL_ENGINE_SECRET || 'sec_hf_internal_default_key'
};
