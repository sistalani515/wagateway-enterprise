-- ==============================================================================
-- WAGateway Pro Enterprise - Supabase Database Schema
-- Author: Antigravity Deepmind & sistalani515
-- Compatibility: PostgreSQL 14+, Supabase Cloud
-- ==============================================================================

-- 1. Tabel Baileys Auth Store (Penyimpanan Sesi Persistent Hugging Face)
CREATE TABLE IF NOT EXISTS public.baileys_auth_store (
    session_id TEXT NOT NULL,
    key_id TEXT NOT NULL,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (session_id, key_id)
);

CREATE INDEX IF NOT EXISTS idx_baileys_session ON public.baileys_auth_store (session_id);

-- 2. Tabel Dashboard Users (Staff internal pengelola SaaS)
CREATE TABLE IF NOT EXISTS public.dashboard_users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('superadmin', 'admin', 'operator')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabel Klien API Subscribers
CREATE TABLE IF NOT EXISTS public.clients (
    id TEXT PRIMARY KEY,
    client_name TEXT NOT NULL,
    email TEXT,
    phone_number TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'expired')),
    engine_id TEXT NOT NULL DEFAULT 'engine-local-01',
    expired_at TIMESTAMPTZ NOT NULL,
    monthly_quota INT NOT NULL DEFAULT 10000,
    used_quota INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tabel Kunci API Klien
CREATE TABLE IF NOT EXISTS public.api_keys (
    id TEXT PRIMARY KEY,
    client_id TEXT NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    api_key TEXT UNIQUE NOT NULL,
    secret_key TEXT NOT NULL,
    label TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_keys_lookup ON public.api_keys (api_key) WHERE is_active = TRUE;

-- 5. Tabel WhatsApp Engines (Local Docker & Hugging Face Spaces Nodes)
CREATE TABLE IF NOT EXISTS public.whatsapp_engines (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('local', 'huggingface')),
    url TEXT NOT NULL,
    secret_key TEXT NOT NULL,
    phone_number TEXT,
    status TEXT NOT NULL DEFAULT 'disconnected' CHECK (status IN ('connected', 'disconnected', 'qr_ready')),
    last_ping_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Tabel Pengaturan Sistem Global
CREATE TABLE IF NOT EXISTS public.system_settings (
    id TEXT PRIMARY KEY DEFAULT 'global',
    system_name TEXT NOT NULL DEFAULT 'WAGateway Enterprise Cloud',
    command_prefix TEXT NOT NULL DEFAULT '!',
    default_quota INT NOT NULL DEFAULT 10000,
    default_validity_days INT NOT NULL DEFAULT 30,
    global_webhook_url TEXT,
    maintenance_mode BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Tabel Log Pengiriman Pesan
CREATE TABLE IF NOT EXISTS public.message_logs (
    id TEXT PRIMARY KEY,
    client_id TEXT REFERENCES public.clients(id) ON DELETE SET NULL,
    recipient TEXT NOT NULL,
    message_content TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('sent', 'failed', 'rejected')),
    error_message TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_logs_client ON public.message_logs (client_id, timestamp DESC);

-- 8. Stored Procedure untuk Pengurangan Kuota Atomik (Thread-Safe)
CREATE OR REPLACE FUNCTION public.deduct_client_quota(p_client_id TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    v_limit INT;
    v_used INT;
BEGIN
    SELECT monthly_quota, used_quota INTO v_limit, v_used
    FROM public.clients
    WHERE id = p_client_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

    IF v_used >= v_limit THEN
        RETURN FALSE;
    END IF;

    UPDATE public.clients
    SET used_quota = used_quota + 1,
        updated_at = NOW()
    WHERE id = p_client_id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- 9. SEED DATA DEFAULT (Inisialisasi Awal)
INSERT INTO public.system_settings (id, system_name, command_prefix, default_quota, default_validity_days, maintenance_mode)
VALUES ('global', 'WAGateway Enterprise', '!', 10000, 30, FALSE)
ON CONFLICT (id) DO NOTHING;

-- Superadmin Default: admin / admin123 (SHA-256)
INSERT INTO public.dashboard_users (id, username, password_hash, email, full_name, role)
VALUES (
    'admin-super-01',
    'admin',
    '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9',
    'admin@wagateway.local',
    'Super Administrator',
    'superadmin'
)
ON CONFLICT (username) DO NOTHING;

-- Engine Default
INSERT INTO public.whatsapp_engines (id, name, type, url, secret_key, status)
VALUES 
    ('engine-local-01', 'Local Baileys Docker Engine', 'local', 'http://localhost:7860', 'sec_local_internal_9876', 'disconnected'),
    ('hf-space-01', 'Hugging Face Space Worker', 'huggingface', 'https://myorg-wabot-engine.hf.space', 'sec_hf_internal_default_key', 'disconnected')
ON CONFLICT (id) DO NOTHING;

-- Klien Demo Default
INSERT INTO public.clients (id, client_name, email, status, engine_id, monthly_quota, used_quota, expired_at)
VALUES 
    ('cli_live_demo_01', 'PT Demo Klien (Langganan Aktif)', 'client@demo.com', 'active', 'engine-local-01', 10000, 0, NOW() + INTERVAL '365 days')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.api_keys (id, client_id, api_key, secret_key, label, is_active)
VALUES 
    ('key_live_01', 'cli_live_demo_01', 'wagate_live_demo_active_key_12345', 'sec_client_secret_999', 'Produksi Server Key', TRUE)
ON CONFLICT (api_key) DO NOTHING;
