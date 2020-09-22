import { cloneDeep, isEqual, pickBy, snakeCase } from 'lodash';
import {
  FilterQuery,
  Collection,
  FindOneOptions,
  CollectionInsertOneOptions,
  Cursor,
  UpdateOneOptions,
  CommonOptions,
} from 'mongodb';
import pluralize from 'pluralize';

import { Mongodb } from '../Mongodb';

import { proxyHandler } from './proxyHandler';

interface ModelConstructor<M> {
  $database: Mongodb;
  new (...args: any[]): M;
  _computeCollectionName(): string;
  getCollection(): Promise<Collection>;
}

interface IModelOptions {
  collection: Collection;
}

type ModelReadonlyFields = 'isDirty' | 'save' | 'delete';

class FindResult<T> {
  private $filter: FilterQuery<T>;
  private $options: FindOneOptions<T> | undefined;
  private $cursor: Cursor<T>;
  private $collection: Collection<T>;
  private $constructor: ModelConstructor<T>;

  public constructor(
    filter: FilterQuery<T>,
    options: FindOneOptions<T> | undefined,
    cursor: Cursor<T>,
    collection: Collection<T>,
    constructor: ModelConstructor<T>,
  ) {
    this.$filter = filter;
    this.$options = options;
    this.$cursor = cursor;
    this.$collection = collection;
    this.$constructor = constructor;
  }

  public async all(): Promise<T[]> {
    const result = await this.$cursor.toArray();
    return result.map(
      (value) => new this.$constructor(value, { collection: this.$collection }),
    );
  }

  public async count(): Promise<number> {
    const options =
      this.$options !== undefined
        ? {
            limit: this.$options.limit,
            maxTimeMS: this.$options.maxTimeMS,
            readPreference: this.$options.readPreference,
            session: this.$options.session,
            skip: this.$options.skip,
          }
        : undefined;
    return this.$collection.countDocuments(this.$filter, options);
  }

  public async *[Symbol.asyncIterator](): AsyncIterableIterator<T> {
    for await (const value of this.$cursor) {
      yield new this.$constructor(value, { collection: this.$collection });
    }
  }
}

function computeCollectionName(constructorName: string): string {
  return snakeCase(pluralize(constructorName));
}

export class Model {
  public static $database: Mongodb;
  public static collectionName?: string;

  protected $collection: Collection;
  protected $originalData: any;
  protected $currentData: any;
  protected $isDeleted: boolean;

  public constructor(dbObj: Record<string, unknown>, options: IModelOptions) {
    this.$collection = options.collection;
    this.$originalData = cloneDeep(dbObj);
    this.$currentData = dbObj;
    this.$isDeleted = false;
    // eslint-disable-next-line no-constructor-return
    return new Proxy(this, proxyHandler);
  }

  public static $setDatabase(database: Mongodb): void {
    this.$database = database;
  }

  public static _computeCollectionName(): string {
    if (this.collectionName) {
      return this.collectionName;
    }
    return computeCollectionName(this.name);
  }

  public static async getCollection<T extends Model>(
    this: ModelConstructor<T>,
  ): Promise<Collection<T>> {
    if (!this.$database) {
      throw new Error('Model should only be accessed from IoC container');
    }
    const collectionName = this._computeCollectionName();
    const connection = this.$database.connection();
    return connection.collection(collectionName);
  }

  public static async create<T extends Model>(
    this: ModelConstructor<T>,
    value: Omit<T, 'id' | ModelReadonlyFields>,
    options?: CollectionInsertOneOptions,
  ): Promise<T> {
    const collection = await this.getCollection();
    const now = new Date();
    const toInsert = {
      createdAt: now,
      updatedAt: now,
      ...value,
    };
    const result = await collection.insertOne(toInsert, options);
    return new this({ _id: result.insertedId, ...toInsert }, { collection });
  }

  public static async findOne<T extends Model>(
    this: ModelConstructor<T>,
    filter: FilterQuery<T>,
    options?: FindOneOptions<T>,
  ): Promise<T | null> {
    const collection = await this.getCollection();
    const result = await collection.findOne(filter, options);
    if (result === null) return null;
    return new this(result, { collection });
  }

