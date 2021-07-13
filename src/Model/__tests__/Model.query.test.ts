import { setupDatabase } from '../../../test-utils/TestUtils';
import { field } from '../../Odm/decorators';
import { BaseAutoIncrementModel, BaseModel } from '../Model';

setupDatabase();

class TestModel extends BaseAutoIncrementModel {
  @field()
  public testField: string;

  @field()
  public otherField?: boolean;
}

class EmptyTestModel extends BaseModel {
  @field()
  public someField: string;
}

beforeAll(async () => {
  await TestModel.createMany([
    { testField: 'test1' },
    { testField: 'test2' },
    { testField: 'test3' },
    { testField: 'test4' },
    { testField: 'test5' },
  ]);
});

test('query.all', async () => {
  const results = await TestModel.query().all();
  expect(results).toHaveLength(5);
  expect(results[0].testField).toBe('test5');
  expect(results[0]).toBeInstanceOf(TestModel);
});

test('query.first', async () => {
  const result = await TestModel.query().first();
  expect(result).toBeInstanceOf(TestModel);
  expect((result as TestModel).testField).toBe('test5');
});

test('query.firstOrFail', async () => {
  const result = await TestModel.query().firstOrFail();
  expect(result).toBeInstanceOf(TestModel);
  expect(result.testField).toBe('test5');
});

test('query.firstOrFail - uses the filter', async () => {
  const result = await TestModel.query({ testField: 'test2' }).firstOrFail();
  expect(result).toBeInstanceOf(TestModel);
  expect(result.testField).toBe('test2');
});

test('query.firstOrFail - fail if collection is empty', async () => {
  await expect(EmptyTestModel.query().firstOrFail()).rejects.toThrow(
    /E_DOCUMENT_NOT_FOUND/,
  );
});

test('query.firstOrFail - fail if filter matches nothing', async () => {
  await expect(
    TestModel.query({ testField: 'bad' }).firstOrFail(),
  ).rejects.toThrow(/E_DOCUMENT_NOT_FOUND/);
});

test('query.count - all', async () => {
  const count = await TestModel.query().count();
  expect(count).toBe(5);
});

test('query.count - with filter', async () => {
  const count = await TestModel.query({
    testField: { $regex: /test[123]/ },
  }).count();
  expect(count).toBe(3);
});

test('query.distinct', async () => {
  const results = await TestModel.query().distinct('testField');
  expect(results).toHaveLength(5);
  expect(results[0]).toBe('test1');
});

test('query async iterator', async () => {
  const results = TestModel.query();
  let count = 0;
  for await (const result of results) {
    expect(result).toBeInstanceOf(TestModel);
    // It should be sorted by default
    expect(result.testField).toBe(`test${5 - count}`);
    result.otherField = true;
    await result.save();
    expect(result.otherField).toBe(true);
    count++;
  }
  expect(count).toBe(5);
});
