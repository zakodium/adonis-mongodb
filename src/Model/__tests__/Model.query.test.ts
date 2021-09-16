import { setupDatabase } from '../../../test-utils/TestUtils';
import { field } from '../../Odm/decorators';
import { BaseAutoIncrementModel, BaseModel } from '../Model';

setupDatabase();

class TestModel extends BaseAutoIncrementModel {
  @field()
  public testField: string;

  @field()
  public otherField?: boolean;

  @field()
  public numberField: number;
}

class EmptyTestModel extends BaseModel {
  @field()
  public someField: string;
}

beforeAll(async () => {
  await TestModel.createMany([
    { testField: 'test1', numberField: 1 },
    { testField: 'test2', numberField: 1 },
    { testField: 'test3', numberField: 1 },
    { testField: 'test4', numberField: 2 },
    { testField: 'test5', numberField: 2 },
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

describe('query.sort', () => {
  it('should sort by descending _id by default', async () => {
    expect((await TestModel.query().firstOrFail())._id).toBe(5);
  });

  it('should sort by custom field with sort()', async () => {
    expect(
      (await TestModel.query().sort({ numberField: 1 }).firstOrFail())._id,
    ).toBe(1);
  });

  it('should sort by custom field with sortBy()', async () => {
    expect(
      (await TestModel.query().sortBy('numberField', -1).firstOrFail())._id,
    ).toBe(4);
  });

  it('should sort by combination of fields', async () => {
    expect(
      (
        await TestModel.query()
          .sortBy('numberField', 1)
          .sort({ _id: 'desc' })
          .firstOrFail()
      )._id,
    ).toBe(3);
  });
});

describe('query.skip', () => {
  it('should not skip by default', async () => {
    expect(await TestModel.query().count()).toBe(5);
  });

  it('should not skip anything if zero is passed', async () => {
    expect(await TestModel.query().skip(0).count()).toBe(5);
  });

  it('should skip everything if a big number is passed', async () => {
    expect(await TestModel.query().skip(1000).count()).toBe(0);
  });

  it('should skip properly with smaller number', async () => {
    expect(await TestModel.query().skip(2).count()).toBe(3);
  });

  it('should throw if skip is smaller than zero', async () => {
    expect(() => TestModel.query().skip(-1).count()).toThrow(
      /skip must be at least zero/,
    );
  });

  it('should throw if skip is not an integer', async () => {
    expect(() => TestModel.query().skip(1.5).count()).toThrow(
      /skip must be an integer/,
    );
  });
});

describe('query.limit', () => {
  it('should not limit by default', async () => {
    expect(await TestModel.query().count()).toBe(5);
  });

  it('should return everything with large limit', async () => {
    expect(await TestModel.query().limit(1000).count()).toBe(5);
  });

  it('should limit properly with exact number', async () => {
    expect(await TestModel.query().limit(5).count()).toBe(5);
  });

  it('should limit properly with smaller number', async () => {
    expect(await TestModel.query().limit(2).count()).toBe(2);
  });

  it('should throw if limit is smaller than one', async () => {
    expect(() => TestModel.query().limit(0)).toThrow(
      /limit must be at least one/,
    );
  });

  it('should throw if limit is not an integer', async () => {
    expect(() => TestModel.query().limit(1.5)).toThrow(
      /limit must be an integer/,
    );
  });
});

test('sort/skip/limit', async () => {
  const result = await TestModel.query()
    .sort({ _id: 'desc' })
    .skip(1)
    .limit(2)
    .all();
  expect(result).toHaveLength(2);
  expect(result[0]._id).toBe(4);
  expect(result[1]._id).toBe(3);
});
