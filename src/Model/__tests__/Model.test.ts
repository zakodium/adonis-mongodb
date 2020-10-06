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

class Something extends Model {
  public static collectionName = 'somethingElse';

  public test: boolean;
}

let usernameCounter = 0;
function nextUsername() {
  return `root${++usernameCounter}`;
}

let postTitleCounter = 0;
function nextTitle() {
  return `post title ${++postTitleCounter}`;
}

const db = getMongodb();
Model.$setDatabase(db);

/*
afterAll(async () => {
  await (await db.connection('mongo').database()).dropDatabase();
  await db.closeConnections();
});*/

beforeAll(async () => {
  await (await db.connection('mongo').database()).dropDatabase();
});

test('can create', async () => {
  const newUser = await User.create({
    username: nextUsername(),
    password: 'root',
  });
  await newUser.save();
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
    username: nextUsername(),
    password: 'root',
  });

  const users = await User.find({});
  expect(await users.count()).toBe(2);
});

test('find by id should work', async () => {
  const user = await User.create({
    username: nextUsername(),
    password: 'root',
  });
  const secondUser = await User.findById(user.id);
  expect(secondUser).not.toBeNull();
});

test("find by id should throw when doesn't exists", async () => {
  const t = async () => {
    await User.findByIdOrThrow('notavalidid');
  };
  await expect(t).rejects.toStrictEqual(
    new Error('document notavalidid not found in users'),
  );
});

test('saved changes should be sent to database', async () => {
  const user = await User.create({
    username: nextUsername(),
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
    username: nextUsername(),
    password: 'root',
  });
  await user.save();

  expect(user.id).toBeInstanceOf(ObjectId);
});

test('delete on model', async () => {
  const user = await User.create({
    username: nextUsername(),
    password: 'root',
  });

  await user.delete();

  const sameUserButDeleted = await User.findById(user.id);
  expect(sameUserButDeleted).toBeNull();
});

test('id is a number on AutoIncrementModel', async () => {
  const firstPost = await Post.create({
    title: nextTitle(),
    content: 'post content',
  });
  expect(firstPost.id).toBe(1);
  expect(typeof firstPost.id).toBe('number');
});

test('AutoIncrementModel id increments', async () => {
  const firstPost = await Post.create({
    title: nextTitle(),
    content: 'post content',
  });
  const secondPost = await Post.create({
    title: nextTitle(),
    content: 'post content',
  });
  expect(firstPost.id).toBe(secondPost.id - 1);
});

test('passing session should run requests within the same session', async () => {
  const username = nextUsername();
  await db.connection('mongo').transaction(async (session) => {
    const user = await User.create(
      {
        username: username,
        password: 'rootroot',
      },
      { session },
    );

    user.password = 'root';

    await user.save();

    const shouldNotExist = await User.findOne({ username: username });
    expect(shouldNotExist).toBeNull();
  });

  const shouldExistNow = await User.findOne({ username: 'root7' });
  expect(shouldExistNow).not.toBeNull();
  expect(shouldExistNow?.password).toBe('root');
});

test('class instantiation Model should create an entry', async () => {
  const user = new User();
  user.username = nextUsername();
  user.password = 'rootroot';
  await user.save();

  const shouldExist = await User.findOne({ username: 'root8' });
  expect(shouldExist).not.toBeNull();
  expect(user.id).toBeInstanceOf(ObjectId);
});

test('class instantiation Model should be updatable', async () => {
  const username = nextUsername();
  const user = new User();
  user.username = username;
  user.password = 'rootroot';
  await user.save();

  user.password = 'root';
  await user.save();

  const shouldHaveNewPassword = await User.findOne({ username });
  expect(shouldHaveNewPassword?.password).toBe('root');
});

test('find one returns should not be dirty', async () => {
  const username = nextUsername();
  await User.create({
    username,
    password: 'rootroot',
  });

  const foundUser = await User.findOne({ username });
  expect(foundUser?.isDirty).toBe(false);
});

test('class instantiation auto incremented model', async () => {
  const post = new Post();
  post.title = nextTitle();
  post.content = 'post content';
  await post.save();

  expect(typeof post.id).toBe('number');
});

test('custom collection name - class', async () => {
  const something = await Something.create({ test: false });
  await something.save();
  expect((await Something.getCollection()).collectionName).toBe(
    Something.collectionName,
  );
});

test('custom collection name - instance', async () => {
  const something = new Something();
  something.test = true;
  await something.save();

  const found = await (
    await Model.$database.connection().collection(Something.collectionName)
  ).findOne({ _id: something.id });

  expect(found).not.toBeNull();
});
