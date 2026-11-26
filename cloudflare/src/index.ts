/**
 * Cloudflare Worker: WAGateway Pro Enterprise Edge Gateway
 * 
 * Fitur:
 * 1. Edge API Key Verification & Rate Limiting via Supabase
 * 2. Subscription Expiry & Atomic Quota Checking
 * 3. Secure Reverse Proxy ke WhatsApp Engine di Hugging Face Spaces
 * 4. Admin Dashboard Web Proxy ke HF Space
 */

export interface Env {
  SUPABASE_URL: string;
  SUPABASE_KEY: string;
  ENGINE_URL: string;
  INTERNAL_ENGINE_SECRET: string;
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, x-api-key, Authorization, x-engine-secret',
  'Access-Control-Max-Age': '86400'
};

function jsonResponse(data: any, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...CORS_HEADERS
    }
  });
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // 1. Tangani CORS Preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    // 2. Routing REST API Client Gateway: /v1/*
    if (url.pathname.startsWith('/v1/')) {
      return handleApiGateway(request, url, env);
    }

    // 3. Proxy Halaman Admin Dashboard ke Hugging Face Spaces Engine
    return proxyToEngine(request, url, env);
  }
};

async function handleApiGateway(request: Request, url: URL, env: Env): Promise<Response> {
  const path = url.pathname;

  // Endpoint Dokumentasi: GET /v1/docs
  if (path === '/v1/docs' && request.method === 'GET') {
    return jsonResponse({
      title: 'WAGateway Pro Enterprise Cloudflare Edge API Specification',
      version: '1.0.0',
      authentication: {
        type: 'ApiKeyHeader',
        header_name: 'x-api-key'
      },
      endpoints: [
        {
          path: '/v1/messages/send',
          method: 'POST',
          description: 'Kirim pesan teks WhatsApp secara instan',
          headers: { 'x-api-key': 'REQUIRED' },
          body: { to: 'Nomor tujuan', text: 'Isi pesan teks' }
        },
        {
          path: '/v1/account/status',
          method: 'GET',
          description: 'Cek sisa kuota dan tanggal kadaluarsa',
          headers: { 'x-api-key': 'REQUIRED' }
        }
      ]
    });
  }

  // Ambil API Key dari Header atau Query Param
  const apiKey = request.headers.get('x-api-key') || url.searchParams.get('api_key');
  if (!apiKey || !apiKey.trim()) {
    return jsonResponse({ success: false, error_code: 'MISSING_API_KEY', message: 'Header "x-api-key" wajib disertakan' }, 401);
  }

  // Validasi Kunci API dan Ambil Data Klien dari Supabase
  const clientData = await validateApiKeyWithSupabase(apiKey.trim(), env);
  if (!clientData.valid) {
    return jsonResponse({ success: false, error_code: clientData.errorCode, message: clientData.message }, clientData.status);
  }

  const { client } = clientData;

  // Endpoint Cek Status Akun: GET /v1/account/status
  if (path === '/v1/account/status' && request.method === 'GET') {
    const expiredDate = new Date(client.expired_at);
    const daysRemaining = Math.max(0, Math.ceil((expiredDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));

    return jsonResponse({
      success: true,
      data: {
        clientName: client.client_name,
        email: client.email,
        status: client.status,
        expiredAt: client.expired_at,
        daysRemaining,
        quota: {
          monthlyLimit: client.monthly_quota,
          used: client.used_quota,
          remaining: Math.max(0, client.monthly_quota - client.used_quota)
        }
      }
    });
  }

  // Endpoint Kirim Pesan: POST /v1/messages/send
  if (path === '/v1/messages/send' && request.method === 'POST') {
    let body: any;
    try {
      body = await request.json();
    } catch {
      return jsonResponse({ success: false, error_code: 'INVALID_JSON', message: 'Payload body harus berupa JSON valid' }, 400);
    }

    const to = body.to || body.recipient || body.phone || body.number;
    const text = body.text || body.message || body.content;

    if (!to || !to.toString().trim()) {
      return jsonResponse({ success: false, error_code: 'MISSING_RECIPIENT', message: 'Nomor tujuan (to) wajib diisi' }, 400);
    }
    if (!text || !text.toString().trim()) {
      return jsonResponse({ success: false, error_code: 'MISSING_TEXT', message: 'Pesan teks (text) wajib diisi' }, 400);
    }

    // 1. Kurangi Kuota Klien di Supabase Secara Atomik
    const deductSuccess = await deductQuotaInSupabase(client.id, env);
    if (!deductSuccess) {
      return jsonResponse({ success: false, error_code: 'QUOTA_EXCEEDED', message: 'Kuota pesan bulanan Anda telah habis' }, 429);
    }

    // 2. Teruskan Request ke Hugging Face Spaces Engine Node
    const targetEngineUrl = env.ENGINE_URL.replace(/\/$/, '') + '/v1/messages/send';

    try {
      const engineRes = await fetch(targetEngineUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-engine-secret': env.INTERNAL_ENGINE_SECRET || 'sec_hf_internal_default_key',
          'x-api-key': apiKey
        },
        body: JSON.stringify({ to, text })
      });

      const engineJson: any = await engineRes.json();

      // Catat ke Supabase Message Logs
      await logMessageToSupabase(
        client.id,
        to,
        text,
        engineRes.ok ? 'sent' : 'failed',
        engineRes.ok ? undefined : engineJson.message,
        env
      );

      return jsonResponse(engineJson, engineRes.status);
    } catch (err: any) {
      return jsonResponse({
        success: false,
        error_code: 'ENGINE_CONNECTION_FAILED',
        message: `Gagal menghubungi node WhatsApp Hugging Face Spaces: ${err.message}`
      }, 502);
    }
  }

  return jsonResponse({ success: false, message: 'Endpoint tidak ditemukan' }, 404);
}

