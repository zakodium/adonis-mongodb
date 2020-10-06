declare module '@ioc:Mongodb/Database' {
  import { MongoClientOptions, Collection, Db, ClientSession } from 'mongodb';

  export interface MongodbConnections {
    [key: string]: MongodbConnectionConfig;
  }

  export interface MongodbConfig {
    default: string;
    connections: MongodbConnections;
  }

  export interface MongodbConnectionConfig {
    url: string;
    database: string;
    clientOptions?: MongoClientOptions;
    migrations?: string[];
  }

  export interface MongodbContract {
    hasConnection(connectionName: string): boolean;
    connection(connectionName?: string): ConnectionContract;
    closeConnections(): Promise<void>;
  }

  export interface ConnectionContract {
    connect(): void;
    close(): Promise<void>;
    database(): Promise<Db>;
    collection<TSchema = any>(
      collectionName: string,
    ): Promise<Collection<TSchema>>;
    transaction<TResult>(
      handler: (session: ClientSession, db: Db) => Promise<TResult>,
    ): Promise<TResult>;
  }

  const mongodb: MongodbContract;
  export default mongodb;
}

declare module '@ioc:Mongodb/Model' {
  import {
    Collection,
    ObjectId,
    FilterQuery,
    FindOneOptions,
    UpdateOneOptions,
    CollectionInsertOneOptions,
    CommonOptions,
  } from 'mongodb';

  export type ModelCreateOptions = CollectionInsertOneOptions;

  export interface ModelConstructor<IdType = ObjectId> {
    new (...args: any[]): Model<IdType>;
    create<T extends Model<IdType>, ValueType = any>(
      this: Constructor<T>,
      value: ValueType,
      options?: ModelCreateOptions,
    ): Promise<T>;
    findOne<T extends Model<IdType>>(
      this: Constructor<T>,
      filter: FilterQuery<T>,
      options?: FindOneOptions<T>,
    ): Promise<T | null>;
    find<T extends Model<IdType>>(
      this: Constructor<T>,
      filter: FilterQuery<T>,
      options?: FindOneOptions<T>,
    ): Promise<FindResult<T>>;
    findById<T extends Model<IdType>>(
      this: Constructor<T>,
      id: IdType,
      options?: FindOneOptions<T>,
    ): Promise<T | null>;
    findByIdOrThrow<T extends Model<IdType>>(
      this: Constructor<T>,
      id: IdType,
      options?: FindOneOptions<T>,
    ): Promise<T>;
    getCollection<T extends Model<IdType>>(
      this: Constructor<T>,
    ): Promise<Collection<T>>;
  }

  type Constructor<M> = new (...args: any[]) => M;

  interface FindResult<T> {
    all(): Promise<T[]>;
    count(): Promise<number>;
    [Symbol.asyncIterator](): AsyncIterableIterator<T>;
  }

  class Model<IdType = ObjectId> {
    /**
     * Create one document and return it.
     */
    public static create<T extends Model<any>, ValueType = any>(
      this: Constructor<T>,
      value: ValueType,
      options?: ModelCreateOptions,
    ): Promise<T>;

    /**
     * Find one document and return it.
     */
    public static findOne<T extends Model<any>>(
      this: Constructor<T>,
      filter: FilterQuery<T>,
      options?: FindOneOptions<T>,
    ): Promise<T | null>;

    /**
     * Find multiple documents.
     */
    public static find<T extends Model<any>>(
      this: Constructor<T>,
      filter: FilterQuery<T>,
      options?: FindOneOptions<T>,
    ): Promise<FindResult<T>>;

    /**
     * Find a single document with its id.
     */
    public static findById<T extends Model<any>>(
      this: Constructor<T>,
      id: unknown,
      options?: FindOneOptions<T>,
    ): Promise<T | null>;

    /**
     * Find a single document with its id.
     * Throws an error if no document was found.
     */
    public static findByIdOrThrow<T extends Model<any>>(
      this: Constructor<T>,
      id: unknown,
      options?: FindOneOptions<T>,
    ): Promise<T>;

    /**
     * Get the Collection object from the mongodb driver.
     */
    public static getCollection<T extends Model<any>>(
      this: Constructor<T>,
    ): Promise<Collection<T>>;

    public readonly _id: IdType;

    public get id(): IdType;

    public readonly createdAt: Date;
    public readonly updatedAt: Date;

    /**
     * `true` if the entry has unsaved modifications.
     */
    public get isDirty(): boolean;

    /**
     * Save the entry to the database.
     * @returns - whether the entry was changed.
     */
    public save(options?: UpdateOneOptions): Promise<boolean>;

    /**
     * Delete the entry from the database.
     * @returns - whether the entry was deleted.
     */
    public delete(options?: CommonOptions): Promise<boolean>;

    /**
     * Merge given values into the model instance.
     * @param values - Values to merge with.
     * @returns - modified model instance.
     */
    public merge<ValueType = any>(values: ValueType): this;

    /**
     * Remove all field in instance and replace it by provided values.
     * @param values - Values to fill in.
     * @returns - modified model instance.
     */
    public fill<ValueType = any>(values: ValueType): this;
  }

  class AutoIncrementModel extends Model<number> {}
}

declare module '@ioc:Mongodb/ObjectId' {
  import { ObjectId } from 'mongodb';
  export default ObjectId;
}

declare module '@ioc:Mongodb/Migration' {
  import { IndexOptions, Db, ClientSession } from 'mongodb';

  export default abstract class Migration {
    public createCollections(collectionNames: string[]): void;
    public createCollection(collectionName: string): void;
    public createIndex(
      collectionName: string,
      index: string | object,
      options?: IndexOptions,
    ): void;
    public defer(
      callback: (db: Db, session: ClientSession) => Promise<void>,
    ): void;
    public abstract up(): void;
    public execUp(): Promise<void>;
  }
}
