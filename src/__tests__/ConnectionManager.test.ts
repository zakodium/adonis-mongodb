import { getMongodb } from '../../test-utils/TestUtils';

const { manager } = getMongodb();

afterAll(async () => {
  await manager.closeAll();
});

test("has should return false if connection doesn't exist", () => {
  expect(manager.has('idontexist')).toBe(false);
});

test('has should return true if connection exists', () => {
  expect(manager.has('mongo')).toBe(true);
});

test("connection should throw an error if connection doesn't exist", () => {
  const t = () => {
    manager.get('idontexist');
  };
  expect(t).toThrow('no MongoDB connection registered with name "idontexist"');
});

test('connection should return a connection if it exists', () => {
  const t = () => {
    manager.get('mongo');
  };
  expect(t).not.toThrow();
});
