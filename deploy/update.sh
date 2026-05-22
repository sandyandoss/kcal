#!/bin/bash
# Pull latest code and restart — run this whenever you push updates
set -e
cd /home/ubuntu/kcal
git pull
cd backend && npm install --production --silent && cd ..
pm2 restart kcal
echo "Updated and restarted."
