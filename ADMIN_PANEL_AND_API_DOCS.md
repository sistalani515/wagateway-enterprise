# 👑 WhatsApp Gateway Provider: Admin Control Panel & Client API Specification

> **Arsitektur:** Anda sebagai **Admin** mengontrol seluruh klien, masa aktif (*expired date*), kuota, dan secret key via Web Dashboard. Klien/User hanya menerima **API Key**, **Endpoint URL**, dan **Dokumentasi Integrasi API**.

---

## 1. Diagram Alur Sistem (Admin Control Model)

```mermaid
flowchart TD
    subgraph AdminLayer["Ruang Kontrol Admin"]
        Admin["👑 Anda (Admin)"]
        CF_Dashboard["Web Dashboard (Cloudflare Pages)<br/>(Supabase Auth Khusus Admin)"]
    end

    subgraph CoreGateway["Cloudflare Worker (API Gateway & Enforcer)"]
        EdgeWorker["Gateway Validator"]
        CheckAuth{"1. Cek API Key?<br/>2. Cek Expired Date?<br/>3. Cek Status Aktif?"}
    end

    subgraph DatabaseLayer["Supabase PostgreSQL"]
        DB_Clients[("Tabel Clients<br/>(Expired Date, Quota, Status)")]
        DB_Keys[("Tabel API Keys")]
        DB_Logs[("Tabel Message Logs")]
        DB_Engine[("Tabel HF Engines")]
    end

    subgraph WorkerEngine["Hugging Face Spaces (Worker Node)"]
        BaileysNode["Baileys Engine Container<br/>(Protected by Internal Secret)"]
        WhatsAppNetwork["WhatsApp Network"]
    end

    subgraph ClientLayer["Klien / Konsumen API"]
        Klien["🏢 Aplikasi Klien / User Luar<br/>(Web, POS, ERP, CRM)"]
    end

    %% Alur Admin
    Admin -->|Login & Atur User, Expired, Secret| CF_Dashboard
    CF_Dashboard -->|Kelola Data| DB_Clients
    CF_Dashboard -->|Daftarkan HF Engine & Secret| DB_Engine

    %% Alur Transaksi Klien
    Klien -->|POST /v1/messages/send<br/>Header: x-api-key| EdgeWorker
    EdgeWorker --> CheckAuth
    CheckAuth -->|Query Cek| DB_Clients
    CheckAuth -- "Expired / Invalid" -->|403 Forbidden: Expired| Klien
    CheckAuth -- "Valid & Aktif" -->|Forward Request + x-service-secret| BaileysNode
    BaileysNode -->|Kirim Pesan| WhatsAppNetwork
    EdgeWorker -.->|Catat Log Pengiriman| DB_Logs
```

---

## 2. Fitur Dashboard Admin (Cloudflare Pages)

Halaman kontrol yang hanya dapat diakses oleh Anda (Admin):
1. **Manajemen Klien (Client Management)**:
   * Tambah Klien baru (Nama, Email/No HP, Organisasi).
   * Menentukan **Masa Aktif (*Expired Date*)** — misal: 30 hari, 1 tahun, atau tanggal kustom.
   * Menentukan **Batas Kuota Pesan** (misal: 10.000 pesan/bulan).
   * Tombol *Action*: **Active**, **Suspend**, atau **Perpanjang Masa Aktif**.
2. **Manajemen Kunci Akses (API Key & Secret)**:
   * Generate `api_key` publik (misal: `wagate_live_9a8f...`).
   * Generate `api_secret` untuk hashing atau webhook signing.
   * Tombol *Revoke* atau *Regenerate Key* jika key klien bocor.
3. **Koneksi Engine Hugging Face (WhatsApp Engine Node)**:
   * Input URL Hugging Face Space (misal: `https://my-engine.hf.space`).
   * Input `x-service-secret` yang didaftarkan di environment HF.
   * Status koneksi WhatsApp (Connected / Disconnected / Scan QR).
4. **Monitoring & Log Transaksi**:
   * Total pesan terkirim, gagal, sisa kuota, dan daftar error dari klien.

---

## 3. Skema Database Supabase (DDL SQL)

Jalankan query ini di **Supabase SQL Editor**:

