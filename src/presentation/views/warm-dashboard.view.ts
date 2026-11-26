import { SessionEntity } from '../../domain/entities/session.entity.js';
import { DashboardUserEntity } from '../../domain/entities/dashboard-user.entity.js';

export function renderWarmAdminDashboard(session: SessionEntity, currentUser: DashboardUserEntity): string {
  const isConnected = session.state === 'connected';
  const isQrReady = session.state === 'qr_ready';
  const statusColor = isConnected ? '#10b981' : isQrReady ? '#f59e0b' : '#ef4444';
  const statusLabel = isConnected ? 'Engine Terhubung' : isQrReady ? 'Scan QR Diperlukan' : 'Menghubungkan...';

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>WAGateway Pro - Enterprise Control Center</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #11100e;
      --sidebar: #181614;
      --surface: #201d19;
      --surface-card: #282420;
      --border: #38332c;
      --border-focus: #f59e0b;
      --text: #f5f2eb;
      --text-muted: #a69c8d;
      --primary: #f59e0b;
      --primary-hover: #d97706;
      --primary-subtle: rgba(245, 158, 11, 0.12);
      --success: #10b981;
      --success-subtle: rgba(16, 185, 129, 0.12);
      --danger: #f43f5e;
      --danger-subtle: rgba(244, 63, 94, 0.12);
      --font-main: 'Plus Jakarta Sans', -apple-system, sans-serif;
      --font-code: 'JetBrains Mono', monospace;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: var(--bg);
      color: var(--text);
      font-family: var(--font-main);
      min-height: 100vh;
      display: flex;
    }

    /* Layout: Sidebar + Main Content */
    .app-sidebar {
      width: 260px;
      background: var(--sidebar);
      border-right: 1px solid var(--border);
      display: flex;
      flex-direction: column;
      flex-shrink: 0;
      height: 100vh;
      position: sticky;
      top: 0;
    }
    .app-main {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-width: 0;
      height: 100vh;
      overflow-y: auto;
    }

    /* Sidebar Header */
    .sidebar-header {
      padding: 24px 20px;
      border-bottom: 1px solid var(--border);
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .brand-logo {
      background: linear-gradient(135deg, #f59e0b, #d97706);
      width: 38px;
      height: 38px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      color: #11100e;
      font-weight: 800;
      box-shadow: 0 0 15px rgba(245, 158, 11, 0.3);
    }
    .brand-title {
      font-size: 16px;
      font-weight: 800;
      letter-spacing: -0.02em;
    }
    .brand-badge {
      font-size: 10px;
      background: var(--primary-subtle);
      color: var(--primary);
      padding: 1px 6px;
      border-radius: 999px;
      border: 1px solid rgba(245, 158, 11, 0.3);
      font-weight: 700;
    }

    /* Sidebar Navigation Links */
    .sidebar-nav {
      padding: 20px 12px;
      display: flex;
      flex-direction: column;
      gap: 4px;
      flex: 1;
      overflow-y: auto;
    }
    .nav-category {
      font-size: 11px;
      font-weight: 700;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.06em;
      padding: 12px 10px 4px 10px;
    }
    .nav-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 14px;
      border-radius: 8px;
      color: var(--text-muted);
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      border: none;
      background: transparent;
      width: 100%;
      text-align: left;
      transition: all 0.2s;
    }
    .nav-item:hover {
      background: var(--surface);
      color: var(--text);
    }
    .nav-item.active {
      background: var(--primary-subtle);
      color: var(--primary);
      border-left: 3px solid var(--primary);
      border-radius: 0 8px 8px 0;
    }
    .nav-item span.icon { font-size: 16px; width: 20px; text-align: center; }

    /* Top Bar */
    .topbar {
      background: var(--surface);
      border-bottom: 1px solid var(--border);
      padding: 14px 32px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      position: sticky;
      top: 0;
      z-index: 40;
    }
    .topbar-title {
      font-size: 16px;
      font-weight: 700;
    }
    .topbar-right {
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .engine-status-pill {
      display: flex;
      align-items: center;
      gap: 8px;
      background: var(--surface-card);
      border: 1px solid var(--border);
      padding: 6px 14px;
      border-radius: 999px;
      font-size: 12px;
    }
    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: ${statusColor};
      box-shadow: 0 0 8px ${statusColor};
    }
    .user-pill {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 13px;
      background: var(--surface-card);
      padding: 5px 12px;
      border-radius: 8px;
      border: 1px solid var(--border);
    }

    /* Content Area */
    .content-area {
      padding: 28px 32px;
      max-width: 1300px;
      width: 100%;
      margin: 0 auto;
    }
    .tab-section { display: none; }
    .tab-section.active { display: block; }

    /* Metric Cards */
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 18px;
      margin-bottom: 24px;
    }
    .metric-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 20px;
      display: flex;
      flex-direction: column;
    }
    .metric-label {
      font-size: 12px;
      color: var(--text-muted);
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .metric-val {
      font-size: 26px;
      font-weight: 800;
      color: var(--text);
      margin-top: 8px;
    }
    .metric-desc {
      font-size: 12px;
      color: var(--text-muted);
      margin-top: 4px;
    }

    /* Cards */
    .card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 14px;
      padding: 24px;
      margin-bottom: 24px;
    }
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      flex-wrap: wrap;
      gap: 12px;
    }
    .card-title {
      font-size: 16px;
      font-weight: 700;
    }

    .notice-box {
      background: rgba(245, 158, 11, 0.08);
      border: 1px solid rgba(245, 158, 11, 0.2);
      border-radius: 10px;
      padding: 14px 18px;
      margin-bottom: 20px;
      font-size: 13px;
      color: #fde68a;
      line-height: 1.6;
    }

    /* Buttons */
    .btn {
      background: var(--primary);
      color: #11100e;
      font-family: var(--font-main);
      font-weight: 700;
      font-size: 13px;
      padding: 8px 16px;
      border-radius: 8px;
      border: none;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: background 0.2s;
    }
    .btn:hover { background: var(--primary-hover); }
    .btn-secondary {
      background: var(--surface-card);
      color: var(--text);
      border: 1px solid var(--border);
    }
    .btn-secondary:hover { background: var(--border); }
    .btn-danger {
      background: var(--danger-subtle);
      color: var(--danger);
      border: 1px solid rgba(244, 63, 94, 0.2);
    }
    .btn-danger:hover { background: rgba(244, 63, 94, 0.3); }

    /* Tables */
    .table-container { overflow-x: auto; }
    table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
      font-size: 13px;
    }
    th {
      color: var(--text-muted);
      font-weight: 600;
      padding: 12px 14px;
      border-bottom: 1px solid var(--border);
    }
    td {
      padding: 14px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      vertical-align: middle;
    }
    tr:last-child td { border-bottom: none; }

    .badge {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 3px 8px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 700;
    }
    .badge-active { background: var(--success-subtle); color: var(--success); }
    .badge-expired { background: var(--danger-subtle); color: var(--danger); }
    .badge-suspended { background: rgba(148, 163, 184, 0.15); color: #94a3b8; }
    .badge-role { background: rgba(245, 158, 11, 0.15); color: var(--primary); }
    .badge-engine { background: rgba(56, 189, 248, 0.15); color: #38bdf8; }

    /* Forms */
    .grid-2 {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: 24px;
    }
    @media (max-width: 960px) {
      .grid-2 { grid-template-columns: 1fr; }
      .app-sidebar { width: 220px; }
    }
    .form-group { margin-bottom: 16px; }
    label {
      display: block;
      font-size: 11px;
      font-weight: 700;
      color: var(--text-muted);
      margin-bottom: 6px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    input, textarea, select {
      width: 100%;
      background: var(--surface-card);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 10px 14px;
      color: var(--text);
      font-family: var(--font-main);
      font-size: 14px;
      outline: none;
      transition: border-color 0.2s;
    }
    input:focus, textarea:focus, select:focus { border-color: var(--border-focus); }
    code {
      font-family: var(--font-code);
      background: rgba(255, 255, 255, 0.06);
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 12px;
      color: #fbbf24;
    }

    /* Modal */
    .modal {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.7);
      backdrop-filter: blur(4px);
      justify-content: center;
      align-items: center;
      z-index: 100;
      padding: 20px;
    }
    .modal.active { display: flex; }
    .modal-content {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 16px;
      width: 100%;
      max-width: 520px;
      padding: 24px;
      box-shadow: 0 20px 40px rgba(0,0,0,0.6);
    }

    /* QR Code Display */
    .qr-container {
      background: #ffffff;
      padding: 16px;
      border-radius: 12px;
      width: 250px;
      height: 250px;
      margin: 16px auto;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .qr-container img { width: 100%; height: 100%; object-fit: contain; }

    /* Toast */
    .toast {
      position: fixed;
      bottom: 24px;
      right: 24px;
      background: var(--surface-card);
      border: 1px solid var(--border);
      padding: 12px 20px;
      border-radius: 8px;
      font-size: 13px;
      color: var(--text);
      box-shadow: 0 10px 20px rgba(0,0,0,0.4);
      display: none;
      z-index: 200;
    }
  </style>
</head>
<body>

  <!-- Left Sidebar Navigation -->
  <aside class="app-sidebar">
    <div class="sidebar-header">
      <div class="brand-logo">⚡</div>
      <div>
        <div class="brand-title">WAGateway Pro</div>
        <span class="brand-badge">CONTROL PANEL</span>
      </div>
    </div>

    <div class="sidebar-nav">
      <div class="nav-category">Navigasi Utama</div>
      <button class="nav-item active" onclick="nav('overview')">
        <span class="icon">📊</span> Ringkasan
      </button>
      <button class="nav-item" onclick="nav('clients')">
        <span class="icon">🏢</span> Klien API (Subscribers)
      </button>
      <button class="nav-item" onclick="nav('keys')">
        <span class="icon">🔑</span> Kunci API Klien
      </button>
      <button class="nav-item" onclick="nav('engines')">
        <span class="icon">📱</span> WhatsApp Engine (HF)
      </button>

      <div class="nav-category">Administrasi</div>
      <button class="nav-item" onclick="nav('users')">
        <span class="icon">🛡️</span> Pengguna Dashboard
      </button>
      <button class="nav-item" onclick="nav('sandbox')">
        <span class="icon">🧪</span> API Sandbox Test
      </button>
      <button class="nav-item" onclick="nav('settings')">
        <span class="icon">⚙️</span> Pengaturan Sistem
      </button>
      <button class="nav-item" onclick="nav('docs')">
        <span class="icon">📖</span> Dokumen API Spek
      </button>
    </div>
  </aside>

  <!-- Main Content Area -->
  <main class="app-main">
    <!-- Top Navigation Bar -->
    <header class="topbar">
      <div class="topbar-title" id="page-title">📊 Ringkasan Sistem</div>
      <div class="topbar-right">
        <div class="engine-status-pill">
          <span class="status-dot"></span>
          <span>${statusLabel}</span>
        </div>
        <div class="user-pill">
          <span>👤 <b>${currentUser.fullName}</b> (<span style="color:var(--primary);">${currentUser.role.toUpperCase()}</span>)</span>
          <button onclick="handleLogout()" class="btn btn-danger" style="padding: 3px 8px; font-size: 11px;">Logout</button>
        </div>
      </div>
    </header>

    <div class="content-area">

      <!-- SECTION 1: OVERVIEW -->
      <section id="sec-overview" class="tab-section active">
        <div class="metrics-grid">
          <div class="metric-card">
            <span class="metric-label">Total Klien API</span>
            <div class="metric-val" id="metric-clients-count">0</div>
            <span class="metric-desc">Perusahaan/Aplikasi Terdaftar</span>
          </div>
          <div class="metric-card">
            <span class="metric-label">Engine WhatsApp</span>
            <div class="metric-val" id="metric-engines-count">0</div>
            <span class="metric-desc">Node Lokal & Hugging Face</span>
          </div>
          <div class="metric-card">
            <span class="metric-label">Pengguna Dashboard</span>
            <div class="metric-val" id="metric-users-count">0</div>
            <span class="metric-desc">Staf Administrator & Operator</span>
          </div>
          <div class="metric-card">
            <span class="metric-label">Status Gateway</span>
            <div class="metric-val" style="color: var(--success); font-size: 20px; margin-top: 14px;">Online 100%</div>
            <span class="metric-desc">REST API Gateway Aktif</span>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <h3 class="card-title">Aktivitas Cepat Sistem</h3>
            <button class="btn btn-secondary" onclick="nav('clients')">Kelola Klien &rarr;</button>
          </div>
          <p style="color: var(--text-muted); font-size: 13px; line-height: 1.6;">
            Gunakan menu di navigasi sebelah kiri untuk mengonfigurasi klien API WhatsApp, memetakan engine Hugging Face yang mereka pakai, mengatur batas expired langganan, dan menguji pengiriman pesan di tab Sandbox.
          </p>
        </div>
      </section>

      <!-- SECTION 2: KLIEN API -->
      <section id="sec-clients" class="tab-section">
        <div class="card">
          <div class="card-header">
            <div>
              <h3 class="card-title">Manajemen Klien API WhatsApp (Subscribers)</h3>
              <p style="font-size: 13px; color: var(--text-muted); margin-top: 4px;">Klien eksternal yang menggunakan API WhatsApp Anda. Terhubung ke ID Engine Hugging Face pilihan.</p>
            </div>
            <button class="btn" onclick="openModal('modal-add-client')">+ Tambah Klien API Baru</button>
          </div>

          <div class="table-container">
            <table>
              <thead>
                <tr>
                  <th>Nama Klien</th>
                  <th>WhatsApp Engine ID</th>
                  <th>Status</th>
                  <th>Tanggal Expired</th>
                  <th>Kuota Pesan</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody id="client-list-body">
                <tr><td colspan="6" style="text-align: center; color: var(--text-muted);">Memuat data klien...</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <!-- SECTION 3: KUNCI API -->
      <section id="sec-keys" class="tab-section">
        <div class="card">
          <div class="card-header">
            <div>
              <h3 class="card-title">Kunci Akses API Klien (Client API Keys)</h3>
              <p style="font-size: 13px; color: var(--text-muted); margin-top: 4px;">Kunci akses yang diberikan ke klien untuk menembak endpoint gateway.</p>
            </div>
          </div>

          <div class="table-container">
            <table>
              <thead>
                <tr>
                  <th>Klien Pemilik</th>
                  <th>Label Key</th>
                  <th>API Key (x-api-key)</th>
                  <th>Status</th>
                  <th>Dibuat</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody id="keys-list-body">
                <tr><td colspan="6" style="text-align: center; color: var(--text-muted);">Memuat data API Keys...</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <!-- SECTION 4: WHATSAPP ENGINE (HUGGING FACE) -->
      <section id="sec-engines" class="tab-section">
        <div class="card">
          <div class="card-header">
            <div>
              <h3 class="card-title">Manajemen WhatsApp Engine & Hugging Face Spaces</h3>
              <p style="font-size: 13px; color: var(--text-muted); margin-top: 4px;">Daftarkan node WhatsApp (Local Docker / Hugging Face Spaces). Klik tombol <b>Status & QR</b> pada masing-masing engine untuk menghubungkan atau melihat pairing QR-nya.</p>
            </div>
            <button class="btn" onclick="openModal('modal-add-engine')">+ Tambah Engine Baru</button>
          </div>

          <div class="table-container">
            <table>
              <thead>
                <tr>
                  <th>Engine ID</th>
                  <th>Nama Node</th>
                  <th>Tipe</th>
                  <th>URL Node</th>
                  <th>Secret Key</th>
                  <th>Status</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody id="engine-list-body">
                <tr><td colspan="7" style="text-align: center; color: var(--text-muted);">Memuat engine...</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <!-- SECTION 5: USER DASHBOARD -->
      <section id="sec-users" class="tab-section">
        <div class="notice-box">
          💡 <b>Pemisahan Akses:</b> Pengguna di bawah ini adalah <b>Operator/Admin Internal</b> yang memiliki hak login ke Web Control Center ini. Berbeda dengan Klien WhatsApp yang hanya memiliki API Key untuk mengirim pesan via REST API.
        </div>

        <div class="card">
          <div class="card-header">
            <div>
              <h3 class="card-title">Daftar Pengguna Dashboard (Staff/Admin)</h3>
              <p style="font-size: 13px; color: var(--text-muted); margin-top: 4px;">Kelola siapa saja yang berhak masuk ke Control Panel ini.</p>
            </div>
            <button class="btn" onclick="openModal('modal-add-user')">+ Tambah User Dashboard</button>
          </div>

          <div class="table-container">
            <table>
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Nama Lengkap</th>
                  <th>Email</th>
                  <th>Peran (Role)</th>
                  <th>Dibuat</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody id="users-list-body">
                <tr><td colspan="6" style="text-align: center; color: var(--text-muted);">Memuat data pengguna...</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <!-- SECTION 6: API SANDBOX -->
      <section id="sec-sandbox" class="tab-section">
        <div class="grid-2">
          <div class="card">
            <h3 class="card-title" style="margin-bottom: 8px;">🧪 Tes Kirim Pesan via API Gateway</h3>
            <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 20px;">
              Simulasikan request klien melalui endpoint <code>POST /v1/messages/send</code> lengkap dengan validasi expired & alokasi engine.
            </p>

            <form id="sandbox-form" onsubmit="handleSandboxSend(event)">
              <div class="form-group">
                <label>Pilih API Key Klien</label>
                <select id="sandbox-key" required></select>
              </div>

              <div class="form-group">
                <label>Nomor Tujuan WhatsApp</label>
                <input type="text" id="sandbox-to" placeholder="Contoh: 087759895339" value="087759895339" required />
              </div>

              <div class="form-group">
                <label>Teks Pesan</label>
                <textarea id="sandbox-text" rows="4" required>Halo! Pesan ini dikirim melalui API Gateway WAGateway Pro.</textarea>
              </div>

              <button type="submit" class="btn" style="width: 100%; justify-content: center;">Kirim Pesan Uji Coba</button>
            </form>
          </div>

          <div class="card">
            <h3 class="card-title" style="margin-bottom: 12px;">Hasil Respon API (JSON)</h3>
            <pre id="sandbox-response" style="background: var(--surface-card); padding: 16px; border-radius: 8px; font-family: var(--font-code); font-size: 12px; color: #a89f91; overflow-x: auto; min-height: 220px;">Menunggu eksekusi uji coba...</pre>
          </div>
        </div>
      </section>

      <!-- SECTION 7: PENGATURAN (SETTINGS) -->
      <section id="sec-settings" class="tab-section">
        <div class="card" style="max-width: 650px;">
          <h3 class="card-title" style="margin-bottom: 8px;">Pengaturan Global Sistem</h3>
          <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 20px;">Konfigurasi default untuk nama brand, kuota, dan masa aktif langganan klien baru.</p>

          <form id="form-settings" onsubmit="handleSaveSettings(event)">
            <div class="form-group">
              <label>Nama Sistem / Brand</label>
              <input type="text" id="setting-system-name" required />
            </div>
            <div class="form-group">
              <label>Prefix Perintah Bot WA</label>
              <input type="text" id="setting-prefix" value="!" required />
            </div>
            <div class="form-group">
              <label>Default Kuota Bulanan Klien Baru</label>
              <input type="number" id="setting-quota" value="5000" required />
            </div>
            <div class="form-group">
              <label>Default Masa Aktif Klien Baru (Hari)</label>
              <input type="number" id="setting-validity" value="30" required />
            </div>
            <div class="form-group">
              <label>Global Webhook URL (Opsional)</label>
              <input type="url" id="setting-webhook" placeholder="https://mybackend.com/wa-webhook" />
            </div>
            <button type="submit" class="btn">Simpan Pengaturan</button>
          </form>
        </div>
      </section>

      <!-- SECTION 8: DOKUMEN API SPEK -->
      <section id="sec-docs" class="tab-section">
        <div class="card">
          <div class="card-header">
            <div>
              <h3 class="card-title">Panduan & Spesifikasi API untuk Klien</h3>
              <p style="font-size: 13px; color: var(--text-muted); margin-top: 4px;">Informasi ini dapat Anda salin dan bagikan langsung ke developer klien Anda.</p>
            </div>
            <a href="/v1/docs" target="_blank" class="btn btn-secondary">Buka Raw JSON Specs &rarr;</a>
          </div>

          <div style="background: var(--surface-card); padding: 20px; border-radius: 10px; font-size: 13px; line-height: 1.7;">
            <h4 style="color: var(--primary); margin-bottom: 8px;">1. Base URL & Header</h4>
            <code>POST /v1/messages/send</code><br/>
            Header: <code>Content-Type: application/json</code> | <code>x-api-key: [KUNCI_API_KLIEN]</code>

            <h4 style="color: var(--primary); margin-top: 16px; margin-bottom: 8px;">2. Contoh Request Body</h4>
            <pre style="background: var(--bg); padding: 12px; border-radius: 6px; font-family: var(--font-code); color: #f5f2eb;">{
  "to": "087759895339",
  "text": "Pemberitahuan: Pesanan Anda telah dikirim."
}</pre>

            <h4 style="color: var(--primary); margin-top: 16px; margin-bottom: 8px;">3. Penanganan Respon Expired</h4>
            <p style="color: var(--text-muted);">Jika langganan klien telah melewati tanggal kadaluarsa, gateway otomatis memblokir pengiriman dengan respon <code>403 Forbidden</code>:</p>
            <pre style="background: var(--bg); padding: 12px; border-radius: 6px; font-family: var(--font-code); color: #f43f5e;">{
  "success": false,
  "error_code": "SUBSCRIPTION_EXPIRED",
  "message": "Masa aktif langganan API Anda telah habis. Silakan hubungi Administrator."
}</pre>
          </div>
        </div>
      </section>

    </div>
  </main>

  <!-- MODAL: Detail Status & Pairing QR Per Engine -->
  <div id="modal-engine-qr" class="modal">
    <div class="modal-content" style="max-width: 480px; text-align: center;">
      <div class="card-header" style="justify-content: space-between; margin-bottom: 12px;">
        <h3 class="card-title" id="modal-engine-title">Status & Pairing QR</h3>
        <button onclick="closeModal('modal-engine-qr')" style="background:transparent; border:none; color:var(--text-muted); font-size:18px; cursor:pointer;">&times;</button>
      </div>

      <div id="modal-engine-loading" style="padding: 30px 0; color: var(--text-muted);">
        Mengambil status & QR code dari engine...
      </div>

      <div id="modal-engine-body" style="display: none;">
        <div style="margin-bottom: 16px;">
          <span id="modal-engine-badge" class="badge">STATUS</span>
          <p id="modal-engine-phone" style="font-size: 13px; color: var(--text-muted); margin-top: 6px;"></p>
        </div>

        <div id="modal-qr-container" style="display: none;">
          <div class="qr-container"><img id="modal-qr-img" src="" alt="QR Code WhatsApp" /></div>
          <p style="font-size: 13px; color: var(--text-muted); margin-top: 8px;">Pindai menggunakan WhatsApp di ponsel Anda.</p>
        </div>

        <div id="modal-connected-box" style="display: none; padding: 24px 0;">
          <div style="font-size: 48px;">✅</div>
          <h4 style="margin-top: 8px; color: var(--success);">Engine WhatsApp Telah Terhubung</h4>
          <p style="font-size: 13px; color: var(--text-muted); margin-top: 4px;">Node ini siap mengirim dan menerima pesan.</p>
        </div>

        <div id="modal-disconnected-box" style="display: none; padding: 24px 0;">
          <div style="font-size: 48px;">⚠️</div>
          <h4 style="margin-top: 8px; color: var(--danger);">Engine Tidak Terhubung</h4>
          <p style="font-size: 13px; color: var(--text-muted); margin-top: 4px;">Pastikan container atau Hugging Face Space sedang aktif.</p>
        </div>

        <div style="display: flex; justify-content: center; gap: 10px; margin-top: 20px;">
          <button class="btn btn-secondary" id="btn-refresh-modal-qr">Segarkan Status</button>
          <button class="btn" onclick="closeModal('modal-engine-qr')">Tutup</button>
        </div>
      </div>
    </div>
  </div>

  <!-- MODAL: Tambah Klien API -->
  <div id="modal-add-client" class="modal">
    <div class="modal-content">
      <div class="card-header">
        <h3 class="card-title">Tambah Klien API Baru</h3>
        <button onclick="closeModal('modal-add-client')" style="background:transparent; border:none; color:var(--text-muted); font-size:18px; cursor:pointer;">&times;</button>
      </div>
      <form id="form-add-client" onsubmit="handleAddClient(event)">
        <div class="form-group">
          <label>Nama Klien / Perusahaan</label>
          <input type="text" id="add-name" placeholder="Misal: CV Berkah Abadi" required />
        </div>
        <div class="form-group">
          <label>Alokasi WhatsApp Engine (Hugging Face / Local)</label>
          <select id="add-engine" required></select>
        </div>
        <div class="form-group">
          <label>Email Klien</label>
          <input type="email" id="add-email" placeholder="client@example.com" />
        </div>
        <div class="form-group">
          <label>No. WhatsApp Klien</label>
          <input type="text" id="add-phone" placeholder="08123456789" />
        </div>
        <div class="form-group">
          <label>Masa Aktif Berakhir (Expired Date)</label>
          <input type="date" id="add-expired" required />
        </div>
        <div class="form-group">
          <label>Kuota Pesan Bulanan</label>
          <input type="number" id="add-quota" value="5000" required />
        </div>
        <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:20px;">
          <button type="button" class="btn btn-secondary" onclick="closeModal('modal-add-client')">Batal</button>
          <button type="submit" class="btn">Simpan & Buat API Key</button>
        </div>
      </form>
    </div>
  </div>

  <!-- MODAL: Tambah WhatsApp Engine (Hugging Face) -->
  <div id="modal-add-engine" class="modal">
    <div class="modal-content">
      <div class="card-header">
        <h3 class="card-title">Tambah WhatsApp Engine (Hugging Face)</h3>
        <button onclick="closeModal('modal-add-engine')" style="background:transparent; border:none; color:var(--text-muted); font-size:18px; cursor:pointer;">&times;</button>
      </div>
      <form id="form-add-engine" onsubmit="handleAddEngine(event)">
        <div class="form-group">
          <label>Engine ID Unik</label>
          <input type="text" id="engine-id" placeholder="misal: hf-node-02" required />
        </div>
        <div class="form-group">
          <label>Nama Node Label</label>
          <input type="text" id="engine-name" placeholder="misal: Hugging Face Node Singapore" required />
        </div>
        <div class="form-group">
          <label>Tipe Node</label>
          <select id="engine-type">
            <option value="huggingface">Hugging Face Space (Cloud)</option>
            <option value="local">Local Docker Socket</option>
          </select>
        </div>
        <div class="form-group">
          <label>URL Hugging Face Space</label>
          <input type="url" id="engine-url" placeholder="https://username-wabot.hf.space" required />
        </div>
        <div class="form-group">
          <label>Shared Service Secret Key</label>
          <input type="text" id="engine-secret" placeholder="Secret key x-service-secret yang didaftarkan di HF" required />
        </div>
        <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:20px;">
          <button type="button" class="btn btn-secondary" onclick="closeModal('modal-add-engine')">Batal</button>
          <button type="submit" class="btn">Simpan Engine</button>
        </div>
      </form>
    </div>
  </div>

  <!-- MODAL: Tambah User Dashboard -->
  <div id="modal-add-user" class="modal">
    <div class="modal-content">
      <div class="card-header">
        <h3 class="card-title">Tambah Pengguna Dashboard</h3>
        <button onclick="closeModal('modal-add-user')" style="background:transparent; border:none; color:var(--text-muted); font-size:18px; cursor:pointer;">&times;</button>
      </div>
      <form id="form-add-user" onsubmit="handleAddUser(event)">
        <div class="form-group">
          <label>Username</label>
          <input type="text" id="user-username" placeholder="operator_andi" required />
        </div>
        <div class="form-group">
          <label>Nama Lengkap</label>
          <input type="text" id="user-fullname" placeholder="Andi Wijaya" required />
        </div>
        <div class="form-group">
          <label>Email Staf</label>
          <input type="email" id="user-email" placeholder="andi@kantor.com" required />
        </div>
        <div class="form-group">
          <label>Password Awal</label>
          <input type="password" id="user-password" placeholder="Minimal 6 karakter" required />
        </div>
        <div class="form-group">
          <label>Peran (Role)</label>
          <select id="user-role">
            <option value="admin">Admin</option>
            <option value="operator">Operator (Read-only)</option>
            <option value="superadmin">Superadmin</option>
          </select>
        </div>
        <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:20px;">
          <button type="button" class="btn btn-secondary" onclick="closeModal('modal-add-user')">Batal</button>
          <button type="submit" class="btn">Simpan User</button>
        </div>
      </form>
    </div>
  </div>

  <!-- Toast Notification -->
  <div id="toast" class="toast">Aksi berhasil dijalankan</div>

  <script>
    let activeModalEngineId = '';
    const titles = {
      overview: '📊 Ringkasan Sistem',
      clients: '🏢 Manajemen Klien API (Subscribers)',
      keys: '🔑 Kunci Akses API Klien',
      engines: '📱 WhatsApp Engine (Hugging Face)',
      users: '🛡️ Pengguna Dashboard (Staff/Admin)',
      sandbox: '🧪 API Sandbox Test',
      settings: '⚙️ Pengaturan Sistem',
      docs: '📖 Spek Dokumen Klien'
    };

    function nav(tabId) {
      document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));
      document.querySelectorAll('.tab-section').forEach(sec => sec.classList.remove('active'));
      event.currentTarget.classList.add('active');
      document.getElementById('sec-' + tabId).classList.add('active');
      document.getElementById('page-title').innerText = titles[tabId] || 'WAGateway Pro';

      if (tabId === 'overview') loadOverview();
      if (tabId === 'clients') loadClients();
      if (tabId === 'keys') loadKeys();
      if (tabId === 'engines') loadEngines();
      if (tabId === 'users') loadUsers();
      if (tabId === 'sandbox') loadSandboxKeys();
      if (tabId === 'settings') loadSettings();
    }

    function showToast(msg) {
      const toast = document.getElementById('toast');
      toast.innerText = msg;
      toast.style.display = 'block';
      setTimeout(() => { toast.style.display = 'none'; }, 3000);
    }

    function openModal(id) {
      document.getElementById(id).classList.add('active');
      if (id === 'modal-add-client') {
        const d = new Date();
        d.setMonth(d.getMonth() + 1);
        document.getElementById('add-expired').value = d.toISOString().split('T')[0];
        loadEnginesDropdown();
      }
    }
    function closeModal(id) {
      document.getElementById(id).classList.remove('active');
    }

    async function handleLogout() {
      if (!confirm('Apakah Anda yakin ingin logout dari dashboard?')) return;
      await fetch('/api/auth/logout', { method: 'POST' });
      window.location.href = '/login';
    }

    async function loadOverview() {
      try {
        const [resClients, resEngines, resUsers] = await Promise.all([
          fetch('/api/admin/clients').then(r => r.json()),
          fetch('/api/admin/engines').then(r => r.json()),
          fetch('/api/admin/users').then(r => r.json())
        ]);

        document.getElementById('metric-clients-count').innerText = resClients.data?.length || 0;
        document.getElementById('metric-engines-count').innerText = resEngines.data?.length || 0;
        document.getElementById('metric-users-count').innerText = resUsers.data?.length || 0;
      } catch (err) {
        console.error(err);
      }
    }

    // Load Clients
    async function loadClients() {
      try {
        const res = await fetch('/api/admin/clients');
        const json = await res.json();
        const tbody = document.getElementById('client-list-body');
        if (!json.data || json.data.length === 0) {
          tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:var(--text-muted);">Belum ada klien terdaftar.</td></tr>';
          return;
        }

        tbody.innerHTML = json.data.map(c => {
          const expDate = new Date(c.expiredAt);
          const isExpired = new Date() > expDate;
          const badgeClass = c.status === 'suspended' ? 'badge-suspended' : (isExpired ? 'badge-expired' : 'badge-active');
          const badgeText = c.status === 'suspended' ? 'SUSPENDED' : (isExpired ? 'EXPIRED' : 'AKTIF');

          return \`<tr>
            <td>
              <b>\${c.clientName}</b><br/>
              <span style="color:var(--text-muted); font-size:12px;">\${c.email || '-'}<br/>\${c.phoneNumber || '-'}</span>
            </td>
            <td><span class="badge badge-engine">\${c.engineId || 'engine-local-01'}</span></td>
            <td><span class="badge \${badgeClass}">\${badgeText}</span></td>
            <td>\${expDate.toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' })}</td>
            <td>\${c.usedQuota} / \${c.monthlyQuota} pesan</td>
            <td>
              <button class="btn btn-secondary" style="padding:4px 8px; font-size:11px;" onclick="handleGenerateKey('\${c.id}')">+ Key</button>
              <button class="btn btn-danger" style="padding:4px 8px; font-size:11px;" onclick="handleDeleteClient('\${c.id}')">Hapus</button>
            </td>
          </tr>\`;
        }).join('');
      } catch (err) {
        console.error(err);
      }
    }

    // Load Engines Dropdown
    async function loadEnginesDropdown() {
      try {
        const res = await fetch('/api/admin/engines');
        const json = await res.json();
        const sel = document.getElementById('add-engine');
        sel.innerHTML = '';
        (json.data || []).forEach(e => {
          const opt = document.createElement('option');
          opt.value = e.id;
          opt.innerText = \`\${e.name} (\${e.id})\`;
          sel.appendChild(opt);
        });
      } catch (err) { console.error(err); }
    }

    // Load Engines List with Action "Status & QR"
    async function loadEngines() {
      try {
        const res = await fetch('/api/admin/engines');
        const json = await res.json();
        const tbody = document.getElementById('engine-list-body');
        if (!json.data || json.data.length === 0) {
          tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:var(--text-muted);">Belum ada engine terdaftar.</td></tr>';
          return;
        }

        tbody.innerHTML = json.data.map(e => \`<tr>
          <td><code>\${e.id}</code></td>
          <td><b>\${e.name}</b></td>
          <td><span class="badge badge-engine">\${e.type.toUpperCase()}</span></td>
          <td style="font-family:var(--font-code); font-size:12px;">\${e.url}</td>
          <td><code>\${e.secretKey.slice(0, 10)}...</code></td>
          <td><span class="badge \${e.status === 'connected' ? 'badge-active' : 'badge-expired'}">\${e.status.toUpperCase()}</span></td>
          <td style="display:flex; gap:6px; flex-wrap:wrap;">
            <button class="btn btn-secondary" style="padding:4px 8px; font-size:11px;" onclick="openEngineStatusModal('\${e.id}', '\${e.name}')">🔍 Status & QR</button>
            <button class="btn btn-secondary" style="padding:4px 8px; font-size:11px;" onclick="handlePingEngine('\${e.id}')">⚡ Ping</button>
            \${e.type !== 'local' ? \`<button class="btn btn-danger" style="padding:4px 8px; font-size:11px;" onclick="handleDeleteEngine('\${e.id}')">Hapus</button>\` : ''}
          </td>
        </tr>\`).join('');
      } catch (err) { console.error(err); }
    }

    // Open Modal Status & QR per Engine
    async function openEngineStatusModal(engineId, engineName) {
      activeModalEngineId = engineId;
      document.getElementById('modal-engine-title').innerText = \`Status & Pairing: \${engineName} (\${engineId})\`;
      document.getElementById('modal-engine-loading').style.display = 'block';
      document.getElementById('modal-engine-body').style.display = 'none';
      openModal('modal-engine-qr');

      document.getElementById('btn-refresh-modal-qr').onclick = () => fetchEngineStatusData(engineId);
      await fetchEngineStatusData(engineId);
    }

    async function fetchEngineStatusData(engineId) {
      document.getElementById('modal-engine-loading').style.display = 'block';
      document.getElementById('modal-engine-body').style.display = 'none';

      try {
        const res = await fetch(\`/api/admin/engines/\${engineId}/status-qr\`);
        const json = await res.json();
        const data = json.data;

        document.getElementById('modal-engine-loading').style.display = 'none';
        document.getElementById('modal-engine-body').style.display = 'block';

        const badge = document.getElementById('modal-engine-badge');
        const phone = document.getElementById('modal-engine-phone');
        const qrBox = document.getElementById('modal-qr-container');
        const connectedBox = document.getElementById('modal-connected-box');
        const disconnectedBox = document.getElementById('modal-disconnected-box');
        const qrImg = document.getElementById('modal-qr-img');

        // Reset display
        qrBox.style.display = 'none';
        connectedBox.style.display = 'none';
        disconnectedBox.style.display = 'none';

        if (data.state === 'connected') {
          badge.className = 'badge badge-active';
          badge.innerText = 'TERHUBUNG (CONNECTED)';
          phone.innerText = data.connectedNumber ? \`Nomor WhatsApp: \${data.connectedNumber} (\${data.userName || 'User'})\` : 'Nomor WhatsApp terhubung';
          connectedBox.style.display = 'block';
        } else if (data.state === 'qr_ready' && data.qrDataUrl) {
          badge.className = 'badge badge-role';
          badge.innerText = 'MENUNGGU SCAN QR';
          phone.innerText = 'Scan QR di bawah untuk menghubungkan nomor WhatsApp ke node ini.';
          qrImg.src = data.qrDataUrl;
          qrBox.style.display = 'block';
        } else {
          badge.className = 'badge badge-expired';
          badge.innerText = 'OFFLINE / DISCONNECTED';
          phone.innerText = 'Koneksi ke WhatsApp socket belum aktif atau sedang terputus.';
          disconnectedBox.style.display = 'block';
        }
      } catch (err) {
        document.getElementById('modal-engine-loading').innerText = 'Gagal memuat status: ' + err.message;
      }
    }

    // Load API Keys
    async function loadKeys() {
      try {
        const res = await fetch('/api/admin/clients');
        const json = await res.json();
        const tbody = document.getElementById('keys-list-body');
        const allKeys = [];
        json.data.forEach(c => {
          (c.apiKeys || []).forEach(k => {
            allKeys.push({ ...k, clientName: c.clientName });
          });
        });

        if (allKeys.length === 0) {
          tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:var(--text-muted);">Belum ada API Key dibuat.</td></tr>';
          return;
        }

        tbody.innerHTML = allKeys.map(k => \`<tr>
          <td><b>\${k.clientName}</b></td>
          <td>\${k.label}</td>
          <td><code>\${k.apiKey}</code></td>
          <td><span class="badge \${k.isActive ? 'badge-active' : 'badge-expired'}">\${k.isActive ? 'ACTIVE' : 'REVOKED'}</span></td>
          <td>\${new Date(k.createdAt).toLocaleDateString()}</td>
          <td>
            <button class="btn btn-secondary" style="padding:4px 8px; font-size:11px;" onclick="copyText('\${k.apiKey}')">Salin Key</button>
            <button class="btn btn-danger" style="padding:4px 8px; font-size:11px;" onclick="toggleKey('\${k.id}')">\${k.isActive ? 'Revoke' : 'Aktifkan'}</button>
          </td>
        </tr>\`).join('');
      } catch (err) { console.error(err); }
    }

    // Load Users
    async function loadUsers() {
      try {
        const res = await fetch('/api/admin/users');
        const json = await res.json();
        const tbody = document.getElementById('users-list-body');
        if (!json.data || json.data.length === 0) {
          tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:var(--text-muted);">Belum ada user terdaftar.</td></tr>';
          return;
        }

        tbody.innerHTML = json.data.map(u => \`<tr>
          <td><b>\${u.username}</b></td>
          <td>\${u.fullName}</td>
          <td style="color:var(--text-muted);">\${u.email}</td>
          <td><span class="badge badge-role">\${u.role.toUpperCase()}</span></td>
          <td>\${new Date(u.createdAt).toLocaleDateString()}</td>
          <td>
            <button class="btn btn-danger" style="padding:4px 8px; font-size:11px;" onclick="handleDeleteUser('\${u.id}')">Hapus</button>
          </td>
        </tr>\`).join('');
      } catch (err) { console.error(err); }
    }

    // Load Settings
    async function loadSettings() {
      try {
        const res = await fetch('/api/admin/settings');
        const json = await res.json();
        if (json.data) {
          document.getElementById('setting-system-name').value = json.data.systemName || '';
          document.getElementById('setting-prefix').value = json.data.commandPrefix || '!';
          document.getElementById('setting-quota').value = json.data.defaultQuota || 5000;
          document.getElementById('setting-validity').value = json.data.defaultValidityDays || 30;
          document.getElementById('setting-webhook').value = json.data.globalWebhookUrl || '';
        }
      } catch (err) { console.error(err); }
    }

    async function handleSaveSettings(e) {
      e.preventDefault();
      const body = {
        systemName: document.getElementById('setting-system-name').value,
        commandPrefix: document.getElementById('setting-prefix').value,
        defaultQuota: parseInt(document.getElementById('setting-quota').value, 10),
        defaultValidityDays: parseInt(document.getElementById('setting-validity').value, 10),
        globalWebhookUrl: document.getElementById('setting-webhook').value
      };

      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (res.ok) {
        showToast('Pengaturan sistem berhasil diperbarui!');
      }
    }

    async function handleAddEngine(e) {
      e.preventDefault();
      const body = {
        id: document.getElementById('engine-id').value,
        name: document.getElementById('engine-name').value,
        type: document.getElementById('engine-type').value,
        url: document.getElementById('engine-url').value,
        secretKey: document.getElementById('engine-secret').value
      };

      const res = await fetch('/api/admin/engines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const json = await res.json();
      if (res.ok) {
        closeModal('modal-add-engine');
        showToast('Engine baru berhasil ditambahkan!');
        loadEngines();
      } else {
        alert(json.error || 'Gagal menambahkan engine');
      }
    }

    async function handlePingEngine(engineId) {
      showToast('Mem-ping engine ' + engineId + '...');
      const res = await fetch(\`/api/admin/engines/\${engineId}/ping\`, { method: 'POST' });
      const json = await res.json();
      if (res.ok && json.data?.success) {
        showToast(\`Engine aktif! Latency: \${json.data.latencyMs}ms\`);
      } else {
        alert(\`Engine tidak merespon: \${json.data?.status || 'Offline'}\`);
      }
      loadEngines();
    }

    async function handleDeleteEngine(engineId) {
      if (!confirm('Yakin ingin menghapus engine ini?')) return;
      const res = await fetch(\`/api/admin/engines/\${engineId}\`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Engine berhasil dihapus.');
        loadEngines();
      }
    }

    async function loadSandboxKeys() {
      const res = await fetch('/api/admin/clients');
      const json = await res.json();
      const select = document.getElementById('sandbox-key');
      select.innerHTML = '';
      json.data.forEach(c => {
        (c.apiKeys || []).forEach(k => {
          const opt = document.createElement('option');
          opt.value = k.apiKey;
          opt.innerText = \`\${c.clientName} (Engine: \${c.engineId || 'engine-local-01'}) - \${k.apiKey}\`;
          select.appendChild(opt);
        });
      });
    }

    function copyText(txt) {
      navigator.clipboard.writeText(txt);
      showToast('Disalin ke clipboard!');
    }

    async function handleAddClient(e) {
      e.preventDefault();
      const body = {
        clientName: document.getElementById('add-name').value,
        engineId: document.getElementById('add-engine').value,
        email: document.getElementById('add-email').value,
        phoneNumber: document.getElementById('add-phone').value,
        expiredAt: document.getElementById('add-expired').value,
        monthlyQuota: parseInt(document.getElementById('add-quota').value, 10)
      };

      const res = await fetch('/api/admin/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (res.ok) {
        closeModal('modal-add-client');
        showToast('Klien baru berhasil ditambahkan!');
        loadClients();
      }
    }

    async function handleAddUser(e) {
      e.preventDefault();
      const body = {
        username: document.getElementById('user-username').value,
        fullName: document.getElementById('user-fullname').value,
        email: document.getElementById('user-email').value,
        passwordPlain: document.getElementById('user-password').value,
        role: document.getElementById('user-role').value
      };

      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const json = await res.json();
      if (res.ok) {
        closeModal('modal-add-user');
        showToast('User dashboard berhasil ditambahkan!');
        loadUsers();
      } else {
        alert(json.error || 'Gagal menambahkan user');
      }
    }

    async function handleDeleteUser(userId) {
      if (!confirm('Yakin ingin menghapus pengguna dashboard ini?')) return;
      const res = await fetch(\`/api/admin/users/\${userId}\`, { method: 'DELETE' });
      const json = await res.json();
      if (res.ok) {
        showToast('User dashboard berhasil dihapus.');
        loadUsers();
      } else {
        alert(json.error || 'Gagal menghapus user');
      }
    }

    async function handleGenerateKey(clientId) {
      const res = await fetch(\`/api/admin/clients/\${clientId}/keys\`, { method: 'POST' });
      if (res.ok) {
        showToast('Kunci API baru berhasil dibuat!');
        loadClients();
      }
    }

    async function handleDeleteClient(clientId) {
      if (!confirm('Yakin ingin menghapus klien ini beserta seluruh API Key-nya?')) return;
      const res = await fetch(\`/api/admin/clients/\${clientId}\`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Klien berhasil dihapus.');
        loadClients();
      }
    }

    async function toggleKey(keyId) {
      const res = await fetch(\`/api/admin/keys/\${keyId}/toggle\`, { method: 'POST' });
      if (res.ok) {
        showToast('Status key diperbarui.');
        loadKeys();
      }
    }

    async function handleSandboxSend(e) {
      e.preventDefault();
      const apiKey = document.getElementById('sandbox-key').value;
      const to = document.getElementById('sandbox-to').value;
      const text = document.getElementById('sandbox-text').value;
      const out = document.getElementById('sandbox-response');

      out.innerText = 'Mengirim request ke POST /v1/messages/send...';

      try {
        const res = await fetch('/v1/messages/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey
          },
          body: JSON.stringify({ to, text })
        });
        const json = await res.json();
        out.innerText = JSON.stringify(json, null, 2);
      } catch (err) {
        out.innerText = 'Error: ' + err.message;
      }
    }

    // Initial Load
    loadOverview();
  </script>
</body>
</html>`;
}
