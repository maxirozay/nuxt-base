# Nuxt Minimal Starter

## Dev

Setup your env file by editing the `.env.example` file and rename it to `.env`.

## Deployment

### On your server

Create the Docker `shared-network` (`docker network create shared-network || true`).

Start the postgres and drizzle-gateway dockers from the remote-db folder to manage your DB.
Use the addDB script to create a new DB (`./addDB.sh {db-name}`).

Create a folder for your project where you will deploy the website and add your env file with the production values.

Setup nginx serve your app.

### On your local machine

Run `./scripts/deploy.sh` to deploy the website.

Push your migration with `./scripts/db/push.sh`.

## Nuxt layer

Add `extends: ['github:maxirozay/nuxt-base']` to your nuxt config to use this project as a layer.

### Customise DB

In your project's `server/database` folder you can edit the 3 following files to change the DB.

`schema.ts`

```
import { pgTable, text, bigint, timestamp, uuid, boolean, date } from 'drizzle-orm/pg-core'

import { auth, credentials, logs, organizations } from '#layers/nuxt-base/server/database/schema'

export { auth, credentials, logs, organizations }
```

`relations.ts`

```
import * as schema from './schema'
import { defineRelationsPart } from 'drizzle-orm'

import { relations as authRelations } from '#layers/nuxt-base/server/database/relations'

export const relations = {
  ...authRelations,
  ...defineRelationsPart(schema, (r) => ({
    add more relations
  })),
}
```

`db.ts`

```
import { drizzle } from 'drizzle-orm/node-postgres'
import { relations } from './relations'
import type { TablesRelationalConfig } from 'drizzle-orm'

const config = useRuntimeConfig().db

export const db = drizzle(config, {
  relations: relations as TablesRelationalConfig,
  casing: 'snake_case',
})
```
