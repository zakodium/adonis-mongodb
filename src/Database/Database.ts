import { ClientSession, Db, TransactionOptions } from 'mongodb';

import { LoggerContract } from '@ioc:Adonis/Core/Logger';
import type {
  ConnectionContract,
  ConnectionManagerContract,
  DatabaseContract,
  MongodbConfig,
} from '@ioc:Zakodium/Mongodb/Database';

import { ConnectionManager } from './ConnectionManager';

export class Database implements DatabaseContract {
  public readonly manager: ConnectionManagerContract;
  public readonly primaryConnectionName: string;

  public constructor(
    private config: MongodbConfig,
    private logger: LoggerContract,
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

  public connection(
    connectionName = this.primaryConnectionName,
  ): ConnectionContract {
    return this.manager.get(connectionName).connection;
  }

  public transaction<TResult>(
    handler: (client: ClientSession, db: Db) => Promise<TResult>,
    options?: TransactionOptions,
  ): Promise<TResult> {
    const client = this.connection();
    return client.transaction(handler, options);
  }
}
