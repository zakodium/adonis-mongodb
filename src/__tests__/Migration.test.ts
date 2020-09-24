import { Logger } from '@adonisjs/logger/build/standalone';
import { ClientSession } from 'mongodb';

import createMigration from '../Migration';
import { Mongodb } from '../Mongodb';

const mongoConfig = {
  default: 'mongo',
  connections: {
    mongo: {
      url: 'mongodb://127.0.0.1:33333',
      database: 'test-runner',
    },
  },
};

const loggerConfig = {
  name: 'adonis-logger',
  level: 'trace',
  messageKey: 'msg',
  enabled: true,
};

const logger = new Logger(loggerConfig);
const db = new Mongodb(mongoConfig, logger);
const BaseMigration = createMigration(db);

class TestMigration extends BaseMigration {
  public constructor(
    connection: string | undefined,
    logger: Logger,
    session: ClientSession,
  ) {
    super(connection, logger, session);
  }
  public up(): void {
    this.createCollection('migration');
  }
}

afterAll(async () => {
  await (await db.connection('mongo').collection('migration')).drop();
  await db.connection('mongo').close();
});

test('runs a migration correctly edit database', async () => {
  await db.connection('mongo').transaction(async (session) => {
    const migration = new TestMigration('mongo', logger, session);
    await migration.execUp();
  });
  const collections = await (await db.connection('mongo').database())
    .listCollections()
    .toArray();
  expect(collections).toHaveLength(1);
});
