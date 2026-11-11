#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
if [ ! -f .env ]; then cp .env.example .env; echo ".env oluşturuldu. Güvenlik için NTFY_TOPIC ve NFC_SHARED_SECRET değerlerini düzenleyin."; fi
if [ ! -d node_modules ]; then npm install; fi
npm run server &
SERVER_PID=$!
cleanup(){ kill "$SERVER_PID" 2>/dev/null || true; }
trap cleanup EXIT INT TERM
npm run dev
