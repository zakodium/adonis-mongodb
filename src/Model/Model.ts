import { Exception } from '@poppinss/utils';
import { cloneDeep, isEqual, pickBy, snakeCase } from 'lodash';
import {
  BulkWriteOptions,
  ClientSession,
  Collection,
  CountDocumentsOptions,
  CountOptions,
  DeleteOptions,
  DistinctOptions,
  Filter,
  FindOptions,
  InsertOneOptions,
} from 'mongodb';
import pluralize from 'pluralize';

import { DatabaseContract } from '@ioc:Zakodium/Mongodb/Database';
import {
  MongodbDocument,
  QueryContract,
  NoExtraProperties,
  ModelAttributes,
  ModelAdapterOptions,
  ModelDocumentOptions,
} from '@ioc:Zakodium/Mongodb/Odm';

import { proxyHandler } from './proxyHandler';

function mergeDriverOptions<
  DriverOptionType extends { session?: ClientSession | undefined },
>(options?: ModelAdapterOptions<DriverOptionType>): DriverOptionType {
  if (!options) return {} as DriverOptionType;
  return {
    ...options.driverOptions,
    session: options.client,
  } as DriverOptionType;
}

function ensureSort(options?: FindOptions): void {
  if (!options || options.sort) return;
  options.sort = {
    _id: -1,
  };
}

class Query<ModelType extends typeof BaseModel>
  implements QueryContract<InstanceType<ModelType>>
{
  public constructor(
    private filter: Filter<ModelAttributes<InstanceType<ModelType>>>,
    private options:
      | ModelAdapterOptions<
          FindOptions<ModelAttributes<InstanceType<ModelType>>>
        >
      | undefined,
    private modelConstructor: ModelType,
  ) {}

  public async first(): Promise<InstanceType<ModelType> | null> {
    const collection = await this.modelConstructor.getCollection();
    const driverOptions = mergeDriverOptions(this.options);
    ensureSort(driverOptions);
    const result = await collection.findOne(this.filter, driverOptions);
    if (result === undefined) {
      return null;
    }
    const instance = new this.modelConstructor(
      result,
      {
        // @ts-expect-error Unavoidable error.
        collection,
        session: driverOptions.session,
      },
      true,
    ) as InstanceType<ModelType>;
    return instance;
  }

  public async firstOrFail(): Promise<InstanceType<ModelType>> {
    const result = await this.first();
    if (!result) {
      throw new Exception('Document not found', 404, 'E_DOCUMENT_NOT_FOUND');
    }
    return result;
  }

  public async all(): Promise<Array<InstanceType<ModelType>>> {
    const collection = await this.modelConstructor.getCollection();
    const driverOptions = mergeDriverOptions(this.options);
    ensureSort(driverOptions);
    const result = await collection.find(this.filter, driverOptions).toArray();
    return result.map(
      (value) =>
        new this.modelConstructor(
          value,
          {
            // @ts-expect-error Unavoidable error.
            collection,
            session: driverOptions.session,
          },
          true,
        ) as InstanceType<ModelType>,
    );
  }

  public async count(): Promise<number> {
    const collection = await this.modelConstructor.getCollection();
    const driverOptions = mergeDriverOptions(this.options);
    return collection.countDocuments(
      this.filter,
      driverOptions as CountOptions,
    );
  }

  public async distinct<T = unknown>(key: string): Promise<T[]> {
    const collection = await this.modelConstructor.getCollection();
    const driverOptions = mergeDriverOptions(this.options);
    return collection.distinct(
      key,
      this.filter,
      driverOptions as DistinctOptions,
    );
  }

  public async *[Symbol.asyncIterator](): AsyncIterableIterator<
    InstanceType<ModelType>
  > {
    const collection = await this.modelConstructor.getCollection();
    const driverOptions = mergeDriverOptions(this.options);
    ensureSort(driverOptions);
    for await (const value of collection.find(this.filter, driverOptions)) {
      if (value === null) continue;
      yield new this.modelConstructor(
        value,
        {
          // @ts-expect-error Unavoidable error.
          collection,
          session: driverOptions.session,
        },
        true,
      ) as InstanceType<ModelType>;
    }
  }
}

