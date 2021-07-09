declare module '@ioc:Zakodium/Mongodb/Odm' {
  import {
    Collection,
    Filter,
    FindOptions,
    InsertOneOptions,
    DeleteOptions,
    CountDocumentsOptions,
    BulkWriteOptions,
    ClientSession,
  } from 'mongodb';

  import { UserProviderContract } from '@ioc:Adonis/Addons/Auth';
  import { HashersList } from '@ioc:Adonis/Core/Hash';

  type ModelReadonlyFields =
    | 'id'
    | 'isDirty'
    | 'toJSON'
    | 'save'
    | 'delete'
    | 'merge'
    | 'fill'
    | 'createdAt'
    | 'updatedAt';

  /**
   * TODO: implement this correctly
   */
  type ModelAttributes<T> = Omit<T, ModelReadonlyFields>;

  /**
   * Model adapter options
   */
  export interface ModelAdapterOptions<
    DriverOptionType extends { session?: ClientSession },
  > {
    client?: ClientSession;
    // TODO: add connection option.
    // https://docs.adonisjs.com/reference/orm/base-model#model-adapter-options
    driverOptions?: Omit<DriverOptionType, 'session'>;
  }

  /**
   * Shape of the model static properties.
   *
   */
  export interface MongodbModel<IdType> {
    /**
     * Custom database connection to use.
     */
    connection?: string;

    /**
     * Name of the collection to use.
     */
    collectionName?: string;

    /**
     * Count the number of documents in the collection that match the filter.
     */
    count<ModelType extends MongodbModel<IdType>>(
      this: ModelType,
      filter: Filter<ModelAttributes<InstanceType<ModelType>>>,
      options?: ModelAdapterOptions<CountDocumentsOptions>,
    ): Promise<number>;

    /**
     * Create a new document in the collection.
     */
    create<ModelType extends MongodbModel<IdType>>(
      this: ModelType,
      value: Partial<ModelAttributes<InstanceType<ModelType>>>,
      options?: ModelAdapterOptions<InsertOneOptions>,
    ): Promise<InstanceType<ModelType>>;

    /**
     * Create many documents in the collection.
     */
    createMany<ModelType extends MongodbModel<IdType>>(
      this: ModelType,
      values: Array<Partial<ModelAttributes<InstanceType<ModelType>>>>,
      options?: ModelAdapterOptions<BulkWriteOptions>,
    ): Promise<Array<InstanceType<ModelType>>>;

    /**
     * Find a document by its id.
     */
    find<ModelType extends MongodbModel<IdType>>(
      this: ModelType,
      id: InstanceType<ModelType>['_id'],
      options?: ModelAdapterOptions<
        FindOptions<ModelAttributes<InstanceType<ModelType>>>
      >,
    ): Promise<InstanceType<ModelType> | null>;

    /**
     * Find a document by its id. Throw if no document is found.
     */
    findOrFail<ModelType extends MongodbModel<IdType>>(
      this: ModelType,
      id: InstanceType<ModelType>['_id'],
      options?: ModelAdapterOptions<
        FindOptions<ModelAttributes<InstanceType<ModelType>>>
      >,
    ): Promise<InstanceType<ModelType>>;

    /**
     * Find a document using a key-value pair.
     */
    findBy<ModelType extends MongodbModel<IdType>>(
      this: ModelType,
      key: string,
      value: unknown,
      options?: ModelAdapterOptions<
        FindOptions<ModelAttributes<InstanceType<ModelType>>>
      >,
    ): Promise<InstanceType<ModelType> | null>;

    /**
     * Find a document using a key-value pair. Throw if no document is found.
     */
    findByOrFail<ModelType extends MongodbModel<IdType>>(
      this: ModelType,
      key: string,
      value: unknown,
      options?: ModelAdapterOptions<
        FindOptions<ModelAttributes<InstanceType<ModelType>>>
      >,
    ): Promise<InstanceType<ModelType>>;

    /**
     * Find many documents by their ids.
     */
    findMany<ModelType extends MongodbModel<IdType>>(
      this: ModelType,
      ids: Array<InstanceType<ModelType>['_id']>,
      options?: ModelAdapterOptions<
        FindOptions<ModelAttributes<InstanceType<ModelType>>>
      >,
    ): Promise<Array<InstanceType<ModelType>>>;

    /**
     * Fetch all documents in the collection.
     */
    all<ModelType extends MongodbModel<IdType>>(
      this: ModelType,
      options?: ModelAdapterOptions<
        FindOptions<ModelAttributes<InstanceType<ModelType>>>
      >,
    ): Promise<Array<InstanceType<ModelType>>>;

    /**
     * Returns a query
     */
    query<ModelType extends MongodbModel<IdType>>(
      this: ModelType,
      filter: Filter<ModelAttributes<InstanceType<ModelType>>>,
      options?: ModelAdapterOptions<
        FindOptions<ModelAttributes<InstanceType<ModelType>>>
      >,
    ): QueryContract<InstanceType<ModelType>>;

    /**
     * Get the collection object from the MongoDB driver.
     */
    getCollection<ModelType extends MongodbModel<IdType>>(
      this: ModelType,
      connection?: string,
    ): Promise<Collection<ModelAttributes<InstanceType<ModelType>>>>;

    new (): MongodbDocument<IdType>;
  }

  export interface ModelDocumentOptions<DriverOptionType> {
    driverOptions?: Omit<DriverOptionType, 'session'>;
  }

  export interface MongodbDocument<IdType> {
    readonly _id: IdType;
    readonly id: IdType;

    readonly createdAt: Date;
    readonly updatedAt: Date;

    /**
     * Returns the Model's current data
     */
    toJSON(): unknown;

    /**
     * `true` if the entry has unsaved modifications.
     */
    get isDirty(): boolean;

    /**
     * Save the entry to the database.
     * @returns - whether the entry was changed.
     */
    save(options?: ModelDocumentOptions<InsertOneOptions>): Promise<boolean>;

    /**
     * Delete the entry from the database.
     * @returns - whether the entry was deleted.
     */
    delete(options?: ModelDocumentOptions<DeleteOptions>): Promise<boolean>;

    /**
     * Merge given values into the model instance.
     * @param values - Values to merge with.
     * @returns - modified model instance.
     */
    merge<T extends Partial<Omit<this, '_id' | 'id' | ModelReadonlyFields>>>(
      values: NoExtraProperties<
        Partial<Omit<this, '_id' | 'id' | ModelReadonlyFields>>,
        T
      >,
    ): this;

    /**
     * Remove all field in instance and replace it by provided values.
     * @param values - Values to fill in.
     * @returns - modified model instance.
     */
    fill<T extends Partial<Omit<this, '_id' | 'id' | ModelReadonlyFields>>>(
      values: NoExtraProperties<
        Partial<Omit<this, '_id' | 'id' | ModelReadonlyFields>>,
        T
      >,
    ): this;
  }

  interface QueryContract<DocumentType> {
    first(): Promise<DocumentType | null>;
    firstOrFail(): Promise<DocumentType>;
    all(): Promise<DocumentType[]>;
    count(): Promise<number>;
    distinct<T = unknown>(key: string): Promise<T[]>;
    [Symbol.asyncIterator](): AsyncIterableIterator<DocumentType>;
  }

  type Impossible<K extends keyof any> = {
    [P in K]: never;
  };

  type NoExtraProperties<T, U extends T = T> = U &
    Impossible<Exclude<keyof U, keyof T>>;

  export const BaseModel: MongodbModel<unknown>;
  export const BaseAutoIncrementModel: MongodbModel<number>;

  export interface MongodbModelAuthProviderContract<
    User extends MongodbModel<unknown>,
  > extends UserProviderContract<InstanceType<User>> {}

  export interface MongodbModelAuthProviderConfig<
    User extends MongodbModel<unknown>,
  > {
    driver: 'mongodb-model';
    /**
     * Function that imports the user model.
     * @default () => import('App/Models/User')
     */
    model?: () =>
      | Promise<User>
      | Promise<{
          default: User;
        }>;
    /**
     * List of keys used to search the user.
     * @default ['email']
     */
    uids?: (keyof ModelAttributes<InstanceType<User>>)[];
    /**
     * Unique key on the user object.
     * @default _id
     */
    identifierKey?: keyof ModelAttributes<InstanceType<User>>;
    /**
     * Value type for `identifierKey`.
     * @default 'objectid'
     */
    identifierKeyType?: 'objectid' | 'string' | 'number';
    /**
     * Hash driver used to hash the password.
     */
    hashDriver?: keyof HashersList;
  }
}
