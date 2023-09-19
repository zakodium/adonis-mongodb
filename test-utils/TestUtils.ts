import path from 'node:path';

import { FakeLogger } from '@adonisjs/logger';

import type { MongodbConfig } from '@ioc:Zakodium/Mongodb/Database';

import { Connection } from '../src/Database/Connection';
import { Database } from '../src/Database/Database';
import { BaseAutoIncrementModel, BaseModel } from '../src/Model/Model';

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
    url: 'mongodb://localhost:33333?directConnection=true',
    database: `test-runner-${path.basename(
      expect.getState().testPath as string,
      '.test.ts',
    )}`,
  };
  return new Connection('mongo', connectionConfig, logger);
}

export function getMongodb(logger = getLogger()) {
  const database = `test-runner-${path
    .basename(expect.getState().testPath as string, '.test.ts')
    .replaceAll('.', '_')}`;
  const mongoConfig: MongodbConfig = {
    connection: 'mongo',
    connections: {
      mongo: {
        url: 'mongodb://127.0.0.1:33333?directConnection=true',
        database,
      },
      other: {
        url: 'mongodb://127.0.0.1:33333?directConnection=true',
        database,
      },
    },
  };

  return new Database(mongoConfig, logger);
}

export function setupDatabase() {
  const db = getMongodb();
  BaseModel.$setDatabase(db);
  BaseAutoIncrementModel.$setDatabase(db);

  afterAll(async () => {
    const database = await db.connection('mongo').database();
    await database.dropDatabase();
    await db.manager.closeAll();
  });

  return db;
}
