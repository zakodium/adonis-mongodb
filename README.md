# Adonis MongoDB

[![NPM version][npm-image]][npm-url]
[![build status][ci-image]][ci-url]
[![npm download][download-image]][download-url]

MongoDB provider for AdonisJS 5.

| :warning: This module is unstable and in active development. Use at your own risk. |
| ---------------------------------------------------------------------------------- |

<h3 align="center">

  <a href="https://www.zakodium.com">
    <img src="https://www.zakodium.com/brand/zakodium-logo-white.svg" width="50" alt="Zakodium logo" />
  </a>

  <p>
    Maintained by <a href="https://www.zakodium.com">Zakodium</a>
  </p>

[![NPM version][npm-image]][npm-url]
[![build status][ci-image]][ci-url]
[![Test coverage][codecov-image]][codecov-url]
[![npm download][download-image]][download-url]

</h3>

## Prerequisites

This provider requires AdonisJS v5 and won't work with AdonisJS v4.

We recommend using MongoDB >=4.4, because creation of collections and indexes in
migrations will be transactional and will be properly rolled back in case of error.

If you use a version < 4.4, you might run into issues with partially applied migrations.

## Installation

```console
npm i @zakodium/adonis-mongodb
node ace configure @zakodium/adonis-mongodb
```

## Documentation

### Using with the authentication provider

Adonis MongoDB can be used to authenticate users with the `@adonisjs/auth` addon.
To enable it, edit the following files:

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
  guards: {
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

## Development

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
[ci-image]: https://github.com/zakodium/adonis-mongodb/workflows/Node.js%20CI/badge.svg?branch=main
[ci-url]: https://github.com/zakodium/adonis-mongodb/actions?query=workflow%3A%22Node.js+CI%22
[codecov-image]: https://img.shields.io/codecov/c/github/zakodium/adonis-mongodb.svg
[codecov-url]: https://codecov.io/gh/zakodium/adonis-mongodb
[download-image]: https://img.shields.io/npm/dm/@zakodium/adonis-mongodb.svg
[download-url]: https://www.npmjs.com/package/@zakodium/adonis-mongodb
