declare module '@ioc:Zakodium/Mongodb/Odm' {
  import {
    Collection,
    Document,
    Filter,
    FindOptions,
    InsertOneOptions,
    DeleteOptions,
    CountDocumentsOptions,
    BulkWriteOptions,
    ClientSession,
    SortDirection,
    ExplainVerbosityLike,
  } from 'mongodb';

  import { UserProviderContract } from '@ioc:Adonis/Addons/Auth';
  import { HashersList } from '@ioc:Adonis/Core/Hash';

  type DollarProperties<T> = Extract<keyof T, `$${string}`>;
  type FunctionProperties<T> = {
    // eslint-disable-next-line @typescript-eslint/ban-types
    [K in keyof T]: T[K] extends Function ? K : never;
  }[keyof T];
  type ModelSpecial = 'id';

  type ModelAttributes<T> = Omit<
    T,
    | ModelSpecial
    | DollarProperties<T>
    | FunctionProperties<Omit<T, DollarProperties<T>>>
  >;

  export type ForbiddenQueryOptions = 'sort' | 'skip' | 'limit' | 'explain';

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
     * Map of the fields that exist on the model.
     */
    readonly $fieldsDefinitions: Map<string, FieldOptions>;

    /**
     * Add a field on the model.
     * This is usually done by the `@field` decorator.
     */
    $addField(name: string, options?: Partial<FieldOptions>): FieldOptions;

    /**
     * Returns whether the field exists on the model.
     */
    $hasField(name: string): boolean;

    /**
     * Returns the field options if it exists.
     */
    $getField(name: string): FieldOptions | undefined;

    /**
     * Managing computed columns
     */
    $addComputed(
      name: string,
      options: Partial<ComputedOptions>,
    ): ComputedOptions;
    $hasComputed(name: string): boolean;
    $getComputed(name: string): ComputedOptions | undefined;

    /**
     * Custom database connection to use.
     */
    readonly connection?: string;

    /**
     * Name of the collection to use.
     */
    readonly collectionName?: string;

    /**
     * Boot the model.
     */
    boot(): void;

    /**
     * Whether the model has been booted.
     */
    readonly booted: boolean;

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
      filter?: Filter<ModelAttributes<InstanceType<ModelType>>>,
      options?: ModelAdapterOptions<
        Omit<
          FindOptions<ModelAttributes<InstanceType<ModelType>>>,
          ForbiddenQueryOptions
        >
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
    readonly id: this['_id'];

    readonly createdAt: Date;
    readonly updatedAt: Date;

    readonly $original: ModelAttributes<this>;
    readonly $attributes: ModelAttributes<this>;

    /**
     * `true` if the entry has been persisted to the database.
     */
    readonly $isPersisted: boolean;

    /**
     * Opposite of `$isPersisted`.
     */
    readonly $isNew: boolean;

    /**
     * `true` if the entry has been created locally. Similar to `$isNew`, but
     * stays `true` after the entry is persisted to the database.
     */
    readonly $isLocal: boolean;

    /**
     * `true` if the entry has been removed from the database.
     */
    readonly $isDeleted: boolean;

    /**
     * Returns an object with the field values that have been changed.
     */
    readonly $dirty: Partial<ModelAttributes<this>>;

    /**
     * `true` if the entry has unsaved modifications.
     */
    readonly $isDirty: boolean;

    /**
     * Return the client session of the transaction
     */
    readonly $trx: ClientSession | undefined;
    readonly $isTransaction: boolean;

    /**
     * Assign client to model options for transactions use.
     * Will throw an error if model instance already linked to a session
     *
     * It allows to use model init outside a transaction, but save it within a transaction.
     *
     * @param client
     *
     * @example
     * ```ts
     * const label = await Label.findOrFail(1);
     * // edit some label props
     *
     * Database.transaction((client) => {
     *  const documents = await Document.query({ labels: label._id }, { client }).all()
     *  // remove label from documents when new label definition is incompatible
     *  // call .save() for each changed documents (aware of transaction because is from query with client option)
     *
     *  label.useTransaction(client);
     *  label.save();
     * })
     * ```
     */
    useTransaction(client: ClientSession): this;

    /**
     * Returns the Model's current data
     */
    toJSON(): unknown;

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
    merge<T extends Partial<Omit<ModelAttributes<this>, '_id'>>>(
      values: NoExtraProperties<Partial<Omit<ModelAttributes<this>, '_id'>>, T>,
    ): this;

    /**
     * Remove all field in instance and replace it by provided values.
     * @param values - Values to fill in.
     * @returns - modified model instance.
     */
    fill<T extends Partial<Omit<ModelAttributes<this>, '_id'>>>(
      values: NoExtraProperties<Partial<Omit<ModelAttributes<this>, '_id'>>, T>,
    ): this;
  }

  export type QuerySortObject = Record<string, SortDirection>;

  export interface QueryContract<DocumentType> {
    /**
     * Add new criteria to the sort.
     */
    sort(sort: QuerySortObject): this;

    /**
     * Add a new criterion to the sort.
     */
    sortBy(field: string, direction?: SortDirection): this;

    /**
     * Skip `number` entries.
     * Cancels any previous skip call.
     */
    skip(number: number): this;

    /**
     * Limit the result to `number` entries.
     * Cancels any previous limit call.
     */
    limit(number: number): this;

    /**
     * Returns the first matching document or null.
     */
    first(): Promise<DocumentType | null>;

    /**
     * Returns the first matching document or throws.
     */
    firstOrFail(): Promise<DocumentType>;

    /**
     * Returns all matching documents.
     */
    all(): Promise<DocumentType[]>;

    /**
     * Counts all matching documents.
     * Calling this method after `skip` or `limit` might not count everything.
     */
    count(): Promise<number>;

    /**
     * Performs a `distinct` query.
     */
    distinct<T = unknown>(key: string): Promise<T[]>;

    /**
     * Performs an `explain` query.
     */
    explain(verbosity?: ExplainVerbosityLike): Promise<Document>;

    /**
     * Returns an iterator on all matching documents.
     */
    [Symbol.asyncIterator](): AsyncIterableIterator<DocumentType>;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    uids?: Array<keyof ModelAttributes<InstanceType<User>>>;
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