```sql
-- 1. Tabel Klien / Pelanggan Anda
CREATE TABLE public.clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE,
    phone_number VARCHAR(25),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'expired')),
    expired_at TIMESTAMPTZ NOT NULL,            -- Batas masa aktif langganan klien
    monthly_quota INT DEFAULT 5000,             -- Kuota pesan per bulan
    used_quota INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabel API Keys milik Klien
CREATE TABLE public.client_api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    api_key VARCHAR(64) UNIQUE NOT NULL,        -- Key yang digunakan klien di Header x-api-key
    secret_key VARCHAR(64) NOT NULL,            -- Secret key verifikasi
    label VARCHAR(50) DEFAULT 'Default Production Key',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabel Engine Hugging Face (Node Baileys)
CREATE TABLE public.wa_engines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) DEFAULT 'Main HF Engine',
    hf_space_url TEXT NOT NULL,                 -- Contoh: https://wabot-prod.hf.space
    service_secret TEXT NOT NULL,               -- Secret key internal ke HF Space
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tabel Log Riwayat Pesan
CREATE TABLE public.api_message_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    recipient VARCHAR(30) NOT NULL,
    message_content TEXT,
    status VARCHAR(20) NOT NULL,                -- sent, failed, rejected
    error_message TEXT,
    ip_address VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index performa pencarian saat validasi request di Edge
CREATE INDEX idx_api_keys_lookup ON public.client_api_keys(api_key, is_active);
CREATE INDEX idx_clients_status_exp ON public.clients(id, status, expired_at);
```

---

## 4. Logika Validasi Expired & Forwarding di Cloudflare Worker

Berikut algoritma di dalam Cloudflare Worker yang memvalidasi masa aktif sebelum meneruskan pesan:

```typescript
// worker.ts - Cloudflare Worker API Gateway
import { createClient } from '@supabase/supabase-js';

export default {
  async fetch(request: Request, env: any): Promise<Response> {
    const url = new URL(request.url);

    // Endpoint Kirim Pesan
    if (url.pathname === '/v1/messages/send' && request.method === 'POST') {
      const apiKey = request.headers.get('x-api-key');

      if (!apiKey) {
        return jsonResponse({
          success: false,
          error_code: 'MISSING_API_KEY',
          message: 'Header "x-api-key" wajib disertakan.'
        }, 401);
      }

      const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

      // 1. Validasi API Key & Ambil Data Klien
      const { data: keyData, error: keyErr } = await supabase
        .from('client_api_keys')
        .select('*, client:clients(*)')
        .eq('api_key', apiKey)
        .eq('is_active', true)
        .single();

      if (keyErr || !keyData || !keyData.client) {
        return jsonResponse({
          success: false,
          error_code: 'INVALID_API_KEY',
          message: 'API Key tidak valid atau telah dinonaktifkan.'
        }, 403);
      }

      const client = keyData.client;

      // 2. Cek Status Klien (Active/Suspended)
      if (client.status === 'suspended') {
        return jsonResponse({
          success: false,
          error_code: 'ACCOUNT_SUSPENDED',
          message: 'Akun Anda sedang ditangguhkan. Hubungi Administrator.'
        }, 403);
      }

      // 3. Cek Tanggal Expired (Masa Aktif)
      const now = new Date();
      const expiredAt = new Date(client.expired_at);

      if (now > expiredAt) {
        return jsonResponse({
          success: false,
          error_code: 'SUBSCRIPTION_EXPIRED',
          message: `Masa aktif langganan API Anda telah habis pada ${expiredAt.toISOString()}. Silakan perpanjang langganan.`
        }, 403);
      }

      // 4. Cek Kuota
      if (client.used_quota >= client.monthly_quota) {
        return jsonResponse({
          success: false,
          error_code: 'QUOTA_EXCEEDED',
          message: 'Batas kuota pengiriman pesan bulanan Anda telah tercapai.'
        }, 429);
      }

      // 5. Ambil Engine Hugging Face yang Aktif
      const { data: engine } = await supabase
        .from('wa_engines')
        .select('*')
        .eq('is_active', true)
        .limit(1)
        .single();

      if (!engine) {
        return jsonResponse({
          success: false,
          error_code: 'ENGINE_UNAVAILABLE',
          message: 'Layanan WhatsApp engine sedang offline.'
        }, 503);
      }

      // 6. Teruskan Request ke Hugging Face Baileys
      const payload = await request.json();

      try {
        const hfRes = await fetch(`${engine.hf_space_url}/api/send`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-service-secret': engine.service_secret // Secret internal
          },
          body: JSON.stringify(payload)
        });

        const hfResult = await hfRes.json();

        // 7. Update Kuota & Simpan Log Pengiriman (Background Task)
        env.ctx?.waitUntil?.(
          Promise.all([
            supabase.rpc('increment_quota', { client_row_id: client.id }),
            supabase.from('api_message_logs').insert({
              client_id: client.id,
              recipient: payload.to,
              message_content: payload.text,
              status: hfRes.ok ? 'sent' : 'failed'
            })
          ])
        );

        return jsonResponse(hfResult, hfRes.status);
      } catch (err: any) {
        return jsonResponse({
          success: false,
          error_code: 'FORWARD_ERROR',
          message: 'Gagal menghubungi WhatsApp Node: ' + err.message
        }, 502);
      }
    }

    return jsonResponse({ error: 'Endpoint not found' }, 404);
  }
};

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}
```

---

## 5. DOKUMENTASI SPESIFIKASI API (Untuk Diberikan ke Klien/User)

