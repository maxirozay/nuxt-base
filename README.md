# Nuxt Minimal Starter

## Dev

Setup your env file by editing the `.env.example` file and rename it to `.env`.

### Email customisation

Use the route `http://localhost:3000/dev/email/[templateId]` to see the email while you edit. You can put the locale or any parameter in the query.

## Deployment

### On your server

Create the Docker `shared-network` (`docker network create shared-network || true`).

Start the postgres and drizzle-gateway dockers from the `remote-db` folder to manage your DB.
Use the addDB script to create a new DB (`./addDB.sh {db-name} {username} {password}`).

Create a folder for your project where you will deploy the website and add your env file with the production values.

Setup nginx serve your app and your public files folder or s3 public url.

#### Serve s3 folder

```
location /files/ {
    rewrite ^/files/(.*) /object/v1/AUTH_123/bucket/$1 break;

    # 2. Proxy the S3 endpoint
    proxy_pass https://s3.pub2.infomaniak.cloud;

    # 3. Essential headers for SSL S3 connection
    proxy_set_header Host s3.pub2.infomaniak.cloud;
    proxy_ssl_server_name on;

    # Optional: Hide S3 headers for security
    proxy_hide_header x-amz-request-id;
    proxy_hide_header x-amz-id-2;
}
```

#### Server server folder

```
location /files/ {
    alias /home/debian/project/volumes/files/public/;
}
```

### On your local machine

Run `./scripts/deploy.sh` to deploy the website. To deploy other env file just do `./scripts/deploy.sh {name}` and it will deploy .env.{name}.

Push your migration with `pnpm db:push-remote` or `./scripts/db/push.sh` to push trough SSH.

## Nuxt layer

Clone this repo and delete the `layers` folder or copy folders in `app` and `server` into your project. Then add `extends: [['github:maxirozay/nuxt-base', { install: true }]]` to your nuxt config to use this project as a layer. Check the `.env.example` and `nuxt.config.ts` to change the config.
