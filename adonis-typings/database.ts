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
