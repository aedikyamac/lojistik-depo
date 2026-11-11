@echo off
cd /d %~dp0
if not exist .env (
  copy .env.example .env >nul
  echo .env olusturuldu. NTFY_TOPIC ve NFC_SHARED_SECRET degerlerini duzenleyin.
)
if not exist node_modules npm install
start "BOSCH WMS API Bridge" cmd /k npm run server
npm run dev
