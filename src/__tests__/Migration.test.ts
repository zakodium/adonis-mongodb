import { Logger } from '@poppinss/fancy-logs';
import { ClientSession } from 'mongodb';

import { getMongodb } from '../../test-utils/TestUtils';
import createMigration from '../Migration';

const logger = new Logger({ fake: true });
const db = getMongodb();
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
  await (await db.connection('mongo').database()).dropDatabase();
  await db.closeConnections();
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
