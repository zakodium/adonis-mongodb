import { inspect } from 'util';

import { ObjectId } from 'mongodb';

import { setupDatabase } from '../../../test-utils/TestUtils';
import { field } from '../../Odm/decorators';
import { BaseModel, BaseAutoIncrementModel } from '../Model';

const db = setupDatabase();

class User extends BaseModel {
  @field()
  public _id: ObjectId | string;

  @field()
  public username: string;

  @field()
  public password: string;
}

class Post extends BaseAutoIncrementModel {
  @field()
  public title: string;

  @field()
  public content: string;

  public notAField?: string;
}

class Empty extends BaseAutoIncrementModel {}
Empty.boot();

class Something extends BaseModel {
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

describe('$hasField', () => {
  it('should return true if field exists', () => {
    expect(Post.$hasField('title')).toBe(true);
  });

  it('should return false if field does not exist', () => {
    expect(Post.$hasField('notAField')).toBe(false);
  });
});

describe('$getField', () => {
  it('should return the field if it exists', () => {
    const field = Post.$getField('title');
    expect(field).toStrictEqual({});
  });

  it('should return undefined if the field does not exist', () => {
    const field = Post.$getField('notAField');
    expect(field).toBeUndefined();
  });
});

test('can create', async () => {
  const newUser = await User.create({
    username: nextUsername(),
    password: 'root',
  });
  expect(newUser).toBeDefined();
});

test('get collection by model class', async () => {
  const collection = await User.getCollection();
  expect(collection).toBeDefined();
});

test('count all', async () => {
  const count = await User.count({});
  expect(count).toBe(1);
});

test('find by id should work', async () => {
  const user = await User.create({
    username: nextUsername(),
    password: 'root',
  });
  const secondUser = await User.find(user._id);
  expect(secondUser).not.toBeNull();
});

test('find all', async () => {
  const users = await User.all();
  expect(users).toHaveLength(2);
  expect(users[0].username).toBe('root2');
});

test('saved changes should be sent to database', async () => {
  const user = await User.create({
    username: nextUsername(),
    password: 'root',
  });
  user.password = 'rootroot';
  await user.save();

  const sameUser = await User.find(user._id);
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

  expect(user.$isDeleted).toBe(false);
  await user.delete();
  expect(user.$isDeleted).toBe(true);

  await expect(user.save()).rejects.toThrow(/E_DOCUMENT_DELETED/);
  await expect(user.delete()).rejects.toThrow(/E_DOCUMENT_DELETED/);

  const sameUserButDeleted = await User.find(user._id);
  expect(sameUserButDeleted).toBeNull();
});

test('persistence boolean properties should behave correctly with new instances', async () => {
  const user = new User();
  user.username = nextUsername();
  user.password = 'root';
  expect(user.$isPersisted).toBe(false);
  expect(user.$isNew).toBe(true);
  expect(user.$isLocal).toBe(true);
  await user.save();
  expect(user.$isPersisted).toBe(true);
  expect(user.$isNew).toBe(false);
  expect(user.$isLocal).toBe(true);
});

test('create an empty document', async () => {
  const empty = await Empty.create({});
  expect(empty).toBeDefined();
  expect(empty.$isNew).toBe(false);
  expect(empty.$isPersisted).toBe(true);
  expect(empty.$isLocal).toBe(true);
  expect(empty.id).toBe(1);
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
  expect(firstPost.id).toBe(secondPost._id - 1);
});

test('passing client should run requests within the same transaction session', async () => {
  const username = nextUsername();
  await db.connection('mongo').transaction(async (client) => {
    const user = await User.create(
      {
        username: username,
        password: 'rootroot',
      },
      { client },
    );

    user.password = 'root';

    await user.save();

    const shouldNotExist = await User.findBy('username', username);
    expect(shouldNotExist).toBeNull();
  });

  const shouldExistNow = await User.findBy('username', username);
  expect(shouldExistNow).not.toBeNull();
  expect(shouldExistNow?.password).toBe('root');
});

test('class instantiation Model should create an entry', async () => {
  const user = new User();
  user.username = nextUsername();
  user.password = 'rootroot';
  await user.save();

  const shouldExist = await User.findBy('username', 'root7');
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

  const shouldHaveNewPassword = await User.findBy('username', username);
  expect(shouldHaveNewPassword?.password).toBe('root');
});

test('find one returns should not be dirty', async () => {
  const username = nextUsername();
  await User.create({
    username,
    password: 'rootroot',
  });

  const foundUser = await User.findByOrFail('username', username);
  expect(foundUser.$isDirty).toBe(false);
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
    await BaseModel.$database.manager
      .get(BaseModel.$database.primaryConnectionName)
      .connection.collection(Something.collectionName)
  ).findOne({ _id: something.id });

  expect(found).not.toBeNull();
});

test('created user should not be dirty', async () => {
  const user = await User.create({
    username: nextUsername(),
    password: 'rootroot',
  });
  expect(user.$isDirty).toBe(false);
});

test('$isDirty should reflect the save status', async () => {
  // Never dirty after fetch.
  const user = await User.findByOrFail('username', 'root1');
  expect(user.$isDirty).toBe(false);

  // Dirty after changing an attribute.
  user.password = 'different';
  expect(user.$isDirty).toBe(true);

  // Not dirty after restoring attribute to orignal value.
  user.password = 'root';
  expect(user.$isDirty).toBe(false);

  // Dirty after changing attribute again.
  user.password = 'different';
  expect(user.$isDirty).toBe(true);

  // Not dirty after saving.
  await user.save();
  expect(user.$isDirty).toBe(false);
});

