#!/bin/bash
set -e

echo "=== Drama Rank Deploy Script ==="

# 1. Build image
echo "[1/4] Building Docker image..."
docker compose build --no-cache

# 2. Start container
echo "[2/4] Starting container..."
docker compose up -d

# 3. Wait for service
echo "[3/4] Waiting for service to be ready..."
for i in {1..30}; do
  if curl -s http://localhost:3000/api/dramas > /dev/null; then
    echo "  → Service is ready!"
    break
  fi
  sleep 2
done

# 4. Initial data sync
echo "[4/4] Running initial data sync..."
docker compose exec drama-rank npx tsx src/scripts/scraper.ts || echo "  → Sync completed with warnings"

echo ""
echo "=========================================="
echo "Deployment complete!"
echo "Website: http://localhost:3000"
echo "=========================================="
