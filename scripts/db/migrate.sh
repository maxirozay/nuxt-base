#!/bin/bash
set -e

# Load .env variables
if [ -f .env ]; then
  set -a
  source .env
  set +a
else
  echo ".env file not found!"
  exit 1
fi

if [ -z "$POSTGRES_URL" ]; then
  echo "Error: POSTGRES_URL is not set in .env."
  exit 1
fi

# Use SUPABASE_URL for the connection string to avoid confusion with API URL
if [ -z "$SUPABASE_URL" ]; then
  # Fallback to SUPABASE_URL if it looks like a postgres connection string
  if [[ "$SUPABASE_URL" == postgres* ]]; then
    echo "Warning: Using SUPABASE_URL as database connection string."
    SUPABASE_URL="$SUPABASE_URL"
  else
    echo "Error: SUPABASE_URL is not set. Please add the Supabase connection string to .env (postgresql://...)"
    exit 1
  fi
fi

if [ "$SUPABASE_URL" == "$POSTGRES_URL" ]; then
  echo "CRITICAL ERROR: Source and Target DB URLs are identical! Aborting to prevent data loss."
  exit 1
fi

echo "1. Dumping public schema data from Supabase..."
npx supabase db dump --db-url "$SUPABASE_URL" -f public_data.dump --use-copy --data-only --schema public

echo "2. Applying public schema data to Postgres..."
psql "$POSTGRES_URL" -f public_data.dump

echo "3. Dumping auth schema data from Supabase..."
npx supabase db dump --db-url "$SUPABASE_URL" -f auth_data.dump --use-copy --data-only --schema auth

echo "4. Transforming auth data for auth.users..."
node scripts/transform_auth.js auth_data.dump auth_import.sql

echo "5. Applying transformed auth data to auth.users..."
psql "$POSTGRES_URL" -f auth_import.sql

# Cleanup
rm public_data.dump auth_data.dump auth_import.sql

echo "Migration complete!"
