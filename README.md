# Adonis MongoDB

[![NPM version][npm-image]][npm-url]
[![build status][ci-image]][ci-url]
[![npm download][download-image]][download-url]

MongoDB provider for AdonisJS.

| :warning: This module is unstable and in active development. Use at your own risk. |
| ---------------------------------------------------------------------------------- |

## Prerequisites

This provider requires Adonis v5 preview and won't work with Adonis v4.

We recommend using mongodb 4.4, because creation of collections and indices in migrations will be transactional and will be properly rolled back in case of error.

If you use a version < 4.4, you might run into issues with partially applied migrations.

## Installation

```console
npm i @zakodium/adonis-mongodb
node ace invoke @zakodium/adonis-mongodb
```

## Documentation

### Using with the authentication provider

Adonis MongoDB can be used to authenticate users with the `@adonisjs/auth` addon.
Do enable it, edit the following files:

#### `contracts/auth.ts`

Example of a configuration with the session guard:

```ts
import {
  MongodbModelAuthProviderContract,
  MongodbModelAuthProviderConfig,
} from '@ioc:Mongodb/Model';

import User from 'App/Models/User';

declare module '@ioc:Adonis/Addons/Auth' {
  interface ProvidersList {
    user: {
      implementation: MongodbModelAuthProviderContract<typeof User>;
      config: MongodbModelAuthProviderConfig<typeof User>;
    };
  }

  interface GuardsList {
    web: {
      implementation: SessionGuardContract<'user', 'web'>;
      config: SessionGuardConfig<'user'>;
    };
  }
}
```

#### `config/auth.ts`

```ts
import { AuthConfig } from '@ioc:Adonis/Addons/Auth';

const authConfig: AuthConfig = {
  guard: 'web',
  list: {
    web: {
      driver: 'session',
      provider: {
        driver: 'mongodb-model',
      },
    },
  },
};

export default authConfig;
```

## Tests

To run tests locally:

```bash
docker-compose up -d
node reset-dev.js
npm test
docker-compose down
```

## License

[MIT](./LICENSE)

[npm-image]: https://img.shields.io/npm/v/@zakodium/adonis-mongodb.svg
[npm-url]: https://www.npmjs.com/package/@zakodium/adonis-mongodb
[ci-image]: https://github.com/zakodium/adonis-mongodb/workflows/Node.js%20CI/badge.svg?branch=master
[ci-url]: https://github.com/zakodium/adonis-mongodb/actions?query=workflow%3A%22Node.js+CI%22
[download-image]: https://img.shields.io/npm/dm/@zakodium/adonis-mongodb.svg
[download-url]: https://www.npmjs.com/package/@zakodium/adonis-mongodb
