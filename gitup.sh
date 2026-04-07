#!/bin/bash
# gitup.sh - Auto commit & push ke GitHub

# --- Load credentials from me.json ---
if [ ! -f me.json ]; then
    echo "[ERROR] me.json tidak ditemukan!"
    exit 1
fi

# Parse JSON (bash + grep/awk)
USERNAME=$(grep github_username me.json | awk -F '"' '{print $4}')
TOKEN=$(grep github_token me.json | awk -F '"' '{print $4}')

if [ -z "$USERNAME" ] || [ -z "$TOKEN" ]; then
    echo "[ERROR] Github username atau token kosong!"
    exit 1
fi

# --- Set remote with token ---
REMOTE_URL="https://$USERNAME:$TOKEN@github.com/nhebotx-md/basebot.git"

# --- Check git status ---
CHANGES=$(git status --porcelain)
if [ -z "$CHANGES" ]; then
    echo "[INFO] Tidak ada perubahan untuk di-commit."
    exit 0
fi

# --- Commit changes ---
COMMIT_MSG="Auto commit $(date +'%Y-%m-%d %H:%M:%S')"
git add .
git commit -m "$COMMIT_MSG"

# --- Push to GitHub ---
echo "[INFO] Pushing ke GitHub..."
git push "$REMOTE_URL" main

if [ $? -eq 0 ]; then
    echo "[SUCCESS] Perubahan berhasil di-push ke GitHub!"
else
    echo "[ERROR] Push gagal. Cek koneksi atau token."
fi