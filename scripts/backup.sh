#!/bin/bash

# Load MONGODB_URI from .env if available
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

URI="${MONGODB_URI:-mongodb+srv://bhaveshyadav:bhavesh2003@raymond.e9p2wyw.mongodb.net/barcode}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="./backups/mongodb_backup_${TIMESTAMP}"

echo "🔄 Starting MongoDB backup from: $URI"
mkdir -p ./backups

mongodump --uri="$URI" --out="$BACKUP_DIR"

if [ $? -eq 0 ]; then
  tar -czf "${BACKUP_DIR}.tar.gz" -C ./backups "mongodb_backup_${TIMESTAMP}"
  echo "✅ Backup completed successfully!"
  echo "📁 Backup Folder: ${BACKUP_DIR}"
  echo "📦 Archive File:  ${BACKUP_DIR}.tar.gz"
else
  echo "❌ Backup failed."
  exit 1
fi