> Dokumen di bawah ini adalah panduan integrasi resmi yang Anda berikan kepada Klien/Developer yang berlangganan layanan WhatsApp Gateway Anda.

---

### 📘 WhatsApp Gateway REST API Documentation

**Base URL**: `https://api.domainanda.com/v1`  
**Format Data**: `JSON`  
**Autentikasi**: Header `x-api-key: <KUNCI_API_ANDA>`

---

#### 1. Autentikasi & Header Standar
Setiap permintaan API wajib menyertakan header berikut:
```http
Content-Type: application/json
x-api-key: your_api_key_here
```

---

#### 2. Endpoint: Kirim Pesan Teks
Mengirim pesan teks langsung ke nomor WhatsApp tujuan.

* **Method**: `POST`
* **URL**: `/messages/send`

##### Request Body:
| Field | Tipe | Wajib | Keterangan |
| :--- | :--- | :--- | :--- |
| `to` | `string` | Ya | Nomor WhatsApp tujuan. Format internasional atau awalan `08` (Contoh: `087759895339` atau `6287759895339`). |
| `text` | `string` | Ya | Isi pesan yang ingin dikirimkan. Mendukung format WhatsApp seperti `*tebal*`, `_miring_`, atau baris baru (`\n`). |

##### Contoh Request (cURL):
```bash
curl -X POST https://api.domainanda.com/v1/messages/send \
  -H "Content-Type: application/json" \
  -H "x-api-key: wagate_live_9a8f27b89c4d" \
  -d '{
    "to": "087759895339",
    "text": "Halo! Pesan konfirmasi pesanan #1042 Anda telah kami terima."
  }'
```

##### Contoh Request (Node.js / Axios):
```javascript
import axios from 'axios';

const response = await axios.post('https://api.domainanda.com/v1/messages/send', {
  to: '087759895339',
  text: 'Halo! Tagihan Anda telah terbit.'
}, {
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': 'wagate_live_9a8f27b89c4d'
  }
});

console.log(response.data);
```

##### Contoh Request (PHP cURL):
```php
<?php
$curl = curl_init();
curl_setopt_array($curl, [
  CURLOPT_URL => "https://api.domainanda.com/v1/messages/send",
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_POST => true,
  CURLOPT_POSTFIELDS => json_encode([
    "to" => "087759895339",
    "text" => "Kode OTP Anda adalah 839201"
  ]),
  CURLOPT_HTTPHEADER => [
    "Content-Type: application/json",
    "x-api-key: wagate_live_9a8f27b89c4d"
  ],
]);
$response = curl_exec($curl);
curl_close($curl);
echo $response;
```

##### Respon Berhasil (`200 OK`):
```json
{
  "success": true,
  "message": "Pesan berhasil dikirim",
  "data": {
    "message_id": "3EB0C89F71A827",
    "recipient": "6287759895339@s.whatsapp.net",
    "timestamp": 1711467890
  }
}
```

---

#### 3. Endpoint: Cek Status Akun & Masa Aktif
Digunakan oleh klien untuk mengetahui sisa kuota dan tanggal kadaluwarsa akun mereka.

* **Method**: `GET`
* **URL**: `/account/status`
* **Headers**: `x-api-key: <KUNCI_API_ANDA>`

##### Respon Berhasil (`200 OK`):
```json
{
  "success": true,
  "data": {
    "client_name": "PT Maju Bersama",
    "status": "active",
    "expired_at": "2027-12-31T23:59:59Z",
    "days_remaining": 365,
    "quota": {
      "monthly_limit": 10000,
      "used": 1420,
      "remaining": 8580
    }
  }
}
```

---

#### 4. Daftar Kode Error (Error Responses)

Jika terjadi kesalahan, API akan merespon dengan format JSON standar:

```json
{
  "success": false,
  "error_code": "SUBSCRIPTION_EXPIRED",
  "message": "Deskripsi alasan error"
}
```

| HTTP Status | `error_code` | Keterangan Solusi |
| :--- | :--- | :--- |
| `401 Unauthorized` | `MISSING_API_KEY` | Header `x-api-key` belum disertakan di request. |
| `403 Forbidden` | `INVALID_API_KEY` | API Key salah, tidak terdaftar, atau dinonaktifkan. |
| `403 Forbidden` | `SUBSCRIPTION_EXPIRED` | **Masa aktif langganan API telah habis.** Hubungi admin untuk perpanjangan. |
| `403 Forbidden` | `ACCOUNT_SUSPENDED` | Akun sedang dinonaktifkan oleh administrator. |
| `429 Too Many Requests` | `QUOTA_EXCEEDED` | Batas kuota pengiriman pesan bulanan telah habis. |
| `400 Bad Request` | `VALIDATION_ERROR` | Nomor tujuan tidak valid atau teks pesan kosong. |
| `503 Service Unavailable`| `ENGINE_UNAVAILABLE`| WhatsApp Server Node sedang melakukan restart/reconnect. |
