# Nuxt Minimal Starter

## Dev

Setup your env file by editing the `.env.example` file and rename it to `.env`.

## Deployment

### On your server

Create the Docker `shared-network` (`docker network create shared-network || true`).

Start the postgres and drizzle-gateway dockers from the `remote-db` folder to manage your DB.
Use the addDB script to create a new DB (`./addDB.sh {db-name} {username} {password}`).

Create a folder for your project where you will deploy the website and add your env file with the production values.

Setup nginx serve your app and your public files folder or s3 public url.

### On your local machine

Run `./scripts/deploy.sh` to deploy the website. To deploy other env file just do `./scripts/deploy.sh {name}` and it will deploy .env.{name}.

Push your migration with `./scripts/db/push.sh`.

## Nuxt layer

Clone this repo and delete the `layers` folder or copy folders in `app` and `server` into your project. Then add `extends: [['github:maxirozay/nuxt-base', { install: true }]]` to your nuxt config to use this project as a layer. Check the `.env.example` and `nuxt.config.ts` to change the config.
