#!/bin/bash
# Kcal EC2 Setup Script
# Run this once on a fresh Ubuntu 22.04 EC2 instance as ubuntu user
# Usage: bash setup.sh

set -e
echo ""
echo "=== Kcal EC2 Setup ==="
echo ""

# ── 1. System update ──────────────────────────────────────────────
echo "[1/7] Updating system..."
sudo apt-get update -qq && sudo apt-get upgrade -y -qq

# ── 2. Node.js 22 ─────────────────────────────────────────────────
echo "[2/7] Installing Node.js 22..."
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - > /dev/null 2>&1
sudo apt-get install -y nodejs -qq

# ── 3. Nginx ──────────────────────────────────────────────────────
echo "[3/7] Installing Nginx..."
sudo apt-get install -y nginx -qq

# ── 4. PM2 ────────────────────────────────────────────────────────
echo "[4/7] Installing PM2..."
sudo npm install -g pm2 --silent

# ── 5. Clone repo ─────────────────────────────────────────────────
echo "[5/7] Cloning repo..."
cd /home/ubuntu
if [ -d "kcal" ]; then
  echo "  repo exists, pulling latest..."
  cd kcal && git pull
else
  git clone https://github.com/sandyandoss/kcal.git
  cd kcal
fi

# Install backend deps
cd backend && npm install --production --silent && cd ..

# ── 6. Environment file ───────────────────────────────────────────
echo "[6/7] Setting up .env..."
if [ ! -f "backend/.env" ]; then
  cp backend/.env.example backend/.env
  JWT=$(node -e "console.log(require('crypto').randomBytes(48).toString('hex'))")
  sed -i "s|change_this_to_a_long_random_string|$JWT|" backend/.env
  echo ""
  echo "  !! ACTION REQUIRED: add your Anthropic API key:"
  echo "     nano /home/ubuntu/kcal/backend/.env"
  echo ""
fi

# ── 7. PM2 + Nginx ────────────────────────────────────────────────
echo "[7/7] Starting services..."

# PM2
cd /home/ubuntu/kcal
NODE_ENV=production pm2 start backend/src/index.js --name kcal --no-autorestart=false
pm2 save
sudo pm2 startup systemd -u ubuntu --hp /home/ubuntu | tail -1 | sudo bash

# Nginx config
sudo cp /home/ubuntu/kcal/deploy/nginx.conf /etc/nginx/sites-available/kcal
sudo ln -sf /etc/nginx/sites-available/kcal /etc/nginx/sites-enabled/kcal
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl restart nginx

echo ""
echo "=== Done! ==="
echo ""
echo "  App is live at: http://$(curl -s ifconfig.me)"
echo ""
echo "  Next steps:"
echo "  1. Add your Anthropic API key: nano /home/ubuntu/kcal/backend/.env"
echo "  2. Restart app:                pm2 restart kcal"
echo "  3. (Optional) Point a domain and run: sudo certbot --nginx"
echo ""
