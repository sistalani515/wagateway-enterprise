export function renderLoginView(errorMessage?: string): string {
  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Login - WAGateway Pro Admin</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #141210;
      --surface: #1e1b18;
      --surface-card: #27231f;
      --border: #3d3833;
      --text: #f5f2eb;
      --text-muted: #a89f91;
      --primary: #f59e0b;
      --primary-hover: #d97706;
      --primary-subtle: rgba(245, 158, 11, 0.12);
      --danger: #f43f5e;
      --danger-subtle: rgba(244, 63, 94, 0.12);
      --font-main: 'Plus Jakarta Sans', -apple-system, sans-serif;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: var(--bg);
      color: var(--text);
      font-family: var(--font-main);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }

    .login-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 18px;
      width: 100%;
      max-width: 420px;
      padding: 36px 32px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
    }

    .brand {
      display: flex;
      flex-direction: column;
      align-items: center;
      margin-bottom: 28px;
      text-align: center;
    }

    .brand-logo {
      background: linear-gradient(135deg, #f59e0b, #d97706);
      width: 48px;
      height: 48px;
      border-radius: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      color: #141210;
      font-weight: 700;
      margin-bottom: 12px;
      box-shadow: 0 0 20px rgba(245, 158, 11, 0.3);
    }

    .brand-title {
      font-size: 20px;
      font-weight: 700;
      letter-spacing: -0.02em;
    }

    .brand-subtitle {
      font-size: 13px;
      color: var(--text-muted);
      margin-top: 4px;
    }

    .alert {
      background: var(--danger-subtle);
      border: 1px solid rgba(244, 63, 94, 0.3);
      color: var(--danger);
      padding: 10px 14px;
      border-radius: 8px;
      font-size: 13px;
      margin-bottom: 20px;
      display: ${errorMessage ? 'block' : 'none'};
    }

    .form-group {
      margin-bottom: 18px;
    }

    label {
      display: block;
      font-size: 12px;
      font-weight: 600;
      color: var(--text-muted);
      margin-bottom: 6px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    input {
      width: 100%;
      background: var(--surface-card);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 12px 14px;
      color: var(--text);
      font-family: var(--font-main);
      font-size: 14px;
      outline: none;
      transition: border-color 0.2s;
    }

    input:focus {
      border-color: var(--primary);
    }

    .btn {
      width: 100%;
      background: var(--primary);
      color: #141210;
      font-family: var(--font-main);
      font-weight: 700;
      font-size: 14px;
      padding: 12px;
      border-radius: 10px;
      border: none;
      cursor: pointer;
      margin-top: 10px;
      transition: background 0.2s;
    }

    .btn:hover {
      background: var(--primary-hover);
    }

    .demo-hint {
      margin-top: 24px;
      background: rgba(255, 255, 255, 0.03);
      border: 1px dashed var(--border);
      padding: 12px;
      border-radius: 8px;
      font-size: 12px;
      color: var(--text-muted);
      text-align: center;
    }

    .demo-hint code {
      color: var(--primary);
      background: var(--primary-subtle);
      padding: 2px 6px;
      border-radius: 4px;
      font-weight: 600;
    }
  </style>
</head>
<body>

  <div class="login-card">
    <div class="brand">
      <div class="brand-logo">⚡</div>
      <h2 class="brand-title">WAGateway Pro</h2>
      <p class="brand-subtitle">Silakan login untuk mengakses Control Panel</p>
    </div>

    <div id="alert-box" class="alert">${errorMessage || ''}</div>

    <form id="login-form" onsubmit="handleLogin(event)">
      <div class="form-group">
        <label>Username</label>
        <input type="text" id="username" placeholder="Masukkan username admin" value="admin" required autofocus />
      </div>

      <div class="form-group">
        <label>Password</label>
        <input type="password" id="password" placeholder="Masukkan password" value="admin123" required />
      </div>

      <button type="submit" id="btn-submit" class="btn">Masuk ke Dashboard &rarr;</button>
    </form>

    <div class="demo-hint">
      Default Akun Superadmin:<br/>
      Username: <code>admin</code> &bull; Password: <code>admin123</code>
    </div>
  </div>

  <script>
    async function handleLogin(e) {
      e.preventDefault();
      const alertBox = document.getElementById('alert-box');
      const btn = document.getElementById('btn-submit');
      const username = document.getElementById('username').value;
      const password = document.getElementById('password').value;

      btn.disabled = true;
      btn.innerText = 'Memverifikasi...';
      alertBox.style.display = 'none';

      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        });

        const json = await res.json();

        if (res.ok && json.success) {
          window.location.href = '/';
        } else {
          alertBox.innerText = json.error || 'Username atau password salah';
          alertBox.style.display = 'block';
          btn.disabled = false;
          btn.innerText = 'Masuk ke Dashboard \u2192';
        }
      } catch (err) {
        alertBox.innerText = 'Terjadi kesalahan koneksi ke server: ' + err.message;
        alertBox.style.display = 'block';
        btn.disabled = false;
        btn.innerText = 'Masuk ke Dashboard \u2192';
      }
    }
  </script>
</body>
</html>`;
}
