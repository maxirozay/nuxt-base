# Nuxt Minimal Starter

## Dev

Setup your env file by editing the `.env.example` file and rename it to `.env`.

## Deployment

On your server start the postgres and drizzle-gateway dockers from the docker folder to manage your DB.
Use the create-db script to create a new DB (`./addDB.sh {db-name}`).

Create a folder for your project where you will deploy the website and add your env file with the production values.

Run `./scripts/deploy.sh` to deploy the website.

Setup nginx.

push your migration with `./scripts/db/push.sh`.
