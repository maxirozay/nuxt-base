#!/bin/sh
set -e

export $(grep -v '^#' .env | xargs)

NAME=$PROJECT_NAME
SERVER_URL=$SERVER_URL
SSH_KEY="~/.ssh/$SSH_KEY_NAME"
REMOTE_PATH="~/$NAME"

IMAGE_NAME="$NAME:$TAG"

docker build --platform linux/amd64 -t $IMAGE_NAME .
docker save $IMAGE_NAME > $NAME.tar

scp -i $SSH_KEY $NAME.tar $SERVER_URL:$REMOTE_PATH
scp -i $SSH_KEY compose.yaml $SERVER_URL:$REMOTE_PATH
ssh -i $SSH_KEY $SERVER_URL "
  cd $REMOTE_PATH && \
  sudo docker load < $NAME.tar && \
  IMAGE_NAME=$NAME IMAGE_TAG=$TAG sudo -E docker compose up -d --force-recreate && \
  rm -f $NAME.tar && \

  # Keep only the last 3 versions of this specific image name
  sudo docker images '$NAME' --format '{{.Tag}}' | \
    grep -v 'latest' | \
    sort -r | \
    tail -n +4 | \
    xargs -I {} sudo docker rmi '$NAME:{}' || true
"
rm -f $NAME.tar