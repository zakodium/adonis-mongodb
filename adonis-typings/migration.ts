declare module '@ioc:Zakodium/Mongodb/Migration' {
  import type {
    ClientSession,
    CreateIndexesOptions,
    Db,
    DropIndexesOptions,
    IndexSpecification,
  } from 'mongodb';

  export default abstract class Migration {
    public createCollections(collectionNames: string[]): void;

    /**
     * Drop a collection.
     * This operation will be done last in the migration.
     * It cannot be run in a transaction, so we recommend doing it in a separate migration file.
     * @param collectionName
     */
    public dropCollection(collectionName: string): void;
    public createCollection(collectionName: string): void;
    public createIndex(
      collectionName: string,
      index: IndexSpecification,
      options?: Omit<CreateIndexesOptions, 'session'>,
    ): void;
    public dropIndex(
      collectionName: string,
      indexName: string,
      options?: Omit<DropIndexesOptions, 'session'>,
    ): void;
    public defer(
      callback: (db: Db, client: ClientSession) => Promise<void>,
    ): void;
    public abstract up(): void;
    public afterUpSuccess?(): unknown;
    public execUp(session: ClientSession): Promise<void>;
  }
}
