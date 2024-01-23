import type { MongoClientOptions } from 'mongodb';

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
