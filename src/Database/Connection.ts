import { EventEmitter } from 'node:events';

import type { Logger } from '@adonisjs/core/logger';
import { Exception } from '@poppinss/utils';
import {
  MongoClient,
  Db,
  Collection,
  ClientSession,
  Document,
  TransactionOptions,
} from 'mongodb';

import { MongodbConnectionConfig } from '../types/index.js';

type ConnectionStatus = 'CONNECTED' | 'DISCONNECTED';

// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
export declare interface Connection {
  on(event: 'connect', callback: (connection: Connection) => void): this;
  on(
    event: 'error',
    callback: (error: Error, connection: Connection) => void,
  ): this;
  on(event: 'disconnect', callback: (connection: Connection) => void): this;
  on(
    event: 'disconnect:start',
    callback: (connection: Connection) => void,
  ): this;
  on(
    event: 'disconnect:error',
    callback: (error: Error, connection: Connection) => void,
  ): this;
}

// eslint-disable-next-line unicorn/prefer-event-target, @typescript-eslint/no-unsafe-declaration-merging
export class Connection extends EventEmitter {
  /**
   * Instance of the MongoDB client.
   */
  public readonly client: MongoClient;

  /**
   * Name of the connection.
   */
  public readonly name: string;

  /**
   * Config of the connection.
   */
  public readonly config: MongodbConnectionConfig;

  private logger: Logger;
  private status: ConnectionStatus;
  private connectPromise: Promise<Db> | null;

  public constructor(
    name: string,
    config: MongodbConnectionConfig,
    logger: Logger,
  ) {
    super();

    this.name = name;
    this.config = config;
    this.logger = logger;
    this.status = 'DISCONNECTED';
    this.client = new MongoClient(this.config.url, {
      ...this.config.clientOptions,
    });
    this.connectPromise = null;
  }

  private async _ensureDb(): Promise<Db> {
    this.connect();
    if (!this.connectPromise) {
      throw new Exception(`unexpected MongoDB connection error`, {
        status: 500,
        code: 'E_MONGODB_CONNECTION',
      });
    }
    return this.connectPromise;
  }

  /**
   * Initiate the connection.
   */
  public connect(): void {
    if (this.status === 'CONNECTED') {
      return;
    }
    this.status = 'CONNECTED';
    this.connectPromise = this.client.connect().then((client) => {
      return client.db(this.config.database);
    });
    this.connectPromise.catch((error) => {
      this.connectPromise = null;
      this.status = 'DISCONNECTED';
      this.logger.fatal(`could not connect to database "${this.name}"`, error);
      this.emit('error', error, this);
    });
    this.emit('connect', this);
  }

  /**
   * Close the connection.
   */
  public async disconnect(): Promise<void> {
    if (this.status === 'DISCONNECTED') {
      return;
    }
    this.connectPromise = null;
    this.status = 'DISCONNECTED';
    this.emit('disconnect:start', this);
    try {
      await this.client.close();
      this.emit('disconnect', this);
    } catch (error) {
      this.emit('disconnect:error', error, this);
      throw error;
    }
  }

  public async database(): Promise<Db> {
    return this._ensureDb();
  }

  public async collection<TSchema extends Document>(
    collectionName: string,
  ): Promise<Collection<TSchema>> {
    const db = await this._ensureDb();
    return db.collection(collectionName);
  }

  public async transaction<TResult>(
    handler: (session: ClientSession, db: Db) => Promise<TResult>,
    options?: TransactionOptions,
  ): Promise<TResult> {
    const db = await this._ensureDb();
    let result: TResult;
    await this.client.withSession(async (session) => {
      return session.withTransaction(async (session) => {
        result = await handler(session, db);
      }, options);
    });
    // @ts-expect-error The `await` ensures `result` has a value.
    return result;
  }
}
