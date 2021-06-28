declare module '@ioc:Zakodium/Mongodb/Database' {
  import { EventEmitter } from 'events';

  import {
    MongoClientOptions,
    Collection,
    Db,
    ClientSession,
    MongoClient,
  } from 'mongodb';

  /**
   * Shape of the configuration in `config/mongodb.ts`.
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

  export interface DatabaseContract {
    connection(connectionName?: string): ConnectionContract;

    /**
     * Name of the primary connection defined inside `config/mongodb.ts`.
     */
    primaryConnectionName: string;

    /**
     * Connection manager.
     */
    manager: ConnectionManagerContract;
  }

  /**
   * Connection manager to manage database connections.
   */
  export interface ConnectionManagerContract {
    /**
     * List of registered connections.
     */
    connections: Map<string, ConnectionNode>;

    /**
     * Add a new connection.
     */
    add(connectionName: string, config: MongodbConnectionConfig): void;

    /**
     * Initiate a connection. It is a noop if the connection is already initiated.
     */
    connect(connectionName: string): void;

    /**
     * Get a connection.
     */
    get(connectionName: string): ConnectionNode;

    /**
     * Returns whether the connection is managed by the manager.
     */
    has(connectionName: string): boolean;

    /**
     * Returns whether the connection is connected.
     */
    isConnected(connectionName: string): boolean;

    /**
     * Close a connection.
     */
    close(connectionName: string): Promise<void>;

    /**
     * Close all managed connections.
     */
    closeAll(): Promise<void>;
  }

  export interface ConnectionNode {
    name: string;
    config: MongodbConnectionConfig;
    connection: ConnectionContract;
    state: 'registered' | 'open' | 'closing' | 'closed';
  }

  export interface ConnectionContract extends EventEmitter {
    /**
     * Instance of the MongoDB client.
     */
    readonly client: MongoClient;

    /**
     * Name of the connection.
     */
    readonly name: string;

    /**
     * Whether the connection is ready.
     */
    readonly ready: boolean;

    /**
     * Config of the connection.
     */
    readonly config: MongodbConnectionConfig;

    /**
     * Initiate the connection.
     */
    connect(): void;

    /**
     * Close the connection.
     */
    disconnect(): Promise<void>;

    on(
      event: 'connect',
      callback: (connection: ConnectionContract) => void,
    ): this;
    on(
      event: 'error',
      callback: (error: Error, connection: ConnectionContract) => void,
    ): this;
    on(
      event: 'disconnect',
      callback: (connection: ConnectionContract) => void,
    ): this;
    on(
      event: 'disconnect:start',
      callback: (connection: ConnectionContract) => void,
    ): this;
    on(
      event: 'disconnect:error',
      callback: (error: Error, connection: ConnectionContract) => void,
    ): this;

    database(): Promise<Db>;
    collection<TSchema = any>(
      collectionName: string,
    ): Promise<Collection<TSchema>>;
    transaction<TResult>(
      handler: (session: ClientSession, db: Db) => Promise<TResult>,
    ): Promise<TResult>;
  }

  const Database: DatabaseContract;
  export default Database;
}
