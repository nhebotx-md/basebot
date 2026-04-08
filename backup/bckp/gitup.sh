#!/bin/bash
# gitup.sh - Smart backup & auto commit/push ke GitHub

# --- Load credentials ---
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

# --- Cek repository git ---
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo "[ERROR] Folder ini bukan repository Git!"
    exit 1
fi

BRANCH=$(git rev-parse --abbrev-ref HEAD)

# --- Folder backup ---
BACKUP_DIR="./backup"
mkdir -p "$BACKUP_DIR"

# --- Cek perubahan git ---
CHANGES=$(git status --porcelain)

# --- Hanya backup jika ada perubahan ---
if [ ! -z "$CHANGES" ]; then
    TIMESTAMP=$(date +'%Y%m%d_%H%M%S')
    BACKUP_PATH="$BACKUP_DIR/backup_$TIMESTAMP"

    echo "[INFO] Perubahan terdeteksi, membuat backup ke $BACKUP_PATH ..."
    rsync -av --exclude-from='.gitignore' --exclude='.git/' ./ "$BACKUP_PATH"
    if [ $? -ne 0 ]; then
        echo "[ERROR] Backup gagal!"
        exit 1
    fi
    echo "[INFO] Backup selesai."

    # --- Commit ---
    echo "[INFO] Menambahkan semua perubahan..."
    git add -A
    COMMIT_MSG="Auto commit $(date +'%Y-%m-%d %H:%M:%S')"
    git commit -m "$COMMIT_MSG"

    # --- Pull dengan rebase ---
    echo "[INFO] Sync dengan GitHub (pull --rebase)..."
    if ! git pull --rebase "https://$USERNAME:$TOKEN@github.com/nhebotx-md/basebot.git" "$BRANCH"; then
        echo "[ERROR] Ada konflik saat pull --rebase!"
        echo "        Harap resolve konflik manual, lalu jalankan ./gitup.sh lagi."
        exit 1
    fi

    # --- Push ---
    echo "[INFO] Pushing ke GitHub (branch: $BRANCH)..."
    git push "https://$USERNAME:$TOKEN@github.com/nhebotx-md/basebot.git" "$BRANCH"

    if [ $? -eq 0 ]; then
        echo "[SUCCESS] Perubahan berhasil di-push ke GitHub! 🎉"
    else
        echo "[ERROR] Push gagal. Cek koneksi atau token."
        exit 1
    fi
else
    echo "[INFO] Tidak ada perubahan sejak backup terakhir, tidak melakukan commit atau push."
fi