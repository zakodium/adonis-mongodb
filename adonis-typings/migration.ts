declare module '@ioc:Zakodium/Mongodb/Migration' {
  import {
    Db,
    ClientSession,
    IndexSpecification,
    CreateIndexesOptions,
  } from 'mongodb';

  export default abstract class Migration {
    public createCollections(collectionNames: string[]): void;
    public createCollection(collectionName: string): void;
    public createIndex(
      collectionName: string,
      index: IndexSpecification,
      options?: CreateIndexesOptions,
    ): void;
    public defer(
      callback: (db: Db, session: ClientSession) => Promise<void>,
    ): void;
    public abstract up(): void;
    public execUp(): Promise<void>;
  }
}
