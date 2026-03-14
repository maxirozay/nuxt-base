#!/bin/sh
set -e

SCRIPT_DIR=$(dirname "$0")
ROOT_DIR=$(cd "$SCRIPT_DIR/.." && pwd)

ENV_FILE="$ROOT_DIR/.env"
if [ -n "$1" ]; then
  ENV_FILE="$ROOT_DIR/.env.$1"
fi

set -a
if [ -f "$ENV_FILE" ]; then
  . "$ENV_FILE"
fi
set +a

VERSION=$(node -p "require('$ROOT_DIR/package.json').version")

NAME=$PROJECT_NAME
SSH_KEY="~/.ssh/$SSH_KEY_NAME"
IMAGE_NAME="$NAME:$VERSION"

echo $VERSION

docker build --platform linux/amd64 -t $IMAGE_NAME .
docker save $IMAGE_NAME > $NAME.tar

scp -i $SSH_KEY $NAME.tar $SERVER_URL:$REMOTE_PATH
sed "s/\${PROJECT_NAME}:\${TAG:-latest}/\${PROJECT_NAME}:\${TAG:-$VERSION}/g" compose.yaml | \
ssh -i $SSH_KEY $SERVER_URL "cat > $REMOTE_PATH/compose.yaml"
ssh -i $SSH_KEY $SERVER_URL "
  cd $REMOTE_PATH && \
  sudo docker load < $NAME.tar && \
  IMAGE_NAME=$NAME IMAGE_TAG=$VERSION sudo -E docker compose up -d --force-recreate && \
  rm -f $NAME.tar && \

  # Keep only the last 3 versions of this specific image name
  sudo docker images '$NAME' --format '{{.Tag}}' | \
    grep -v 'latest' | \
    sort -r | \
    tail -n +4 | \
    xargs -I {} sudo docker rmi '$NAME:{}' || true
"
rm -f $NAME.tar