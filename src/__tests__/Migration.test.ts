import { Logger } from '@poppinss/cliui/build/src/Logger';

import { getMongodb } from '../../test-utils/TestUtils';
import createMigration from '../Migration';

const logger = new Logger();
const db = getMongodb();
const BaseMigration = createMigration(db);

class TestMigration1 extends BaseMigration {
  public constructor(connection: string | undefined, logger: Logger) {
    super(connection, logger);
  }
  public up(): void {
    this.createCollection('migration1');
    this.createCollections(['migration2', 'migration3']);
  }
}

class TestMigration2 extends BaseMigration {
  public constructor(connection: string | undefined, logger: Logger) {
    super(connection, logger);
  }
  public up(): void {
    this.dropCollection('migration2');
  }
}

describe('running migrations correctly changes database', () => {
  afterAll(async () => {
    const database = await db.connection('mongo').database();
    await database.dropDatabase();
    await db.manager.closeAll();
  });

  it('should create collections', async () => {
    await db.connection('mongo').transaction(async (session) => {
      const migration1 = new TestMigration1('mongo', logger);
      await migration1.execUp(session);
    });
    const database = await db.connection('mongo').database();
    const collections = await database.listCollections().map(getName).toArray();
    expect(collections.sort()).toStrictEqual([
      'migration1',
      'migration2',
      'migration3',
    ]);
  });

  it('should drop collection', async () => {
    await db.connection('mongo').transaction(async (session) => {
      const migration2 = new TestMigration2('mongo', logger);
      await migration2.execUp(session);
    });
    const database = await db.connection('mongo').database();
    const collections = await database.listCollections().map(getName).toArray();
    expect(collections.sort()).toStrictEqual(['migration1', 'migration3']);
  });
});

function getName(collection: { name: string }) {
  return collection.name;
}
