#!/bin/bash
# Порт 3000 дээрх процессыг унтрааж, TMS dev серверийг асаана

PORT=3000
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo "Порт $PORT дээрх процесс шалгаж байна..."
PID=$(lsof -ti :$PORT 2>/dev/null)

if [ -n "$PID" ]; then
  echo "Порт $PORT дээр процесс олдлоо (PID: $PID). Унтрааж байна..."
  kill -9 $PID 2>/dev/null
  sleep 1
  echo "Унтарсан."
else
  echo "Порт $PORT дээр процесс олдсонгүй."
fi

echo ""
echo "TMS dev сервер асааж байна (http://localhost:$PORT)..."
echo ""

cd "$PROJECT_DIR" && npm run dev
