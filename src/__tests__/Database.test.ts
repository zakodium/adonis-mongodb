import { getLogger, getMongodb } from '../../test-utils/TestUtils';
import { Database } from '../Database/Database';

const db = getMongodb();
const logger = getLogger();

afterAll(async () => {
  await db.manager.closeAll();
});

test('primaryConnectionName', () => {
  expect(db.primaryConnectionName).toBe('mongo');
});

describe('connection', () => {
  it('should throw if connection does not exist', () => {
    expect(() => db.connection('idontexist')).toThrow(
      'E_NO_MONGODB_CONNECTION',
    );
  });

  it('should return the requested connection', () => {
    const connection = db.connection('other');
    expect(connection.name).toBe('other');
  });

  it('should return the default connection', () => {
    const connection = db.connection();
    expect(connection.name).toBe('mongo');
    expect(connection).toBe(db.connection('mongo'));
  });

  it('should automatically reconnect', async () => {
    const connection = db.connection();
    let collection = await connection.collection('test');
    await collection.find({}).toArray();
    await db.manager.closeAll();
    collection = await connection.collection('test');
    await collection.find({}).toArray();
  });
});

describe('Database constructor errors', () => {
  it.each([undefined, null, 42, {}])(
    'error if connection is not a string (%s)',
    (value) => {
      expect(
        // @ts-expect-error
        () => new Database({ connection: value, connections: {} }, logger),
      ).toThrow('config.connection must be a string');
    },
  );

  it.each([undefined, null, 42, 'test'])(
    'error if connections is not an object (%s)',
    (value) => {
      expect(
        // @ts-expect-error
        () => new Database({ connection: 'test', connections: value }, logger),
      ).toThrow('config.connections must be an object');
    },
  );

  it('error if primary connection is not in connections', () => {
    expect(
      () =>
        new Database(
          {
            connection: 'test',
            connections: { test1: { database: 'test', url: 'test' } },
          },
          logger,
        ),
    ).toThrow(
      'config.connections must contain a key with the primary connection name (test)',
    );
  });
});
