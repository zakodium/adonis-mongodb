declare module '@ioc:Zakodium/Mongodb/Database' {
  import { MongoClientOptions, Collection, Db, ClientSession } from 'mongodb';

  /**
   * Shape of the configuration in the mongodb config file.
   */
  export interface MongodbConfig {
    /**
     * Primary connection name.
     */
    connection: string;
    /**
     * Connection configurations.
     */
    connections: Record<string, MongodbConnectionConfig>;
  }

  /**
   * Configuration of a MongoDB connection.
   */
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
