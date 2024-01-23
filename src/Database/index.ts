import type { Logger } from '@adonisjs/core/logger';
import { ClientSession, Db, TransactionOptions } from 'mongodb';

import { MongodbConfig } from '../types/index.js';

import { Connection } from './connection.js';
import { ConnectionManager } from './connection_manager.js';

export class Database {
  /**
   * Connection manager.
   */
  public readonly manager: ConnectionManager;

  /**
   * Name of the primary connection defined inside `config/mongodb.ts`.
   */
  public readonly primaryConnectionName: string;

  public constructor(
    private config: MongodbConfig,
    private logger: Logger,
  ) {
    if (typeof config.connection !== 'string') {
      throw new TypeError('config.connection must be a string');
    }
    if (typeof config.connections !== 'object' || config.connections === null) {
      throw new TypeError('config.connections must be an object');
    }

    this.primaryConnectionName = config.connection;
    if (typeof config.connections[this.primaryConnectionName] !== 'object') {
      throw new TypeError(
        `config.connections must contain a key with the primary connection name (${this.primaryConnectionName})`,
      );
    }

    this.manager = new ConnectionManager(this.logger);
    this.registerConnections();
  }

  private registerConnections(): void {
    const config = this.config.connections;
    for (const [connectionName, connectionConfig] of Object.entries(config)) {
      this.manager.add(connectionName, connectionConfig);
    }
  }

  public connection(connectionName = this.primaryConnectionName): Connection {
    return this.manager.get(connectionName).connection;
  }

  /**
   * Shortcut to `Database.connection().transaction()`
   *
   * @param handler
   * @param options
   */
  public transaction<TResult>(
    handler: (client: ClientSession, db: Db) => Promise<TResult>,
    options?: TransactionOptions,
  ): Promise<TResult> {
    const client = this.connection();
    return client.transaction(handler, options);
  }
}
