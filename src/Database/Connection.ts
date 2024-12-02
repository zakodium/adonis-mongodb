import { EventEmitter } from 'node:events';

import { Exception } from '@poppinss/utils';
import type {
  Db,
  Collection,
  ClientSession,
  Document,
  TransactionOptions,
} from 'mongodb';
import { MongoClient } from 'mongodb';

import type { LoggerContract } from '@ioc:Adonis/Core/Logger';
import type {
  MongodbConnectionConfig,
  ConnectionContract,
} from '@ioc:Zakodium/Mongodb/Database';

import { TransactionEventEmitter } from './TransactionEventEmitter';

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

// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
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
    handler: (
      session: ClientSession,
      db: Db,
      transactionEventEmitter: TransactionEventEmitter,
    ) => Promise<TResult>,
    options?: TransactionOptions,
  ): Promise<TResult> {
    const db = await this._ensureDb();

    let session: ClientSession;
    const emitter = new TransactionEventEmitter();

    return this.client
      .withSession((_session) =>
        _session.withTransaction(async (_session) => {
          session = _session;
          return handler(session, db, emitter);
        }, options),
      )
      .then(
        (result) => {
          // https://github.com/mongodb/node-mongodb-native/blob/v6.7.0/src/transactions.ts#L147
          // https://github.com/mongodb/node-mongodb-native/blob/v6.7.0/src/transactions.ts#L54
          // session.transaction.isCommitted is not a sufficient indicator,
          // because it's true if transaction commits or aborts.
          const isCommitted = session.transaction.isCommitted;
          const isAborted =
            // https://github.com/mongodb/node-mongodb-native/blob/v6.7.0/src/transactions.ts#L11
            Reflect.get(session.transaction, 'state') === 'TRANSACTION_ABORTED';

          emitter.emit(
            isCommitted && isAborted ? 'abort' : 'commit',
            session,
            db,
          );

          return result;
          // If an error occurs in this scope,
          // it will not be caught by this then's error handler, but by the caller's catch.
          // This is what we want, as an error in this scope should not trigger the abort event.
        },
        (error) => {
          emitter.emit('abort', session, db, error);
          throw error;
        },
      );
  }
}
