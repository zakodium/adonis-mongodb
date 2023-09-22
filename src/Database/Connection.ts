import { EventEmitter } from 'node:events';

import { Exception } from '@poppinss/utils';
import {
  MongoClient,
  Db,
  Collection,
  ClientSession,
  Document,
  TransactionOptions,
} from 'mongodb';

import { LoggerContract } from '@ioc:Adonis/Core/Logger';
import type {
  MongodbConnectionConfig,
  ConnectionContract,
} from '@ioc:Zakodium/Mongodb/Database';

enum ConnectionStatus {
  CONNECTED = 'CONNECTED',
  DISCONNECTED = 'DISCONNECTED',
}

// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
export declare interface Connection {
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
}

// eslint-disable-next-line unicorn/prefer-event-target, @typescript-eslint/no-unsafe-declaration-merging
export class Connection extends EventEmitter implements ConnectionContract {
  public readonly client: MongoClient;
  public readonly name: string;
  public ready: boolean;
  public readonly config: MongodbConnectionConfig;

  private logger: LoggerContract;
  private status: ConnectionStatus;
  private connectPromise: Promise<Db> | null;

  public constructor(
    name: string,
    config: MongodbConnectionConfig,
    logger: LoggerContract,
  ) {
    super();

    this.name = name;
    this.config = config;
    this.logger = logger;
    this.status = ConnectionStatus.DISCONNECTED;
    this.client = new MongoClient(this.config.url, {
      ...this.config.clientOptions,
    });
    this.connectPromise = null;
  }

  private async _ensureDb(): Promise<Db> {
    void this.connect();
    if (!this.connectPromise) {
      throw new Exception(
        `unexpected MongoDB connection error`,
        500,
        'E_MONGODB_CONNECTION',
      );
    }
    return this.connectPromise;
  }

  public connect(): Promise<Db> {
    if (this.status === ConnectionStatus.CONNECTED) {
      return this.connectPromise as Promise<Db>;
    }
    this.status = ConnectionStatus.CONNECTED;
    this.connectPromise = this.client.connect().then((client) => {
      return client.db(this.config.database);
    });
    this.connectPromise.catch((error) => {
      this.connectPromise = null;
      this.status = ConnectionStatus.DISCONNECTED;
      this.logger.fatal(`could not connect to database "${this.name}"`, error);
      this.emit('error', error, this);
    });
    this.emit('connect', this);
    return this.connectPromise;
  }

  public async disconnect(): Promise<void> {
    if (this.status === ConnectionStatus.DISCONNECTED) {
      return;
    }
    this.connectPromise = null;
    this.status = ConnectionStatus.DISCONNECTED;
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
    return this.client.withSession(async (session) => {
      return session.withTransaction(async (session) => {
        return handler(session, db);
      }, options);
    });
  }
}