  public static async find<T extends Model>(
    this: ModelConstructor<T>,
    filter: FilterQuery<T>,
    options?: FindOneOptions<T>,
  ): Promise<FindResult<T>> {
    const collection = await this.getCollection();
    const cursor = collection.find(filter, options);
    return new FindResult(filter, options, cursor, collection, this);
  }

  public static async findById<T extends Model>(
    this: ModelConstructor<T>,
    id: unknown,
    options?: FindOneOptions<T>,
  ): Promise<T | null> {
    const collection = await this.getCollection();
    const result = await collection.findOne({ _id: id }, options);
    if (result === null) return null;
    return new this(result, { collection });
  }

  public static async findByIdOrThrow<T extends Model>(
    this: ModelConstructor<T>,
    id: unknown,
    options?: FindOneOptions<T>,
  ): Promise<T> {
    const collection = await this.getCollection();
    const result = await collection.findOne({ _id: id }, options);
    if (result === null) {
      throw new Error(
        `document ${id} not found in ${this._computeCollectionName()}`,
      );
    }
    return new this(result, { collection });
  }

  protected [Symbol.for('nodejs.util.inspect.custom')](): any {
    return {
      model: this.constructor.name,
      originalData: this.$originalData,
      currentData: this.$currentData,
      isDirty: this.isDirty,
    };
  }

  protected $dirty(): Record<string, any> {
    return pickBy(this.$currentData, (value, key) => {
      return (
        this.$originalData[key] === undefined ||
        !isEqual(this.$originalData[key], value)
      );
    });
  }

  protected $ensureNotDeleted(): void {
    if (this.$isDeleted) {
      throw new Error('this entry was deleted from the database');
    }
  }

  public get id() {
    return this.$currentData._id;
  }

  public get isDirty(): boolean {
    return Object.keys(this.$dirty()).length > 0;
  }

  public async save(options?: UpdateOneOptions): Promise<boolean> {
    this.$ensureNotDeleted();
    const dirty = this.$dirty();
    const dirtyEntries = Object.entries(dirty);
    if (dirtyEntries.length === 0) {
      return false;
    }

    const toSet: { [key: string]: any } = {};

    const now = new Date();
    this.$currentData.updatedAt = now;
    toSet.updatedAt = now;

    for (const [dirtyKey, dirtyValue] of dirtyEntries) {
      toSet[dirtyKey] = dirtyValue;
    }
    await this.$collection.updateOne(
      { _id: this.$currentData._id },
      { $set: toSet },
      options,
    );
    this.$originalData = cloneDeep(this.$currentData);
    return true;
  }

  public async delete(options?: CommonOptions): Promise<boolean> {
    this.$ensureNotDeleted();
    const result = await this.$collection.deleteOne(
      {
        _id: this.$currentData._id,
      },
      options,
    );
    this.$isDeleted = true;
    return result.deletedCount === 1;
  }
}

export class AutoIncrementModel extends Model {
  private constructor(dbObj: Record<string, unknown>, options: IModelOptions) {
    super(dbObj, options);
  }
  public static async create<T extends Model>(
    this: ModelConstructor<T>,
    value: Omit<T, 'id' | ModelReadonlyFields>,
    options?: CollectionInsertOneOptions,
  ): Promise<T> {
    const collectionName = this._computeCollectionName();
    const connection = this.$database.connection();
    const counterCollection = await connection.collection(
      '__adonis_mongodb_counters',
    );

    const doc = await counterCollection.findOneAndUpdate(
      { _id: collectionName },
      { $inc: { count: 1 } },
      { session: options?.session, upsert: true },
    );

    const newCount = doc.value ? doc.value.count + 1 : 1;
    const collection = await this.getCollection();
    const now = new Date();
    const toInsert = {
      _id: newCount,
      createdAt: now,
      updatedAt: now,
      ...value,
    };
    await collection.insertOne(toInsert, options);
    return new this(toInsert, { collection });
  }
}
