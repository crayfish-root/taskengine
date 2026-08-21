#!/usr/bin/env bash
# Runs on the target server (as root) after the app has been rsynced to
# /opt/taskengine. Invoked by .github/workflows/deploy-hetzner.yml with the
# session secret as $1. Installs Node, seeds the DB, builds, and starts the
# app as a systemd service on port 80.
set -euo pipefail

SESSION_SECRET="$1"

curl -fsSL https://deb.nodesource.com/setup_22.x | bash - >/dev/null
apt-get update -qq
apt-get install -y nodejs >/dev/null

cd /opt/taskengine

cat > .env <<ENVEOF
DATABASE_URL="file:./dev.db"
SESSION_SECRET="${SESSION_SECRET}"
ENVEOF

npm ci
npm run db:push
npm run db:seed
npm run build

cat > /etc/systemd/system/taskengine.service <<'SERVICEEOF'
[Unit]
Description=TaskEngine
After=network.target

[Service]
WorkingDirectory=/opt/taskengine
ExecStart=/usr/bin/npm run start -- -p 80
Restart=always
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
SERVICEEOF

systemctl daemon-reload
systemctl enable --now taskengine

if command -v ufw >/dev/null; then
  ufw allow 22/tcp
  ufw allow 80/tcp
  ufw --force enable
fi
