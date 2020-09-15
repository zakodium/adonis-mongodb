import { MongoClient, Db } from 'mongodb';

const MONGO_URL = 'mongodb://127.0.0.1:33333';

let client: MongoClient;
let db: Db;

beforeAll(async () => {
  client = await new MongoClient(MONGO_URL).connect();
  db = client.db('test-runner');
});
afterAll(async () => {
  await client.close();
});

test('check if there is not collection', async () => {
  const collections = await db.collections();
  expect(collections).toHaveLength(0);
});

test('create a collection', async () => {
  await db.createCollection('test');
  const collections = await db.collections();
  expect(collections).toHaveLength(1);
});
