import assert from 'assert';

import { defineStaticProperty, Exception } from '@poppinss/utils';
import { cloneDeep, isEqual, pickBy, snakeCase } from 'lodash';
import {
  BulkWriteOptions,
  ClientSession,
  Collection,
  CountDocumentsOptions,
  CountOptions,
  DeleteOptions,
  DistinctOptions,
  Document,
  ExplainVerbosityLike,
  Filter,
  FindOptions,
  InsertOneOptions,
  SortDirection,
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
  FieldOptions,
  QuerySortObject,
  ForbiddenQueryOptions,
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

interface QueryLocalOptions {
  sort: QuerySortObject;
  skip?: number;
  limit?: number;
}

const forbiddenQueryOptions: ForbiddenQueryOptions[] = [
  'sort',
  'skip',
  'limit',
  'explain',
];

class Query<ModelType extends typeof BaseModel>
  implements QueryContract<InstanceType<ModelType>>
{
  private localCustomSort = false;
  private localOptions: QueryLocalOptions = {
    sort: {
      _id: 'descending',
    },
  };

  private getDriverOptions(): FindOptions<
    ModelAttributes<InstanceType<ModelType>>
  > {
    return { ...mergeDriverOptions(this.options), ...this.localOptions };
  }

  public constructor(
    private filter: Filter<ModelAttributes<InstanceType<ModelType>>>,
    private options:
      | ModelAdapterOptions<
          Omit<
            FindOptions<ModelAttributes<InstanceType<ModelType>>>,
            ForbiddenQueryOptions
          >
        >
      | undefined,
    private modelConstructor: ModelType,
  ) {
    if (options?.driverOptions) {
      for (const key of forbiddenQueryOptions) {
        if (key in options.driverOptions) {
          throw new TypeError(`${key} is not allowed in query's driverOptions`);
        }
      }
    }
  }

  public sort(sort: QuerySortObject): this {
    if (!this.localCustomSort) {
      this.localCustomSort = true;
      this.localOptions.sort = sort;
    } else {
      Object.assign(this.localOptions.sort, sort);
    }
    return this;
  }

  public sortBy(field: string, direction: SortDirection = 'ascending'): this {
    return this.sort({ [field]: direction });
  }

  public skip(skip: number): this {
    if (!Number.isInteger(skip)) {
      throw new TypeError(`skip must be an integer`);
    }
    if (skip < 0) {
      throw new TypeError(`skip must be at least zero`);
    }
    this.localOptions.skip = skip;
    return this;
  }

  public limit(limit: number): this {
    if (!Number.isInteger(limit)) {
      throw new TypeError(`limit must be an integer`);
    }
    if (limit < 1) {
      throw new TypeError(`limit must be at least one`);
    }
    this.localOptions.limit = limit;
    return this;
  }

  public async first(): Promise<InstanceType<ModelType> | null> {
    const collection = await this.modelConstructor.getCollection();
    const driverOptions = this.getDriverOptions();
    const result = await collection.findOne(this.filter, driverOptions);
    if (result === null) {
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
    const driverOptions = this.getDriverOptions();
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
    const driverOptions = this.getDriverOptions();
    return collection.countDocuments(
      this.filter,
      driverOptions as CountOptions,
    );
  }

  public async distinct<T = unknown>(key: string): Promise<T[]> {
    const collection = await this.modelConstructor.getCollection();
    const driverOptions = this.getDriverOptions();
    return collection.distinct(
      key,
      this.filter,
      driverOptions as DistinctOptions,
    );
  }

  public async explain(verbosity?: ExplainVerbosityLike): Promise<Document> {
    const collection = await this.modelConstructor.getCollection();
    const driverOptions = this.getDriverOptions();
    return collection.find(this.filter, driverOptions).explain(verbosity);
  }

  public async *[Symbol.asyncIterator](): AsyncIterableIterator<
    InstanceType<ModelType>
  > {
    const collection = await this.modelConstructor.getCollection();
    const driverOptions = this.getDriverOptions();
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

function ensureSort(options?: FindOptions): void {
  if (!options || options.sort) return;
  options.sort = {
    _id: -1,
  };
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
  public static readonly connection?: string;
  public static readonly collectionName: string;
  public static booted: boolean;
  public static readonly $fieldsDefinitions: Map<string, FieldOptions>;

  public readonly _id: unknown;
  public readonly createdAt: Date;
  public readonly updatedAt: Date;

  public $original: Record<string, unknown>;
  public $attributes: Record<string, unknown>;

  public $isPersisted = false;
  public $isLocal = true;
  public $isDeleted = false;

  protected $collection: Collection<
    ModelAttributes<MongodbDocument<unknown>>
  > | null = null;
  protected $options: InternalModelConstructorOptions;

  public constructor(
    dbObj?: Record<string, unknown>,
    options?: InternalModelConstructorOptions,
    alreadyExists = false,
  ) {
    if (dbObj) {
      this.$original = alreadyExists === true ? cloneDeep(dbObj) : {};
      this.$attributes = dbObj;
    } else {
      this.$original = {};
      this.$attributes = {};
    }

    if (options !== undefined) {
      this.$options = options;
      this.$collection = options.collection;
    }

    if (alreadyExists) {
      this.$isPersisted = true;
      this.$isLocal = false;
    }

    // eslint-disable-next-line no-constructor-return
    return new Proxy(this, proxyHandler);
  }

  public static $database: DatabaseContract;
  public static $setDatabase(database: DatabaseContract): void {
    this.$database = database;
  }

  public static $addField(
    name: string,
    options: Partial<FieldOptions> = {},
  ): FieldOptions {
    this.$fieldsDefinitions.set(name, options);
    return options;
  }

  public static $hasField(name: string): boolean {
    return this.$fieldsDefinitions.has(name);
  }

  public static $getField(name: string): FieldOptions | undefined {
    return this.$fieldsDefinitions.get(name);
  }

  public static boot(): void {
    /**
     * Define the property when not defined on self. This makes sure that all
     * subclasses boot on their own.
     */
    if (!hasOwn(this, 'booted')) {
      this.booted = false;
    }

    /**
     * No-op when already booted.
     */
    if (this.booted === true) {
      return;
    }

    this.booted = true;

    defineStaticProperty(this, BaseModel, {
      propertyName: 'collectionName',
      defaultValue: computeCollectionName(this.name),
      strategy: 'define',
    });

    defineStaticProperty(this, BaseModel, {
      propertyName: '$fieldsDefinitions',
      defaultValue: new Map(),
      strategy: 'inherit',
    });
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
    if (result === null) return null;
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
    if (result === null) return null;
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
      Omit<
        FindOptions<ModelAttributes<InstanceType<ModelType>>>,
        ForbiddenQueryOptions
      >
    >,
  ): Query<ModelType> {
    return new Query(filter, options, this);
  }

  public static async getCollection<ModelType extends typeof BaseModel>(
    this: ModelType,
    connection = this.connection,
  ): Promise<Collection<ModelAttributes<InstanceType<ModelType>>>> {
    assert(this.$database, 'Model should only be accessed from IoC container');
    const connectionInstance = this.$database.connection(connection);
    return connectionInstance.collection(this.collectionName);
  }

  public [Symbol.for('nodejs.util.inspect.custom')](): unknown {
    return {
      Model: this.constructor.name,
      $original: this.$original,
      $attributes: this.$attributes,
      $isPersisted: this.$isPersisted,
      $isNew: this.$isNew,
      $isLocal: this.$isLocal,
      $isDeleted: this.$isDeleted,
      $dirty: this.$dirty,
      $isDirty: this.$isDirty,
    };
  }

  public get $isNew(): boolean {
    return !this.$isPersisted;
  }

  public get $dirty(): Partial<ModelAttributes<this>> {
    return pickBy(this.$attributes, (value, key) => {
      return (
        this.$original[key] === undefined ||
        !isEqual(this.$original[key], value)
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
    if (dirtyEntries.length === 0 && this.$isPersisted) {
      return null;
    }

    // We cheat a little bit with the assertion. This is necessary because the
    // value returned by this function can be used in a MongoDB update query
    // which shouldn't reset the createdAt field.
    const toSet = {} as DataToSet;
    const now = new Date();
    if (this.$attributes.createdAt === undefined) {
      this.$attributes.createdAt = now;
      toSet.createdAt = now;
    }
    this.$attributes.updatedAt = now;
    toSet.updatedAt = now;

    for (const [dirtyKey, dirtyValue] of dirtyEntries) {
      toSet[dirtyKey] = dirtyValue;
    }
    return toSet;
  }

  public get id() {
    return this.$attributes._id;
  }

  public get $isDirty(): boolean {
    return Object.keys(this.$dirty).length > 0;
  }

  public toJSON(): unknown {
    return this.$attributes;
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
    if (!this.$isPersisted) {
      const result = await collection.insertOne(toSet, driverOptions);
      this.$attributes._id = result.insertedId;
      this.$isPersisted = true;
    } else {
      await collection.updateOne(
        { _id: this.$attributes._id },
        { $set: toSet },
        driverOptions,
      );
    }
    this.$original = cloneDeep(this.$attributes);
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
        _id: this.$attributes._id,
      },
      driverOptions,
    );
    this.$isDeleted = true;
    return result.deletedCount === 1;
  }

  public merge<T extends Partial<Omit<ModelAttributes<this>, '_id'>>>(
    values: NoExtraProperties<Partial<Omit<ModelAttributes<this>, '_id'>>, T>,
  ): this {
    Object.entries(values).forEach(([key, value]) => {
      this.$attributes[key] = value;
    });
    return this;
  }

  public fill<T extends Partial<Omit<ModelAttributes<this>, '_id'>>>(
    values: NoExtraProperties<Partial<Omit<ModelAttributes<this>, '_id'>>, T>,
  ) {
    const createdAt = this.$attributes.createdAt;
    this.$attributes = {
      _id: this.id,
    };
    if (createdAt) this.$attributes.createdAt = createdAt;
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
        { _id: (this.constructor as typeof BaseModel).collectionName },
        { $inc: { count: 1 } },
        { ...driverOptions, upsert: true, returnDocument: 'after' },
      );
      assert(doc.value, 'upsert should always create a document');
      toSet._id = doc.value.count;
      await collection.insertOne(toSet, driverOptions);
      this.$attributes._id = doc.value.count;
      this.$isPersisted = true;
    } else {
      await collection.updateOne(
        { _id: this.$attributes._id },
        { $set: toSet },
        driverOptions,
      );
    }
    this.$original = cloneDeep(this.$attributes);
    return true;
  }
}
