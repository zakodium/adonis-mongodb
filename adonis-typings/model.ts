declare module '@ioc:Zakodium/Mongodb/Model' {
  import {
    Collection,
    ObjectId,
    FilterQuery,
    FindOneOptions,
    UpdateOneOptions,
    CollectionInsertOneOptions,
    CommonOptions,
  } from 'mongodb';

  import { UserProviderContract } from '@ioc:Adonis/Addons/Auth';
  import { HashersList } from '@ioc:Adonis/Core/Hash';

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

  type ModelReadonlyFields =
    | 'isDirty'
    | 'toJSON'
    | 'save'
    | 'delete'
    | 'merge'
    | 'fill'
    | 'createdAt'
    | 'updatedAt';

  type Impossible<K extends keyof any> = {
    [P in K]: never;
  };

  type NoExtraProperties<T, U extends T = T> = U &
    Impossible<Exclude<keyof U, keyof T>>;

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
     * Returns the Model's current data
     */
    public toJSON(): unknown;

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
    public merge<
      T extends Partial<Omit<this, '_id' | 'id' | ModelReadonlyFields>>,
    >(
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
    public fill<
      T extends Partial<Omit<this, '_id' | 'id' | ModelReadonlyFields>>,
    >(
      values: NoExtraProperties<
        Partial<Omit<this, '_id' | 'id' | ModelReadonlyFields>>,
        T
      >,
    ): this;
  }

  class AutoIncrementModel extends Model<number> {}

  export interface MongodbModelAuthProviderContract<
    User extends ModelConstructor<unknown>,
  > extends UserProviderContract<InstanceType<User>> {}

  export interface MongodbModelAuthProviderConfig<
    User extends ModelConstructor<unknown>,
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
    uids?: (keyof InstanceType<User>)[];
    /**
     * Unique key on the user object.
     * @default _id
     */
    identifierKey?: keyof InstanceType<User>;
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