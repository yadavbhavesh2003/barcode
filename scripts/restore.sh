#!/bin/bash

# Load MONGODB_URI from .env if available
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

URI="${MONGODB_URI:-mongodb+srv://bhaveshyadav:bhavesh2003@raymond.e9p2wyw.mongodb.net/barcode}"

if [ -z "$1" ]; then
  echo "Usage: ./scripts/restore.sh <path_to_backup_folder>"
  echo "Example: ./scripts/restore.sh ./backups/mongodb_backup_20260822_104206/barcode"
  exit 1
fi

BACKUP_PATH="$1"

echo "⚠️  Restoring MongoDB database from: $BACKUP_PATH"
echo "Target URI: $URI"
read -p "Are you sure you want to restore? (y/n): " confirm
if [ "$confirm" != "y" ]; then
  echo "Cancelled."
  exit 0
fi

mongorestore --uri="$URI" --nsInclude="barcode.*" --drop "$BACKUP_PATH"

if [ $? -eq 0 ]; then
  echo "✅ Restore completed successfully!"
else
  echo "❌ Restore encountered errors."
fi