// Validasi Kunci API via Supabase REST API
async function validateApiKeyWithSupabase(apiKey: string, env: Env): Promise<{
  valid: boolean;
  status: number;
  errorCode: string;
  message: string;
  client?: any;
}> {
  if (!env.SUPABASE_URL || !env.SUPABASE_KEY) {
    // Mode Bypass jika Supabase belum diset
    return {
      valid: true,
      status: 200,
      errorCode: '',
      message: '',
      client: {
        id: 'mock_client',
        client_name: 'Bypass Dev Client',
        status: 'active',
        monthly_quota: 10000,
        used_quota: 0,
        expired_at: new Date(Date.now() + 8640000000).toISOString()
      }
    };
  }

  try {
    const queryUrl = `${env.SUPABASE_URL}/rest/v1/api_keys?api_key=eq.${encodeURIComponent(apiKey)}&is_active=eq.true&select=*,clients(*)`;
    const res = await fetch(queryUrl, {
      headers: {
        'apikey': env.SUPABASE_KEY,
        'Authorization': `Bearer ${env.SUPABASE_KEY}`
      }
    });

    if (!res.ok) {
      return { valid: false, status: 500, errorCode: 'SUPABASE_ERROR', message: 'Gagal memverifikasi API key ke database' };
    }

    const rows: any = await res.json();
    if (!rows || rows.length === 0) {
      return { valid: false, status: 403, errorCode: 'INVALID_API_KEY', message: 'API Key tidak valid atau telah dinonaktifkan' };
    }

    const client = rows[0].clients;
    if (!client) {
      return { valid: false, status: 403, errorCode: 'CLIENT_NOT_FOUND', message: 'Klien pemilik API key tidak ditemukan' };
    }

    if (client.status === 'suspended') {
      return { valid: false, status: 403, errorCode: 'ACCOUNT_SUSPENDED', message: 'Akun Anda sedang ditangguhkan. Hubungi admin.' };
    }

    const expiredDate = new Date(client.expired_at);
    if (expiredDate.getTime() < Date.now()) {
      return { valid: false, status: 403, errorCode: 'SUBSCRIPTION_EXPIRED', message: 'Masa aktif langganan API Anda telah habis' };
    }

    if (client.used_quota >= client.monthly_quota) {
      return { valid: false, status: 429, errorCode: 'QUOTA_EXCEEDED', message: 'Kuota pesan bulanan Anda telah habis' };
    }

    return { valid: true, status: 200, errorCode: '', message: '', client };
  } catch (err: any) {
    return { valid: false, status: 500, errorCode: 'DB_ERROR', message: err.message };
  }
}

// Pengurangan Kuota Atomik via Supabase RPC
async function deductQuotaInSupabase(clientId: string, env: Env): Promise<boolean> {
  if (!env.SUPABASE_URL || !env.SUPABASE_KEY) return true;

  try {
    const rpcUrl = `${env.SUPABASE_URL}/rest/v1/rpc/deduct_client_quota`;
    const res = await fetch(rpcUrl, {
      method: 'POST',
      headers: {
        'apikey': env.SUPABASE_KEY,
        'Authorization': `Bearer ${env.SUPABASE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ p_client_id: clientId })
    });

    if (res.ok) {
      const result: any = await res.json();
      return Boolean(result);
    }
    return false;
  } catch {
    return true;
  }
}

// Log Pengiriman Pesan ke Supabase
async function logMessageToSupabase(
  clientId: string,
  recipient: string,
  text: string,
  status: 'sent' | 'failed',
  errorMessage: string | undefined,
  env: Env
): Promise<void> {
  if (!env.SUPABASE_URL || !env.SUPABASE_KEY) return;

  try {
    const logUrl = `${env.SUPABASE_URL}/rest/v1/message_logs`;
    await fetch(logUrl, {
      method: 'POST',
      headers: {
        'apikey': env.SUPABASE_KEY,
        'Authorization': `Bearer ${env.SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        id: `LOG_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        client_id: clientId,
        recipient,
        message_content: text.length > 150 ? text.slice(0, 150) + '...' : text,
        status,
        error_message: errorMessage || null,
        timestamp: new Date().toISOString()
      })
    });
  } catch {}
}

// Reverse Proxy Halaman Admin Dashboard ke Hugging Face Spaces
async function proxyToEngine(request: Request, url: URL, env: Env): Promise<Response> {
  const targetUrl = new URL(url.pathname + url.search, env.ENGINE_URL);

  const proxyReq = new Request(targetUrl.toString(), {
    method: request.method,
    headers: request.headers,
    body: request.body,
    redirect: 'follow'
  });

  try {
    return await fetch(proxyReq);
  } catch (err: any) {
    return new Response(`Gagal menghubungkan ke Hugging Face Spaces: ${err.message}`, { status: 502 });
  }
}
