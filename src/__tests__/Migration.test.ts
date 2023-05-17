import { Logger } from '@poppinss/cliui/build/src/Logger';

import { getMongodb } from '../../test-utils/TestUtils';
import createMigration from '../Migration';

const logger = new Logger();
const db = getMongodb();
const BaseMigration = createMigration(db);

class TestMigration extends BaseMigration {
  public constructor(connection: string | undefined, logger: Logger) {
    super(connection, logger);
  }
  public up(): void {
    this.createCollection('migration');
  }
}

afterAll(async () => {
  const database = await db.connection('mongo').database();
  await database.dropDatabase();
  await db.manager.closeAll();
});

test('runs a migration correctly edit database', async () => {
  await db.connection('mongo').transaction(async (session) => {
    const migration = new TestMigration('mongo', logger);
    await migration.execUp(session);
  });
  const database = await db.connection('mongo').database();
  const collections = await database.listCollections().toArray();
  expect(collections).toHaveLength(1);
});
