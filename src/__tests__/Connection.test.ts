import { promisify } from 'util';

import { FakeLogger } from '@adonisjs/logger/build/standalone';

import { Connection } from '../Connection';

const sleep = promisify(setTimeout);

const loggerConfig = {
  name: 'adonis-logger',
  level: 'trace',
  messageKey: 'msg',
  enabled: true,
};

const connectionConfig = {
  url: 'mongodb://localhost:33333',
  database: 'test-runner',
};
const logger = new FakeLogger(loggerConfig);
const connection = new Connection('mongo', connectionConfig, logger);

test('try to connect with good config', async () => {
  connection.connect();
  await sleep(500);
  expect(logger.logs[logger.logs.length - 1]).toBeUndefined();
});

test('get collection', async () => {
  const collection = await connection.collection('test');
  expect(collection).toBeDefined();
});

test('get database', async () => {
  const database = await connection.database();
  expect(database).toBeDefined();
});
