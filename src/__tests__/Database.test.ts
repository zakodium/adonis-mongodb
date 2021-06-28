import { getLogger, getMongodb } from '../../test-utils/TestUtils';
import { Database } from '../Database';

const db = getMongodb();
const logger = getLogger();

afterAll(async () => {
  await db.connection('mongo').close();
});

test('primaryConnectionName', () => {
  expect(db.primaryConnectionName).toBe('mongo');
});

test("hasConnection should return false if connection doesn't exist", () => {
  expect(db.hasConnection('idontexist')).toBe(false);
});

test('hasConnection should return true if connection exists', () => {
  expect(db.hasConnection('mongo')).toBe(true);
});

test("connection should throw an error if connection doesn't exist", () => {
  const t = () => {
    db.connection('idontexist');
  };
  expect(t).toThrow('no MongoDB connection registered with name "idontexist"');
});

test('connection should return a connection if it exists', () => {
  const t = () => {
    db.connection('mongo');
  };
  expect(t).not.toThrow();
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
