import { Exception } from '@poppinss/utils';

import { LoggerContract } from '@ioc:Adonis/Core/Logger';
import type {
  ConnectionContract,
  ConnectionManagerContract,
  ConnectionNode,
  MongodbConnectionConfig,
} from '@ioc:Zakodium/Mongodb/Database';

import { Connection } from './Connection';

export class ConnectionManager implements ConnectionManagerContract {
  public connections: ConnectionManagerContract['connections'] = new Map();

  public constructor(private logger: LoggerContract) {}

  private validateConnection(connectionName: string): ConnectionNode {
    validateConnectionName(connectionName);
    const connection = this.connections.get(connectionName);
    if (!connection) {
      throw new Exception(
        `no MongoDB connection registered with name "${connectionName}"`,
        500,
        'E_NO_MONGODB_CONNECTION',
      );
    }
    return connection;
  }

  private handleConnect(connection: ConnectionContract): void {
    const connectionNode = this.connections.get(connection.name);
    if (connectionNode) {
      connectionNode.state = 'open';
    }
  }

  private handleClose(connection: ConnectionContract): void {
    const connectionNode = this.connections.get(connection.name);
    if (connectionNode) {
      connectionNode.state = 'closed';
    }
  }

  private handleClosing(connection: ConnectionContract): void {
    const connectionNode = this.connections.get(connection.name);
    if (connectionNode) {
      connectionNode.state = 'closing';
    }
  }

  public add(connectionName: string, config: MongodbConnectionConfig): void {
    validateConnectionName(connectionName);
    if (this.connections.has(connectionName)) {
      throw new Error(
        `a connection with name "${connectionName}" already exists`,
      );
    }

    const connection = new Connection(connectionName, config, this.logger);
    connection.on('connect', (connection) => this.handleConnect(connection));
    connection.on('error', (_, connection) => this.handleClose(connection));
    connection.on('disconnect', (connection) => this.handleClose(connection));
    connection.on('disconnect:start', (connection) =>
      this.handleClosing(connection),
    );
    connection.on('disconnect:error', (_, connection) =>
      this.handleClosing(connection),
    );

    this.connections.set(connectionName, {
      name: connectionName,
      config,
      connection,
      state: 'registered',
    });
  }

  public connect(connectionName: string): void {
    const connection = this.validateConnection(connectionName);
    connection.connection.connect();
  }

  public get(connectionName: string): ConnectionNode {
    const connection = this.validateConnection(connectionName);
    return connection;
  }

  public has(connectionName: string): boolean {
    validateConnectionName(connectionName);
    return this.connections.has(connectionName);
  }

  public isConnected(connectionName: string): boolean {
    const connection = this.validateConnection(connectionName);
    return connection.state === 'open';
  }

  public async close(connectionName: string): Promise<void> {
    const connection = this.validateConnection(connectionName);
    return connection.connection.disconnect();
  }

  public async closeAll(): Promise<void> {
    await Promise.all(
      [...this.connections.values()].map((connection) =>
        connection.connection.disconnect(),
      ),
    );
  }
}

function validateConnectionName(connectionName: string): void {
  if (typeof connectionName !== 'string' || connectionName === '') {
    throw new TypeError('connectionName must be a non-empty string');
  }
}
