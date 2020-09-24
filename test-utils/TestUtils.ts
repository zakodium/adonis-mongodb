import { FakeLogger } from '@adonisjs/logger/build/standalone';
import { basename } from 'path';

import { Connection } from '../src/Connection';
import { Mongodb } from '../src/Mongodb';

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
  const mongoConfig = {
    default: 'mongo',
    connections: {
      mongo: {
        url: 'mongodb://127.0.0.1:33333',
        database: `test-runner-${basename(expect.getState().testPath, '.test.ts')}`,
      },
    },
  };

  return new Mongodb(mongoConfig, logger);
}
