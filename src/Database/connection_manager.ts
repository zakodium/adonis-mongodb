import type { Logger } from '@adonisjs/core/logger';
import { Exception } from '@poppinss/utils';

import { MongodbConnectionConfig } from '../types/index.js';

import { Connection } from './connection.js';

interface ConnectionNode {
  name: string;
  config: MongodbConnectionConfig;
  connection: Connection;
  state: 'registered' | 'open' | 'closing' | 'closed';
}

/**
 * Connection manager to manage database connections.
 */
export class ConnectionManager {
  /**
   * List of registered connections.
   */
  public connections = new Map<string, ConnectionNode>();

  public constructor(private logger: Logger) {}

  private validateConnection(connectionName: string): ConnectionNode {
    validateConnectionName(connectionName);
    const connection = this.connections.get(connectionName);
    if (!connection) {
      throw new Exception(
        `no MongoDB connection registered with name "${connectionName}"`,
        {
          status: 500,
          code: 'E_NO_MONGODB_CONNECTION',
        },
      );
    }
    return connection;
  }

  private handleConnect(connection: Connection): void {
    const connectionNode = this.connections.get(connection.name);
    if (connectionNode) {
      connectionNode.state = 'open';
    }
  }

  private handleClose(connection: Connection): void {
    const connectionNode = this.connections.get(connection.name);
    if (connectionNode) {
      connectionNode.state = 'closed';
    }
  }

  private handleClosing(connection: Connection): void {
    const connectionNode = this.connections.get(connection.name);
    if (connectionNode) {
      connectionNode.state = 'closing';
    }
  }

  /**
   * Add a new connection.
   */
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

  /**
   * Initiate a connection. It is a noop if the connection is already initiated.
   */
  public connect(connectionName: string): void {
    const connection = this.validateConnection(connectionName);
    connection.connection.connect();
  }

  /**
   * Get a connection.
   */
  public get(connectionName: string): ConnectionNode {
    const connection = this.validateConnection(connectionName);
    return connection;
  }

  /**
   * Returns whether the connection is managed by the manager.
   */
  public has(connectionName: string): boolean {
    validateConnectionName(connectionName);
    return this.connections.has(connectionName);
  }

  /**
   * Returns whether the connection is connected.
   */
  public isConnected(connectionName: string): boolean {
    const connection = this.validateConnection(connectionName);
    return connection.state === 'open';
  }

  /**
   * Close a connection.
   */
  public async close(connectionName: string): Promise<void> {
    const connection = this.validateConnection(connectionName);
    return connection.connection.disconnect();
  }

  /**
   * Close all managed connections.
   */
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
