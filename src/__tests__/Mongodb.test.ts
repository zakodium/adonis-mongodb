import { Logger } from '@adonisjs/logger/build/standalone';

import { getMongodb } from '../../test-utils/TestUtils';

const db = getMongodb();

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
