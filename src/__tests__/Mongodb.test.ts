import { Logger } from '@adonisjs/logger/build/standalone';

import { Mongodb } from '../Mongodb';

const mongoConfig = {
  default: 'mongo',
  connections: {
    mongo: {
      url: 'mongo://127.0.0.1:33333',
      database: 'test-runner',
    },
  },
};

const loggerConfig = {
  name: 'adonis-logger',
  level: 'trace',
  messageKey: 'msg',
  enabled: false,
};

const db = new Mongodb(mongoConfig, new Logger(loggerConfig));

afterAll(async () => {
  await db.connection('mongo').close();
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
