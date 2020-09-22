import { FakeLogger } from '@adonisjs/logger/build/standalone';

import { Mongodb } from '../../Mongodb';
import { Model } from '../Model';

interface IUser {
  username: string;
  password: string;
}

class User extends Model implements IUser {
  public static collectionName = 'users';

  public username: string;
  public password: string;
}

const loggerConfig = {
  name: 'adonis-logger',
  level: 'trace',
  messageKey: 'msg',
  enabled: true,
};
const mongoConfig = {
  default: 'mongo',
  connections: {
    mongo: {
      url: 'mongodb://127.0.0.1:33333',
      database: 'test-runner',
    },
  },
};
const db = new Mongodb(mongoConfig, new FakeLogger(loggerConfig));
Model.$setDatabase(db);

afterAll(async () => {
  await (await (User as any).getCollection()).deleteMany({});
  await db.closeConnections();
});

test('can create', async () => {
  const newUser = await (User as any).create({
    username: 'root',
    password: 'root',
  });
  expect(newUser).toBeDefined();
});

test('get collection by model class', async () => {
  const collection = await (User as any).getCollection();
  expect(collection).toBeDefined();
});

test('find one by property', async () => {
  const user = (User as any).findOne({ username: 'root', password: 'root' });
  expect(user).toBeDefined();
});

test('find all', async () => {
  await (User as any).create({
    username: 'root2',
    password: 'root',
  });

  const users = await (User as any).find({});
  expect(await users.count()).toBe(2);
});

test('find by id should work', async () => {
  const user = await (User as any).create({
    username: 'root3',
    password: 'root',
  });
  const secondUser = await (User as any).findById(user.id);
  expect(secondUser.id).toStrictEqual(user.id);
});

test("find by id should throw when doesn't exists", async () => {
  const t = async () => {
    await (User as any).findByIdOrThrow('notavalidid');
  };
  // eslint-disable-next-line @typescript-eslint/no-floating-promises, jest/valid-expect
  expect(t).rejects.toStrictEqual(
    new Error('document notavalidid not found in users'),
  );
});

test('saved changes should be sent to database', async () => {
  const user = await (User as any).create({
    username: 'root4',
    password: 'root',
  });
  user.password = 'rootroot';
  await user.save();

  const sameUser = await (User as any).findById(user.id);
  expect(sameUser.password).toStrictEqual('rootroot');
});

test('delete on model', async () => {
  const user = await (User as any).create({
    username: 'root5',
    password: 'root',
  });

  await user.delete();

  const sameUserButDeleted = await (User as any).findById(user.id);
  expect(sameUserButDeleted).toBeNull();
});
