import { basename } from 'path';

import { FakeLogger } from '@adonisjs/logger';

import type { MongodbConfig } from '@ioc:Zakodium/Mongodb/Database';

import { Connection } from '../src/Connection';
import { Database } from '../src/Database';

export function getLogger() {
  const loggerConfig = {
    name: 'adonis-logger',
    level: 'trace',
    messageKey: 'msg',
    enabled: true,
  };
  return new FakeLogger(loggerConfig);
}

export function getConnection(logger = getLogger()) {
  const connectionConfig = {
    url: 'mongodb://localhost:33333',
    database: `test-runner-${basename(expect.getState().testPath, '.test.ts')}`,
  };
  return new Connection('mongo', connectionConfig, logger);
}

export function getMongodb(logger = getLogger()) {
  const database = `test-runner-${basename(
    expect.getState().testPath,
    '.test.ts',
  )}`;
  const mongoConfig: MongodbConfig = {
    connection: 'mongo',
    connections: {
      mongo: {
        url: 'mongodb://127.0.0.1:33333',
        database,
      },
      other: {
        url: 'mongodb://127.0.0.1:33333',
        database,
      },
    },
  };

  return new Database(mongoConfig, logger);
}
