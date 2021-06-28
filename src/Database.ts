import { Exception } from '@poppinss/utils';

import { LoggerContract } from '@ioc:Adonis/Core/Logger';
import type {
  DatabaseContract,
  MongodbConfig,
} from '@ioc:Zakodium/Mongodb/Database';

import { Connection } from './Connection';

export class Database implements DatabaseContract {
  private connections: Map<string, Connection>;

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

    this.connections = new Map();
    this._registerConnections();
  }

  private _registerConnections(): void {
    const config = this.config.connections;
    for (const [connectionName, connectionConfig] of Object.entries(config)) {
      this.connections.set(
        connectionName,
        new Connection(connectionName, connectionConfig, this.logger),
      );
    }
  }

  public hasConnection(connectionName: string): boolean {
    return this.connections.has(connectionName);
  }

  public connection(
    connectionName: string = this.primaryConnectionName,
  ): Connection {
    if (!this.hasConnection(connectionName)) {
      throw new Exception(
        `no MongoDB connection registered with name "${connectionName}"`,
        500,
        'E_NO_MONGODB_CONNECTION',
      );
    }

    const connection = this.connections.get(connectionName) as Connection;
    return connection;
  }

  public async closeConnections(): Promise<void> {
    await Promise.all(
      [...this.connections.values()].map(async (connection) =>
        connection.close(),
      ),
    );
  }
}
