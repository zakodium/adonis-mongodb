import { ObjectId } from 'mongodb';

import { getMongodb } from '../../../test-utils/TestUtils';
import { Model, AutoIncrementModel } from '../Model';

interface IUser {
  username: string;
  password: string;
}

interface IPost {
  title: string;
  content: string;
}

class User extends Model implements IUser {
  public static collectionName = 'users';

  public username: string;
  public password: string;
}

class Post extends AutoIncrementModel implements IPost {
  public static collectionName = 'posts';

  public title: string;
  public content: string;
}

const db = getMongodb();
Model.$setDatabase(db);

afterAll(async () => {
  await (await db.connection('mongo').database()).dropDatabase();
  await db.closeConnections();
});

test('can create', async () => {
  const newUser = await User.create({
    username: 'root',
    password: 'root',
  });
  expect(newUser).toBeDefined();
});

test('get collection by model class', async () => {
  const collection = await User.getCollection();
  expect(collection).toBeDefined();
});

test('find one by property', async () => {
  const user = User.findOne({ username: 'root', password: 'root' });
  expect(user).toBeDefined();
});

test('find all', async () => {
  await User.create({
    username: 'root2',
    password: 'root',
  });

  const users = await User.find({});
  expect(await users.count()).toBe(2);
});

test('find by id should work', async () => {
  const user = await User.create({
    username: 'root3',
    password: 'root',
  });
  const secondUser = await User.findById(user.id);
  expect(secondUser).not.toBeNull();
});

test("find by id should throw when doesn't exists", async () => {
  const t = async () => {
    await User.findByIdOrThrow('notavalidid');
  };
  // eslint-disable-next-line @typescript-eslint/no-floating-promises, jest/valid-expect
  expect(t).rejects.toStrictEqual(
    new Error('document notavalidid not found in users'),
  );
});

test('saved changes should be sent to database', async () => {
  const user = await User.create({
    username: 'root4',
    password: 'root',
  });
  user.password = 'rootroot';
  await user.save();

  const sameUser = await User.findById(user.id);
  expect(sameUser).not.toBeNull();
  expect((sameUser as User).password).toStrictEqual('rootroot');
});

test('id is an ObjectId', async () => {
  const user = await User.create({
    username: 'root5',
    password: 'root',
  });
  await user.save();

  expect(user.id).toBeInstanceOf(ObjectId);
});

test('delete on model', async () => {
  const user = await User.create({
    username: 'root6',
    password: 'root',
  });

  await user.delete();

  const sameUserButDeleted = await User.findById(user.id);
  expect(sameUserButDeleted).toBeNull();
});

test('id is a number on AutoIncrementModel', async () => {
  const firstPost = await Post.create({
    title: 'post title',
    content: 'post content',
  });
  expect(firstPost.id).toBe(1);
  expect(typeof firstPost.id).toBe('number');
});

test('AutoIncrementModel id increments', async () => {
  const firstPost = await Post.create({
    title: 'post title 1',
    content: 'post content',
  });
  const secondPost = await Post.create({
    title: 'post title 2',
    content: 'post content',
  });
  expect(firstPost.id).toBe(secondPost.id - 1);
});
