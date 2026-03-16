#!/bin/bash

# load .env
#POSTGRES_USER=username
#POSTGRES_PASSWORD=password
#POSTGRES_DB=name

if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
else
  echo "Error: .env file not found."
  exit 1
fi

if [ -z "$1" ]; then
  echo "Usage: ./addDB.sh [database_name] [username] [password]"
  echo "  username: Defaults to \$POSTGRES_USER from .env"
  echo "  password: If not provided, one will be generated"
  exit 1
fi

DB_NAME=$1

# Create provided user or use the one from .env
if [ -z "$2" ]; then
  DB_USER="$POSTGRES_USER"
  DB_PASSWORD="$POSTGRES_PASSWORD"
  echo "Using default user from .env: $DB_USER"
else
  DB_USER=$2

  # Generate password if not provided
  if [ -z "$3" ]; then
    DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)
    echo "Generated password: $DB_PASSWORD"
  else
    DB_PASSWORD=$3
  fi

  # Create dedicated user
  docker exec -e PGPASSWORD="$POSTGRES_PASSWORD" postgres \
    psql -U "$POSTGRES_USER" -d postgres -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';"

  if [ $? -ne 0 ]; then
    echo "Failed to create user. User may already exist."
    exit 1
  fi
fi

# Create database
docker exec -e PGPASSWORD="$POSTGRES_PASSWORD" postgres \
  psql -U "$POSTGRES_USER" -d postgres -c "CREATE DATABASE $DB_NAME;"

if [ $? -ne 0 ]; then
  echo "Failed to create database."
  exit 1
fi

# Grant privileges
docker exec -e PGPASSWORD="$POSTGRES_PASSWORD" postgres \
  psql -U "$POSTGRES_USER" -d postgres -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;"

# Grant schema permissions (required for PostgreSQL 15+)
docker exec -e PGPASSWORD="$POSTGRES_PASSWORD" postgres \
  psql -U "$POSTGRES_USER" -d "$DB_NAME" -c "GRANT ALL ON SCHEMA public TO $DB_USER;"

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Database and user created successfully!"
  echo ""
  echo "Database: $DB_NAME"
  echo "User:     $DB_USER"
  echo "Password: $DB_PASSWORD"
  echo ""
  echo "Connection String:"
  echo "postgres://$DB_USER:$DB_PASSWORD@localhost:5432/$DB_NAME"
  echo ""
  echo "⚠️  Save these credentials securely!"
else
  echo "Failed to configure database permissions."
fi