import { cloneDeep, isEqual, pickBy, snakeCase } from 'lodash';
import {
  ClientSession,
  Collection,
  CountDocumentsOptions,
  DeleteOptions,
  Document,
  Filter,
  FindOptions,
  InsertOneOptions,
  UpdateOptions,
} from 'mongodb';
import pluralize from 'pluralize';

import { DatabaseContract } from '@ioc:Zakodium/Mongodb/Database';
import { FindQueryContract } from '@ioc:Zakodium/Mongodb/Odm';

import { proxyHandler } from './proxyHandler';

interface ModelConstructor<M> {
  $database: DatabaseContract;
  new (...args: any[]): M;
  _computeCollectionName(): string;
  getCollection(): Promise<Collection<M>>;
}

interface IModelOptions {
  collection: Collection;
  session?: ClientSession;
}

type Impossible<K extends keyof any> = {
  [P in K]: never;
};

type NoExtraProperties<T, U extends T = T> = U &
  Impossible<Exclude<keyof U, keyof T>>;

type ModelReadonlyFields =
  | 'isDirty'
  | 'toJSON'
  | 'save'
  | 'delete'
  | 'merge'
  | 'fill'
  | 'createdAt'
  | 'updatedAt';

class FindQuery<T extends Document> implements FindQueryContract<T> {
  public constructor(
    private filter: Filter<T>,
    private options: FindOptions<T> | undefined,
    private modelConstructor: ModelConstructor<T>,
  ) {}

  public async all(): Promise<T[]> {
    const collection = await this.modelConstructor.getCollection();
    const result = await collection.find(this.filter, this.options).toArray();
    return result.map(
      (value) =>
        new this.modelConstructor(
          value,
          {
            collection,
            session: this.options?.session,
          },
          true,
        ),
    );
  }

  public async *[Symbol.asyncIterator](): AsyncIterableIterator<T> {
    const collection = await this.modelConstructor.getCollection();
    for await (const value of collection.find(this.filter, this.options)) {
      yield new this.modelConstructor(
        value,
        {
          collection,
          session: this.options?.session,
        },
        true,
      );
    }
  }
}

function computeCollectionName(constructorName: string): string {
  return snakeCase(pluralize(constructorName));
}

export class BaseModel {
  public static $database: DatabaseContract;
  public static collectionName?: string;

  public readonly _id: any;
  public readonly createdAt: Date;
  public readonly updatedAt: Date;

  protected $collection: Collection | null = null;
  protected $originalData: any;
  protected $currentData: any;
  protected $isDeleted: boolean;
  protected $options: IModelOptions;
  protected $alreadySaved: boolean;

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

