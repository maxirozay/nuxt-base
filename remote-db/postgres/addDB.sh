#!/bin/bash

if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
else
  echo "Error: .env file not found."
  exit 1
fi

if [ -z "$1" ]; then
  echo "Usage: ./addDB.sh <database_name>"
  exit 1
fi

DB_NAME=$1

docker exec -e PGPASSWORD="$POSTGRES_PASSWORD" postgres \
  psql -U "$POSTGRES_USER" -d postgres -c "CREATE DATABASE $DB_NAME;"

if [ $? -eq 0 ]; then
  echo "Database '$DB_NAME' created successfully!"
  echo "Connection String: postgres://$POSTGRES_USER:$POSTGRES_PASSWORD@localhost:5432/$DB_NAME"
else
  echo "Failed to create database."
fi