import { setTimeout as sleep } from 'node:timers/promises';

import { getConnection, getLogger } from '../../test-utils/TestUtils';

const logger = getLogger();
const connection = getConnection(logger);

afterAll(async () => {
  await connection.disconnect();
});

test('try to connect with good config', async () => {
  await connection.connect();
  await sleep(500);
  expect(logger.logs[logger.logs.length - 1]).toBeUndefined();
});

test('get collection', async () => {
  const collection = await connection.collection('test');
  expect(collection).toBeDefined();
});

test('reconnect automatically', async () => {
  let collection = await connection.collection('test');
  await collection.find({}).toArray();
  await connection.disconnect();
  collection = await connection.collection('test');
  // Should connect automatically
  await collection.find({}).toArray();
});

test('get database', async () => {
  const db = await connection.database();
  expect(db).toBeDefined();
});
