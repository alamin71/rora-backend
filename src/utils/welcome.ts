import config from '../config';

export const welcome = () => {
  const now = new Date();
  const hours = now.getHours();

  let greeting = 'Good evening';
  if (hours < 12) greeting = 'Good morning';
  else if (hours < 18) greeting = 'Good afternoon';

  const env = config.node_env || 'development';
  const uptimeSeconds = Math.floor(process.uptime());
  const uptime = `${Math.floor(uptimeSeconds / 3600)}h ${Math.floor(
    (uptimeSeconds % 3600) / 60
  )}m ${uptimeSeconds % 60}s`;

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>RORA Backend</title>
  <style>
    :root {
      --ground: #05070c;
      --surface: rgba(255, 255, 255, 0.04);
      --border: rgba(255, 255, 255, 0.08);
      --ink: #edf1f7;
      --ink-muted: #8b96a8;
      --blue: #3e7bfa;
      --red: #e0483f;
      --green: #2fae5c;
    }
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      min-height: 100%;
      background: var(--ground);
      color: var(--ink);
      font-family: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }
    body {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 40px 20px;
    }
    .glow {
      position: fixed;
      inset: 0;
      z-index: 0;
      pointer-events: none;
      background:
        radial-gradient(480px circle at 30% 20%, rgba(62, 123, 250, 0.22), transparent 60%),
        radial-gradient(420px circle at 75% 75%, rgba(47, 174, 92, 0.14), transparent 60%),
        radial-gradient(360px circle at 80% 15%, rgba(224, 72, 63, 0.12), transparent 60%);
    }
    .card {
      position: relative;
      z-index: 1;
      width: 100%;
      max-width: 460px;
      text-align: center;
      animation: fadeUp 0.7s ease-out both;
    }
    .logo-wrap {
      position: relative;
      width: 168px;
      height: 168px;
      margin: 0 auto 8px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .logo-wrap::before {
      content: "";
      position: absolute;
      inset: -20px;
      background: radial-gradient(circle, rgba(62, 123, 250, 0.35), transparent 70%);
      filter: blur(6px);
      border-radius: 50%;
    }
    .logo-wrap img {
      position: relative;
      width: 100%;
      height: 100%;
      object-fit: contain;
      filter: drop-shadow(0 8px 28px rgba(62, 123, 250, 0.45));
    }
    .greeting {
      margin: 4px 0 28px;
      font-size: 14px;
      letter-spacing: 0.02em;
      color: var(--ink-muted);
    }
    .status-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 14px;
      padding: 20px 24px;
      backdrop-filter: blur(6px);
    }
    .status-row {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 9px;
      font-size: 16px;
      font-weight: 600;
    }
    .dot {
      width: 9px;
      height: 9px;
      border-radius: 50%;
      background: var(--green);
      box-shadow: 0 0 0 0 rgba(47, 174, 92, 0.6);
      animation: pulse 2s infinite;
    }
    .meta {
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px solid var(--border);
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px 8px;
      font-size: 12.5px;
      font-family: ui-monospace, "SF Mono", Consolas, monospace;
      color: var(--ink-muted);
      text-align: left;
    }
    .meta b { display: block; color: var(--ink); font-weight: 500; margin-top: 2px; }
    .meta span { text-transform: uppercase; letter-spacing: 0.06em; font-size: 10.5px; }
    footer {
      margin-top: 22px;
      font-size: 12px;
      color: var(--ink-muted);
    }
    footer .brand { color: var(--blue); }

    @keyframes fadeUp {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes pulse {
      0% { box-shadow: 0 0 0 0 rgba(47, 174, 92, 0.55); }
      70% { box-shadow: 0 0 0 9px rgba(47, 174, 92, 0); }
      100% { box-shadow: 0 0 0 0 rgba(47, 174, 92, 0); }
    }
    @media (prefers-reduced-motion: reduce) {
      .card { animation: none; }
      .dot { animation: none; }
    }
  </style>
</head>
<body>
  <div class="glow"></div>
  <div class="card">
    <div class="logo-wrap">
      <img src="/logo.png" alt="RORA" />
    </div>
    <p class="greeting">${greeting} — connecting Eritreans worldwide</p>

    <div class="status-card">
      <div class="status-row"><span class="dot"></span> Server is live</div>
      <div class="meta">
        <div><span>Environment</span><b>${env}</b></div>
        <div><span>Uptime</span><b>${uptime}</b></div>
        <div><span>Server time</span><b>${now.toLocaleTimeString('en-US')}</b></div>
        <div><span>Date</span><b>${now.toLocaleDateString('en-US')}</b></div>
      </div>
    </div>

    <footer><span class="brand">RORA</span> Backend · api/v1</footer>
  </div>
</body>
</html>`;
};
