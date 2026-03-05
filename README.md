# Nuxt Minimal Starter

## Dev

Setup your env file by editing the `.env.example` file and rename it to `.env`.

## Deployment

### On your server

Create the Docker `shared-network` (`docker network create shared-network || true`).

Start the postgres and drizzle-gateway dockers from the `remote-db` folder to manage your DB.
Use the addDB script to create a new DB (`./addDB.sh {db-name}`).

Create a folder for your project where you will deploy the website and add your env file with the production values.

Setup nginx serve your app.

### On your local machine

Run `./scripts/deploy.sh` to deploy the website.

Push your migration with `./scripts/db/push.sh`.

## Nuxt layer

Add `extends: ['github:maxirozay/nuxt-base']` to your nuxt config to use this project as a layer.

Copy `server/database` and `server/assets` folders to your project.
