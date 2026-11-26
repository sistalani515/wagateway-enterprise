---
title: WAGateway Pro Enterprise
emoji: 💬
colorFrom: amber
colorTo: emerald
sdk: docker
app_port: 7860
pinned: false
---

# WAGateway Pro Enterprise [Clean Architecture]
> Multi-Tenant WhatsApp Gateway, Admin SaaS Control Dashboard, Baileys Multi-Device Engine with **Hugging Face Spaces**, **Cloudflare Workers**, and **Supabase Cloud Persistence**.

---

## 🏛️ Arsitektur Sistem Produksi

```
[ Frontend / Client Apps ]
          │ (Header: x-api-key)
          ▼
[ Cloudflare Workers API Gateway ] ────(Cek Kuota, Expired & API Key)────► [ Supabase Cloud PostgreSQL ]
          │ (Internal Proxy via x-engine-secret)                                  ▲
          ▼                                                                       │ (Sesi Baileys Auth Store)
[ Hugging Face Spaces Engine ] (Baileys WebSocket Node) ──────────────────────────┘
```

1. **Hugging Face Spaces (Baileys Engine Node)**:
   - Menjalankan container Docker non-root (`user: node`, port `7860`).
   - Menyediakan socket koneksi persisten WhatsApp Multi-Device.
   - **Zero Data Loss**: Sesi WhatsApp (`creds.json` & signal keys) otomatis tersimpan dan disinkronkan ke tabel `baileys_auth_store` di **Supabase**. Meskipun instance HF Spaces tertidur (sleep) atau di-restart, bot langsung menyambung kembali tanpa perlu scan QR ulang.
2. **Cloudflare Worker (Edge API Gateway)**:
   - Validasi `x-api-key`, verifikasi langganan aktif, dan deduksi kuota secara atomik.
   - Meneruskan request pengiriman pesan secara aman ke node engine via header `x-engine-secret`.
3. **Supabase Cloud (Single Source of Truth Database)**:
   - Menyimpan seluruh data `dashboard_users`, `clients`, `api_keys`, `whatsapp_engines`, `system_settings`, `message_logs`, dan `baileys_auth_store`.
4. **Admin Web Control Panel (Modern Warm Aesthetic)**:
   - Web GUI terlindungi otentikasi login JWT HttpOnly Cookie.
   - Manajemen klien langganan, kunci API, node WhatsApp multi-engine, dan pengaturan kuota.

---

## 📁 Struktur Direktori Clean Architecture

```
.
├── src/
│   ├── domain/               # Entitas & Repository Interfaces (Murni Domain)
│   ├── application/          # Use Cases (Logika Bisnis & Orchestrator)
│   ├── infrastructure/       # Adapter Eksternal (Baileys, Supabase, Local JSON)
│   │   ├── whatsapp/         # Baileys Multi-Device & Supabase Auth Store
│   │   └── storage/          # Supabase & JSON Database Adapters
│   ├── presentation/         # Controllers & Views (Warm UI Dashboard, API Gateway)
│   └── config/               # Environment & App Settings
├── cloudflare/               # Cloudflare Worker Edge Gateway (wrangler.toml & Worker source)
├── supabase/                 # Supabase Migration & Database Schema (schema.sql)
├── sessions/                 # Local Session Cache Mount
├── Dockerfile                # Multi-stage Dockerfile untuk Local Docker & Hugging Face
└── docker-compose.yml        # Local Docker Compose Orchestration
```

---

## ⚡ Setup & Deployment Guide

### 1. Supabase Setup
1. Buat proyek baru di [Supabase Dashboard](https://supabase.com).
2. Buka tab **SQL Editor** pada Supabase Dashboard.
3. Jalankan skrip SQL dari file `supabase/schema.sql`.
4. Salin **Project URL** dan **Service Role Key** dari menu *Project Settings > API*.

### 2. Hugging Face Spaces Deployment (Free 24/7 Engine)
1. Buat Space baru di [Hugging Face Spaces](https://huggingface.co/new-space).
2. Pilih **Docker SDK** (Template: **Blank**).
3. Masuk ke **Settings > Variables and secrets** pada Space Anda, tambahkan Secret berikut:
   * `SUPABASE_URL`: URL project Supabase Anda (`https://xyz.supabase.co`).
   * `SUPABASE_KEY`: Service Role Key Supabase Anda.
   * `INTERNAL_ENGINE_SECRET`: Kunci rahasia internal node (misal: `sec_hf_live_secret_999`).
   * `SESSION_ID`: ID sesi unik (misal: `engine-primary`).
4. Push repositori ini ke remote Hugging Face Space.
5. Hugging Face akan otomatis build dan menjalankan container di port 7860.
6. Buka tab Space Anda, login dengan akun admin default (`admin` / `admin123`), buka menu **WhatsApp Engine** dan klik **Status & QR** untuk menautkan perangkat pertama kali. Sesi langsung tersimpan permanen di Supabase!

### 3. Cloudflare Worker Deployment
1. Masuk ke direktori `cloudflare/`:
   ```bash
   cd cloudflare
   npm install
   ```
2. Edit file `wrangler.toml` dan atur variabel environment:
   * `SUPABASE_URL`
   * `SUPABASE_KEY`
   * `ENGINE_URL` (URL Hugging Face Space Anda, misal: `https://username-space.hf.space`)
   * `INTERNAL_ENGINE_SECRET`
3. Deploy ke Cloudflare:
   ```bash
   npx wrangler deploy
   ```

### 4. Menjalankan di Docker Lokal
```bash
docker compose up -d --build
```
Akses Dashboard: **http://localhost:7860**
* Username: `admin`
* Password: `admin123`

---

## 📖 REST API Documentation

### Kirim Pesan WhatsApp
* **Method**: `POST`
* **URL**: `/v1/messages/send`
* **Headers**:
  * `Content-Type: application/json`
  * `x-api-key: wagate_live_demo_active_key_12345`
* **Request Body**:
  ```json
  {
    "to": "087759895339",
    "text": "Halo! Pesan ini dikirim dari WhatsApp Gateway."
  }
  ```
* **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Pesan berhasil dikirim",
    "data": {
      "messageId": "MSG_1795687794488_588C0A46",
      "recipient": "6287759895339@s.whatsapp.net",
      "engineUsed": "engine-local-01",
      "timestamp": 1795687794488
    }
  }
  ```

### Cek Sisa Kuota & Masa Aktif
* **Method**: `GET`
* **URL**: `/v1/account/status`
* **Headers**:
  * `x-api-key: wagate_live_demo_active_key_12345`
* **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": {
      "clientName": "PT Demo Klien (Langganan Aktif)",
      "email": "client@demo.com",
      "status": "active",
      "expiredAt": "2027-11-26T09:21:27.778Z",
      "daysRemaining": 365,
      "quota": {
        "monthlyLimit": 10000,
        "used": 7,
        "remaining": 9993
      }
    }
  }
  ```

---

## 🛡️ Lisensi
Private Enterprise License &copy; 2026.
