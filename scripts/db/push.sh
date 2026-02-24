#!/bin/bash

export $(grep -v '^#' .env | xargs)

LOCAL_PORT=5433
REMOTE_PORT=5432
SSH_KEY="~/.ssh/$SSH_KEY_NAME"

# 1. Start the SSH tunnel in the background
# -L maps local:remote, -f runs in background, -N tells it not to execute a command
ssh -L $LOCAL_PORT:localhost:$REMOTE_PORT -i "$SSH_KEY" "$SERVER_URL" -f -N

# 2. Set a trap to close the tunnel when the script finishes or fails
trap "echo 'Closing tunnel...'; fuser -k $LOCAL_PORT/tcp" EXIT

# 3. Run Drizzle Kit push with the DATABASE_URL pointing to the local end of the tunnel
NUXT_DB="postgres://$POSTGRES_USER:$POSTGRES_PASSWORD@localhost:$LOCAL_PORT/$POSTGRES_DB" pnpm drizzle-kit push
echo "Migration complete!"