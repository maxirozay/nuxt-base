#!/bin/bash
set -e

source ./scripts/env.sh

BACKUP_PATH="$1"
if [ -z "$BACKUP_PATH" ]; then
  echo "Usage: $0 <backup-file>"
  exit 1
fi

echo $NUXT_DB
pg_restore -d "$NUXT_DB" "$BACKUP_PATH"
