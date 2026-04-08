#!/bin/bash
# gitup.sh - Auto commit & push ke GitHub (versi anti-rejected)

# --- Load credentials from me.json ---
if [ ! -f me.json ]; then
    echo "[ERROR] me.json tidak ditemukan!"
    exit 1
fi

USERNAME=$(grep github_username me.json | awk -F '"' '{print $4}')
TOKEN=$(grep github_token me.json | awk -F '"' '{print $4}')

if [ -z "$USERNAME" ] || [ -z "$TOKEN" ]; then
    echo "[ERROR] Github username atau token kosong di me.json!"
    exit 1
fi

# --- Cek apakah ini repository Git ---
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo "[ERROR] Folder ini bukan repository Git!"
    exit 1
fi

# --- Remote URL dengan token ---
REMOTE_URL="https://$USERNAME:$TOKEN@github.com/nhebotx-md/basebot.git"

# --- Ambil branch saat ini ---
BRANCH=$(git rev-parse --abbrev-ref HEAD)

# --- Cek apakah ada perubahan ---
CHANGES=$(git status --porcelain)
if [ -z "$CHANGES" ]; then
    echo "[INFO] Tidak ada perubahan untuk di-commit."
    exit 0
fi

# --- Tambahkan SEMUA perubahan (subfolder + delete + mode change) ---
echo "[INFO] Menambahkan semua perubahan..."
git add -A

# --- Commit ---
COMMIT_MSG="Auto commit $(date +'%Y-%m-%d %H:%M:%S')"
git commit -m "$COMMIT_MSG"

# --- PULL DULU (REBASE) agar tidak rejected ---
echo "[INFO] Sync dengan GitHub (pull --rebase)..."
if ! git pull --rebase "$REMOTE_URL" "$BRANCH"; then
    echo "[ERROR] Ada konflik saat pull --rebase!"
    echo "        Harap resolve konflik secara manual, lalu jalankan ./gitup.sh lagi."
    exit 1
fi

# --- PUSH ---
echo "[INFO] Pushing ke GitHub (branch: $BRANCH)..."
git push "$REMOTE_URL" "$BRANCH"

if [ $? -eq 0 ]; then
    echo "[SUCCESS] Perubahan berhasil di-push ke GitHub! 🎉"
else
    echo "[ERROR] Push masih gagal. Cek koneksi atau token."
fi