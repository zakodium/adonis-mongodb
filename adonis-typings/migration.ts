declare module '@ioc:Zakodium/Mongodb/Migration' {
  import { IndexOptions, Db, ClientSession } from 'mongodb';

  export default abstract class Migration {
    public createCollections(collectionNames: string[]): void;
    public createCollection(collectionName: string): void;
    public createIndex(
      collectionName: string,
      // eslint-disable-next-line @typescript-eslint/ban-types
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