test('$dirty should contain the diff between original and current', async () => {
  // Empty after fetch.
  const user = await User.findByOrFail('username', 'root1');
  expect(user.$dirty).toStrictEqual({});

  // Contains the changed attribute.
  user.password = 'root';
  expect(user.$dirty).toStrictEqual({ password: 'root' });

  // Contains all the changed attributes.
  user.username = 'root2';
  expect(user.$dirty).toStrictEqual({
    password: 'root',
    username: 'root2',
  });

  // Contains the remaining changed attribute.
  user.username = 'root1';
  expect(user.$dirty).toStrictEqual({
    password: 'root',
  });

  // Empty after saving.
  await user.save();
  expect(user.$dirty).toStrictEqual({});
});

test('merge method', async () => {
  const username = nextUsername();
  const myContent = {
    username,
    password: 'rootroot',
  };

  const user = new User();
  await user.merge(myContent).save();

  expect(user).toHaveProperty(['username']);
  expect(user.username).toBe(username);

  expect(user).toHaveProperty(['password']);
  expect(user.password).toBe('rootroot');
});

test('fill method', async () => {
  const user = new User();
  user.password = 'rootroot';

  await user.fill({ username: nextUsername() }).save();

  expect(user.password).toBeUndefined();
  expect(user.username).toBeDefined();
});

test('merge and fill accept no extra properties', async () => {
  const user = new User();

  user.merge({
    username: 'test',
    // @ts-expect-error
    bad: 'property',
  });

  const bad = {
    password: 'xxx',
    other: 'bad',
  };

  // @ts-expect-error
  user.merge(bad);

  user.fill({
    username: 'test',
    // @ts-expect-error
    bad: 'property',
  });

  // @ts-expect-error
  user.merge(bad);
});

test('fill method after save', async () => {
  const user = new User();
  user.password = 'rootroot';
  await user.save();
  const createdAt = user.createdAt;
  await user.fill({ username: nextUsername() }).save();

  expect(user.password).toBeUndefined();
  expect(user.username).toBeDefined();
  expect(user.createdAt).toBe(createdAt);
});

test('pass custom id', async () => {
  const username = nextUsername();
  const user = await User.create({
    _id: 'test',
    username,
    password: 'mypass',
  });

  await user.save();

  const newUser = await User.findBy('username', username);
  expect(newUser?._id).toBe('test');
});

test('toJSON method', async () => {
  const post = await Post.create({
    _id: 42,
    title: 'mytitle',
    content: 'mycontent',
  });

  const jsonPost = post.toJSON();

  const expected = {
    _id: 42,
    title: 'mytitle',
    content: 'mycontent',
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
  };

  expect(JSON.stringify(jsonPost)).toStrictEqual(JSON.stringify(expected));
});

test('spreading a model should throw', async () => {
  const post = await Post.query().firstOrFail();
  expect(() => ({ ...post })).toThrow(/Getting model keys is disallowed/);
});

test('custom inspect function', async () => {
  const post = await Post.query().firstOrFail();
  post.content = 'new content';

  // Delete dates to have a reproducible snapshot.
  delete post.$original.createdAt;
  delete post.$original.updatedAt;
  delete post.$attributes.createdAt;
  delete post.$attributes.updatedAt;

  const inspected = inspect(post);
  expect(inspected).toMatchSnapshot();
});

describe('findMany', () => {
  it('should accept an empty list', async () => {
    expect(await Post.findMany([])).toStrictEqual([]);
  });

  it('should find all results', async () => {
    const results = await Post.findMany([2, 1, 3]);
    expect(results).toHaveLength(3);
    expect(results[0]).toBeInstanceOf(Post);
    expect(results.map((value) => value.id)).toStrictEqual([1, 2, 3]);
  });

  it('should not duplicate results', async () => {
    const results = await Post.findMany([1, 1, 1]);
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe(1);
  });
});

describe('findOrFail', () => {
  it('should return instance if found', async () => {
    const post = await Post.findOrFail(1);
    expect(post).toBeInstanceOf(Post);
    expect(post.id).toBe(1);
  });

  it('should throw if not found', async () => {
    await expect(Post.findOrFail(-1)).rejects.toThrow(/E_DOCUMENT_NOT_FOUND/);
  });
});

describe('findBy', () => {
  it('should return instance if found', async () => {
    const user = await User.findBy('username', 'root1');
    expect(user).toBeInstanceOf(User);
    // @ts-expect-error
    expect(user.username).toBe('root1');
  });

  it('should return null if not found', async () => {
    const user = await User.findBy('username', 'bad');
    expect(user).toBeNull();
  });
});

describe('findByOrFail', () => {
  it('should return instance if found', async () => {
    const user = await User.findByOrFail('username', 'root1');
    expect(user).toBeInstanceOf(User);
    expect(user.username).toBe('root1');
  });

  it('should throw if not found', async () => {
    await expect(User.findByOrFail('username', 'bad')).rejects.toThrow(
      /E_DOCUMENT_NOT_FOUND/,
    );
  });
});

describe('save', () => {
  it('should return true if something was saved', async () => {
    const post = await Post.findOrFail(1);
    post.title = 'new title';
    expect(await post.save()).toBe(true);
  });

  it('should return false if nothing was saved', async () => {
    const post = await Post.findOrFail(1);
    const title = post.title;
    // no-op
    post.title = title;
    expect(await post.save()).toBe(false);
  });
});