    this.$alreadySaved = alreadyExists;
    this.$isDeleted = false;
    // eslint-disable-next-line no-constructor-return
    return new Proxy(this, proxyHandler);
  }

  public static $setDatabase(database: DatabaseContract): void {
    this.$database = database;
  }

  public static _computeCollectionName(): string {
    if (this.collectionName) {
      return this.collectionName;
    }
    return computeCollectionName(this.name);
  }

  public static async getCollection<T extends BaseModel>(
    this: ModelConstructor<T>,
  ): Promise<Collection<T>> {
    if (!this.$database) {
      throw new Error('Model should only be accessed from IoC container');
    }
    const collectionName = this._computeCollectionName();
    const connection = this.$database.connection();
    return connection.collection(collectionName);
  }

  public static async count<T extends BaseModel>(
    this: ModelConstructor<T>,
    filter: Filter<T>,
    options: CountDocumentsOptions = {},
  ): Promise<number> {
    const collection = await this.getCollection();
    return collection.countDocuments(filter, options);
  }

  public static async create<T extends BaseModel>(
    this: ModelConstructor<T>,
    value: any,
    options?: InsertOneOptions,
  ): Promise<any> {
    const collection = await this.getCollection();
    const instance = new this(value, {
      collection,
      session: options?.session,
    });
    await instance.save(options);
    return instance;
  }

  public static async findOne<T extends BaseModel>(
    this: ModelConstructor<T>,
    filter: Filter<T>,
    options?: FindOptions<Omit<T, ModelReadonlyFields>>,
  ): Promise<any | null> {
    const collection = await this.getCollection();
    const result = await collection.findOne(filter, options);
    if (result === undefined) return null;
    return new this(result, { collection, session: options?.session }, true);
  }

  public static find<T extends BaseModel>(
    this: ModelConstructor<T>,
    filter: Filter<T>,
    options?: FindOptions<any>,
  ): FindQuery<any> {
    return new FindQuery(filter, options, this);
  }

  public static async findById<T extends BaseModel>(
    this: ModelConstructor<T>,
    id: unknown,
    options?: FindOptions<Omit<T, ModelReadonlyFields>>,
  ): Promise<T | null> {
    const collection = await this.getCollection();
    const result = await collection.findOne(
      { _id: id },
      options as FindOptions<unknown>,
    );
    if (result === undefined) return null;
    return new this(result, { collection, session: options?.session }, true);
  }

  public static async findByIdOrThrow<T extends BaseModel>(
    this: ModelConstructor<T>,
    id: unknown,
    options?: FindOptions<Omit<T, ModelReadonlyFields>>,
  ): Promise<T> {
    const collection = await this.getCollection();
    const result = await collection.findOne(
      { _id: id },
      options as FindOptions<unknown>,
    );
    if (result === undefined) {
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
    if (!BaseModel.$database) {
      throw new Error('Model should only be accessed from IoC container');
    }
    if (this.$collection !== null) return this.$collection;

    const connection = BaseModel.$database.connection();
    this.$collection = await connection.collection(
      (this.constructor as typeof BaseModel)._computeCollectionName(),
    );
    return this.$collection;
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

  public toJSON(): unknown {
    return this.$currentData;
  }

  public async save(options?: InsertOneOptions): Promise<boolean> {
    this.$ensureNotDeleted();
    const collection = await this.$ensureCollection();

    const toSet = this.$prepareToSet();
    if (toSet === null) return false;
    if (this.$alreadySaved === false) {
      const result = await collection.insertOne(toSet, {
        session: this.$options?.session,
        ...options,
      });
      this.$currentData._id = result.insertedId;
    } else {
      await collection.updateOne(
        { _id: this.$currentData._id },
        { $set: toSet },
        { session: this.$options?.session, ...options },
      );
    }
    this.$originalData = cloneDeep(this.$currentData);
    this.$alreadySaved = true;
    return true;
  }

  public async delete(options?: DeleteOptions): Promise<boolean> {
    this.$ensureNotDeleted();
    const collection = await this.$ensureCollection();
    const result = await collection.deleteOne(
      {
        _id: this.$currentData._id,
      },
      { session: this.$options.session, ...options },
    );
    this.$isDeleted = true;
    return result.deletedCount === 1;
  }

  public merge<
    T extends Partial<Omit<this, '_id' | 'id' | ModelReadonlyFields>>,
  >(
    values: NoExtraProperties<
      Partial<Omit<this, '_id' | 'id' | ModelReadonlyFields>>,
      T
    >,
  ): this {
    Object.entries(values).forEach(([key, value]) => {
      this.$currentData[key] = value;
    });
    return this;
  }

  public fill<
    T extends Partial<Omit<this, '_id' | 'id' | ModelReadonlyFields>>,
  >(
    values: NoExtraProperties<
      Partial<Omit<this, '_id' | 'id' | ModelReadonlyFields>>,
      T
    >,
  ) {
    const createdAt = this.$currentData.createdAt;
    this.$currentData = {
      _id: this.id,
    };
    if (createdAt) this.$currentData.createdAt = createdAt;
    return this.merge(values);
  }
}

export class BaseAutoIncrementModel extends BaseModel {
  public constructor(dbObj?: Record<string, unknown>, options?: IModelOptions) {
    super(dbObj, options);
  }

  public async save(options?: UpdateOptions): Promise<boolean> {
    this.$ensureNotDeleted();
    const collection = await this.$ensureCollection();

    const toSet = this.$prepareToSet();
    if (toSet === null) return false;

    if (this.id === undefined) {
      const connection = BaseAutoIncrementModel.$database.connection();
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
      await collection.insertOne(toSet, {
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