function computeCollectionName(constructorName: string): string {
  return snakeCase(pluralize(constructorName));
}

interface InternalModelConstructorOptions {
  collection: Collection<ModelAttributes<MongodbDocument<unknown>>>;
  session?: ClientSession;
}

function hasOwn(object: unknown, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(object, key);
}

interface DataToSet {
  [key: string]: unknown;
  createdAt: Date;
  updatedAt: Date;
}

export class BaseModel {
  public static connection?: string;
  public static collectionName?: string;

  public readonly _id: unknown;
  public readonly createdAt: Date;
  public readonly updatedAt: Date;

  public $isDeleted: boolean;

  protected $collection: Collection<
    ModelAttributes<MongodbDocument<unknown>>
  > | null = null;
  protected $originalData: Record<string, unknown>;
  protected $currentData: Record<string, unknown>;
  protected $options: InternalModelConstructorOptions;
  protected $alreadySaved: boolean;

  public constructor(
    dbObj?: Record<string, unknown>,
    options?: InternalModelConstructorOptions,
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

  public static $database: DatabaseContract;
  public static $setDatabase(database: DatabaseContract): void {
    this.$database = database;
  }

  public static $collectionName: string | undefined;
  public static $getCollectionName(): string {
    if (!hasOwn(this, '$collectionName')) {
      if (hasOwn(this, 'collectionName')) {
        this.$collectionName = this.collectionName;
      } else {
        this.$collectionName = computeCollectionName(this.name);
      }
    }
    return this.$collectionName as string;
  }

  public static async count<ModelType extends typeof BaseModel>(
    this: ModelType,
    filter: Filter<ModelAttributes<InstanceType<ModelType>>>,
    options?: ModelAdapterOptions<CountDocumentsOptions>,
  ): Promise<number> {
    const collection = await this.getCollection();
    const driverOptions = mergeDriverOptions(options);
    return collection.countDocuments(filter, driverOptions);
  }

  public static async create<ModelType extends typeof BaseModel>(
    this: ModelType,
    value: Partial<ModelAttributes<InstanceType<ModelType>>>,
    options?: ModelAdapterOptions<InsertOneOptions>,
  ): Promise<InstanceType<ModelType>> {
    const collection = await this.getCollection();
    const driverOptions = mergeDriverOptions(options);
    const instance = new this(value, {
      // @ts-expect-error Unavoidable error.
      collection,
      session: driverOptions.session,
    }) as InstanceType<ModelType>;
    await instance.save({ driverOptions });
    return instance;
  }

  public static async createMany<ModelType extends typeof BaseModel>(
    this: ModelType,
    values: Array<Partial<ModelAttributes<InstanceType<ModelType>>>>,
    options?: ModelAdapterOptions<BulkWriteOptions>,
  ): Promise<Array<InstanceType<ModelType>>> {
    const collection = await this.getCollection();
    const driverOptions = mergeDriverOptions(options);
    const instances = values.map(
      (value) =>
        new this(value, {
          // @ts-expect-error Unavoidable error.
          collection,
          session: driverOptions.session,
        }) as InstanceType<ModelType>,
    );
    for (const instance of instances) {
      await instance.save({ driverOptions });
    }
    return instances;
  }

  public static async find<ModelType extends typeof BaseModel>(
    this: ModelType,
    id: InstanceType<ModelType>['_id'],
    options?: ModelAdapterOptions<
      FindOptions<ModelAttributes<InstanceType<ModelType>>>
    >,
  ): Promise<InstanceType<ModelType> | null> {
    const collection = await this.getCollection();
    const driverOptions = mergeDriverOptions(options);
    const filter = { _id: id } as Filter<
      ModelAttributes<InstanceType<ModelType>>
    >;
    const result = await collection.findOne(filter, driverOptions);
    if (result === undefined) return null;
    const instance = new this(
      result,
      // @ts-expect-error Unavoidable error.
      { collection, session: driverOptions.session },
      true,
    ) as InstanceType<ModelType>;
    return instance;
  }

  public static async findOrFail<ModelType extends typeof BaseModel>(
    this: ModelType,
    id: InstanceType<ModelType>['_id'],
    options?: ModelAdapterOptions<
      FindOptions<ModelAttributes<InstanceType<ModelType>>>
    >,
  ): Promise<InstanceType<ModelType>> {
    const result = await this.find(id, options);
    if (!result) {
      throw new Exception('Document not found', 404, 'E_DOCUMENT_NOT_FOUND');
    }
    return result;
  }

  public static async findBy<ModelType extends typeof BaseModel>(
    this: ModelType,
    key: string,
    value: unknown,
    options?: ModelAdapterOptions<
      FindOptions<ModelAttributes<InstanceType<ModelType>>>
    >,
  ): Promise<InstanceType<ModelType> | null> {
    const collection = await this.getCollection();
    const driverOptions = mergeDriverOptions(options);
    const filter = { [key]: value } as Filter<
      ModelAttributes<InstanceType<ModelType>>
    >;
    const result = await collection.findOne(filter, driverOptions);
    if (result === undefined) return null;
    const instance = new this(
      result,
      // @ts-expect-error Unavoidable error.
      { collection, session: driverOptions.session },
      true,
    ) as InstanceType<ModelType>;
    return instance;
  }

  public static async findByOrFail<ModelType extends typeof BaseModel>(
    this: ModelType,
    key: string,
    value: unknown,
    options?: ModelAdapterOptions<
      FindOptions<ModelAttributes<InstanceType<ModelType>>>
    >,
  ): Promise<InstanceType<ModelType>> {
    const result = await this.findBy(key, value, options);
    if (!result) {
      throw new Exception('Document not found', 404, 'E_DOCUMENT_NOT_FOUND');
    }
    return result;
  }

  public static async findMany<ModelType extends typeof BaseModel>(
    this: ModelType,
    ids: Array<InstanceType<ModelType>['_id']>,
    options?: ModelAdapterOptions<
      FindOptions<ModelAttributes<InstanceType<ModelType>>>
    >,
  ): Promise<Array<InstanceType<ModelType>>> {
    const collection = await this.getCollection();
    const driverOptions = mergeDriverOptions(options);
    const result = await collection
      // @ts-expect-error Unavoidable error.
      .find({ _id: { $in: ids } }, driverOptions)
      .toArray();
    const instances = result.map(
      (result) =>
        new this(result, {
          // @ts-expect-error Unavoidable error.
          collection,
          session: driverOptions.session,
        }) as InstanceType<ModelType>,
    );
    return instances;
  }

  public static async all<ModelType extends typeof BaseModel>(
    this: ModelType,
    options?: ModelAdapterOptions<
      FindOptions<ModelAttributes<InstanceType<ModelType>>>
    >,
  ): Promise<Array<InstanceType<ModelType>>> {
    const collection = await this.getCollection();
    const driverOptions = mergeDriverOptions(options);
    ensureSort(driverOptions);
    const result = await collection.find({}, driverOptions).toArray();
    const instances = result.map(
      (result) =>
        new this(result, {
          // @ts-expect-error Unavoidable error.
          collection,
          session: driverOptions.session,
        }) as InstanceType<ModelType>,
    );
    return instances;
  }

  public static query<ModelType extends typeof BaseModel>(
    this: ModelType,
    filter: Filter<ModelAttributes<InstanceType<ModelType>>> = {},
    options?: ModelAdapterOptions<
      FindOptions<ModelAttributes<InstanceType<ModelType>>>
    >,
  ): Query<ModelType> {
    return new Query(filter, options, this);
  }

  public static async getCollection<ModelType extends typeof BaseModel>(
    this: ModelType,
    connection = this.connection,
  ): Promise<Collection<ModelAttributes<InstanceType<ModelType>>>> {
    if (!this.$database) {
      throw new Error('Model should only be accessed from IoC container');
    }
    const connectionInstance = this.$database.connection(connection);
    return connectionInstance.collection(this.$getCollectionName());
  }

  public [Symbol.for('nodejs.util.inspect.custom')](): unknown {
    return {
      model: this.constructor.name,
      originalData: this.$originalData,
      currentData: this.$currentData,
      isDirty: this.$isDirty,
    };
  }

  public get $dirty(): Partial<ModelAttributes<this>> {
    return pickBy(this.$currentData, (value, key) => {
      return (
        this.$originalData[key] === undefined ||
        !isEqual(this.$originalData[key], value)
      );
    }) as Partial<ModelAttributes<this>>;
  }

  public $ensureNotDeleted(): void {
    if (this.$isDeleted) {
      throw new Exception('Document was deleted', 500, 'E_DOCUMENT_DELETED');
    }
  }

  public async $ensureCollection(): Promise<
    Collection<ModelAttributes<MongodbDocument<unknown>>>
  > {
    if (this.$collection !== null) {
      return this.$collection;
    }

    const constructor = this.constructor as typeof BaseModel;
    this.$collection =
      (await constructor.getCollection()) as unknown as Collection<
        ModelAttributes<MongodbDocument<unknown>>
      >;
    return this.$collection;
  }

  public $prepareToSet() {
    const dirty = this.$dirty;
    const dirtyEntries = Object.entries(dirty);
    if (dirtyEntries.length === 0) {
      return null;
    }

    // We cheat a little bit with the assertion. This is necessary because the
    // value returned by this function can be used in a MongoDB update query
    // which shouldn't reset the createdAt field.
    const toSet = {} as DataToSet;
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

  public get $isDirty(): boolean {
    return Object.keys(this.$dirty).length > 0;
  }

  public toJSON(): unknown {
    return this.$currentData;
  }

  public async save(
    options?: ModelDocumentOptions<InsertOneOptions>,
  ): Promise<boolean> {
    this.$ensureNotDeleted();
    const collection = await this.$ensureCollection();

    const toSet = this.$prepareToSet();
    if (toSet === null) return false;
    const driverOptions = {
      ...options?.driverOptions,
      session: this.$options?.session,
    };
    if (this.$alreadySaved === false) {
      const result = await collection.insertOne(toSet, driverOptions);
      this.$currentData._id = result.insertedId;
    } else {
      await collection.updateOne(
        { _id: this.$currentData._id },
        { $set: toSet },
        driverOptions,
      );
    }
    this.$originalData = cloneDeep(this.$currentData);
    this.$alreadySaved = true;
    return true;
  }

  public async delete(
    options?: ModelDocumentOptions<DeleteOptions>,
  ): Promise<boolean> {
    this.$ensureNotDeleted();
    const collection = await this.$ensureCollection();
    const driverOptions = {
      ...options?.driverOptions,
      session: this.$options?.session,
    };
    const result = await collection.deleteOne(
      {
        _id: this.$currentData._id,
      },
      driverOptions,
    );
    this.$isDeleted = true;
    return result.deletedCount === 1;
  }

  public merge<T extends Partial<ModelAttributes<this>>>(
    values: NoExtraProperties<Partial<ModelAttributes<this>>, T>,
  ): this {
    Object.entries(values).forEach(([key, value]) => {
      this.$currentData[key] = value;
    });
    return this;
  }

  public fill<T extends Partial<ModelAttributes<this>>>(
    values: NoExtraProperties<Partial<ModelAttributes<this>>, T>,
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
  public readonly _id: number;

  public async save(
    options?: ModelDocumentOptions<InsertOneOptions>,
  ): Promise<boolean> {
    this.$ensureNotDeleted();
    const collection = await this.$ensureCollection();

    const toSet = this.$prepareToSet();
    if (toSet === null) return false;

    const driverOptions = {
      ...options?.driverOptions,
      session: this.$options?.session,
    };

    if (this._id === undefined) {
      const connection = BaseAutoIncrementModel.$database.connection();
      const counterCollection = await connection.collection<{ count: number }>(
        '__adonis_mongodb_counters',
      );

      const doc = await counterCollection.findOneAndUpdate(
        { _id: computeCollectionName(this.constructor.name) },
        { $inc: { count: 1 } },
        { ...driverOptions, upsert: true },
      );
      const newCount = doc.value ? doc.value.count + 1 : 1;
      toSet._id = newCount;
      await collection.insertOne(toSet, driverOptions);
      this.$currentData._id = newCount;
    } else {
      await collection.updateOne(
        { _id: this.$currentData._id },
        { $set: toSet },
        driverOptions,
      );
    }
    this.$originalData = cloneDeep(this.$currentData);
    return true;
  }
}
