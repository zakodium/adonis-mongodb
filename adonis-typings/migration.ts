declare module '@ioc:Zakodium/Mongodb/Migration' {
  import {
    Db,
    ClientSession,
    IndexSpecification,
    CreateIndexesOptions,
    DropIndexesOptions,
  } from 'mongodb';

  export default abstract class Migration {
    public createCollections(collectionNames: string[]): void;
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
    public execUp(): Promise<void>;
  }
}
