import { cloneDeep, isEqual, pickBy, snakeCase } from 'lodash';
import {
  ClientSession,
  Collection,
  CollectionInsertOneOptions,
  CommonOptions,
  Cursor,
  FilterQuery,
  FindOneOptions,
  UpdateOneOptions,
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
  session?: ClientSession;
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
      (value) =>
        new this.$constructor(
          value,
          {
            collection: this.$collection,
            session: this.$options?.session,
          },
          true,
        ),
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
      yield new this.$constructor(value, {
        collection: this.$collection,
        session: this.$options?.session,
      });
    }
  }
}

function computeCollectionName(constructorName: string): string {
  return snakeCase(pluralize(constructorName));
}

export class Model {
  public static $database: Mongodb;
  public static collectionName?: string;

  protected $collection: Collection | null = null;
  protected $originalData: any;
  protected $currentData: any;
  protected $isDeleted: boolean;
  protected $options: IModelOptions;

  public constructor(
    dbObj?: Record<string, unknown>,
    options?: IModelOptions,
    alreadyExists = false,
  ) {
    if (dbObj) {
      this.$originalData = alreadyExists === true ? cloneDeep(dbObj) : {};
      this.$currentData = dbObj;
    } else {
      this.$originalData = {};
      this.$currentData = {};
    }

    if (options !== undefined) {
      this.$options = options;
      this.$collection = options.collection;
    }

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
    const instance = new this(value, {
      collection,
      session: options?.session,
    });
    await instance.save(options);
    return instance;
  }

  public static async findOne<T extends Model>(
    this: ModelConstructor<T>,
    filter: FilterQuery<T>,
    options?: FindOneOptions<T>,
  ): Promise<T | null> {
    const collection = await this.getCollection();
    const result = await collection.findOne(filter, options);
    if (result === null) return null;
    return new this(result, { collection, session: options?.session }, true);
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
    return new this(result, { collection, session: options?.session }, true);
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
        `document ${String(id)} not found in ${this._computeCollectionName()}`,
      );
    }
    return new this(result, { collection, session: options?.session }, true);
  }

  protected [Symbol.for('nodejs.util.inspect.custom')](): any {
    return {
      model: this.constructor.name,
      originalData: this.$originalData,
      currentData: this.$currentData,
      isDirty: this.isDirty,
    };
  }

  protected $dirty(): Record<string, unknown> {
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

  protected async $ensureCollection() {
    if (!Model.$database) {
      throw new Error('Model should only be accessed from IoC container');
    }
    if (this.$collection !== null) return;

    const connection = Model.$database.connection();
    this.$collection = await connection.collection(
      (this.constructor as typeof Model)._computeCollectionName(),
    );
  }

  protected $prepareToSet() {
    const dirty = this.$dirty();
    const dirtyEntries = Object.entries(dirty);
    if (dirtyEntries.length === 0) {
      return null;
    }

    const toSet: { [key: string]: unknown } = {};
    const now = new Date();
    if (this.$currentData.createdAt === undefined) {
      this.$currentData.createdAt = now;
      toSet.createdAt = now;
    }
    this.$currentData.updatedAt = now;
    toSet.updatedAt = now;

    for (const [dirtyKey, dirtyValue] of dirtyEntries) {
      toSet[dirtyKey] = dirtyValue;
    }
    return toSet;
  }

  public get id() {
    return this.$currentData._id;
  }

  public get isDirty(): boolean {
    return Object.keys(this.$dirty()).length > 0;
  }

  public async save(options?: UpdateOneOptions): Promise<boolean> {
    this.$ensureNotDeleted();
    await this.$ensureCollection();

    const toSet = this.$prepareToSet();
    if (toSet === null) return false;

    if (this.id === undefined) {
      const result = await (this.$collection as Collection).insertOne(toSet, {
        session: this.$options?.session,
        ...options,
      });
      this.$currentData._id = result.insertedId;
    } else {
      await (this.$collection as Collection).updateOne(
        { _id: this.$currentData._id },
        { $set: toSet },
        { session: this.$options?.session, ...options },
      );
    }
    this.$originalData = cloneDeep(this.$currentData);
    return true;
  }

  public async delete(options?: CommonOptions): Promise<boolean> {
    this.$ensureNotDeleted();
    await this.$ensureCollection();
    const result = await (this.$collection as Collection).deleteOne(
      {
        _id: this.$currentData._id,
      },
      { session: this.$options.session, ...options },
    );
    this.$isDeleted = true;
    return result.deletedCount === 1;
  }
}

export class AutoIncrementModel extends Model {
  public constructor(dbObj?: Record<string, unknown>, options?: IModelOptions) {
    super(dbObj, options);
  }

  public async save(options?: UpdateOneOptions): Promise<boolean> {
    this.$ensureNotDeleted();
    await this.$ensureCollection();

    const toSet = this.$prepareToSet();
    if (toSet === null) return false;

    if (this.id === undefined) {
      const connection = AutoIncrementModel.$database.connection();
      const counterCollection = await connection.collection<{ count: number }>(
        '__adonis_mongodb_counters',
      );

      const doc = await counterCollection.findOneAndUpdate(
        { _id: computeCollectionName(this.constructor.name) },
        { $inc: { count: 1 } },
        { session: options?.session, upsert: true },
      );
      const newCount = doc.value ? doc.value.count + 1 : 1;
      toSet._id = newCount;
      await (this.$collection as Collection).insertOne(toSet, {
        session: this.$options?.session,
        ...options,
      });
      this.$currentData._id = newCount;
    } else {
      await (this.$collection as Collection).updateOne(
        { _id: this.$currentData._id },
        { $set: toSet },
        { session: this.$options?.session, ...options },
      );
    }
    this.$originalData = cloneDeep(this.$currentData);
    return true;
  }
}
