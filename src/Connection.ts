import { Exception } from '@poppinss/utils';
import { MongoClient, Db, Collection, ClientSession } from 'mongodb';

import { LoggerContract } from '@ioc:Adonis/Core/Logger';
import {
  MongodbConnectionConfig,
  ConnectionContract,
} from '@ioc:Mongodb/Database';

enum ConnectionStatus {
  CONNECTED = 'CONNECTED',
  DISCONNECTED = 'DISCONNECTED',
}

export class Connection implements ConnectionContract {
  private $name: string;
  private $logger: LoggerContract;
  private $status: ConnectionStatus;
  private $client: MongoClient;
  private $connectPromise: Promise<Db> | null;

  public config: MongodbConnectionConfig;

  public constructor(
    name: string,
    config: MongodbConnectionConfig,
    logger: LoggerContract,
  ) {
    this.$name = name;
    this.config = config;
    this.$logger = logger;
    this.$status = ConnectionStatus.DISCONNECTED;
    this.$client = new MongoClient(this.config.url, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      ...this.config.clientOptions,
    });
    this.$connectPromise = null;
  }

  private async _ensureDb(): Promise<Db> {
    this.connect();
    if (!this.$connectPromise) {
      throw new Exception(
        `unexpected MongoDB connection error`,
        500,
        'E_MONGODB_CONNECTION',
      );
    }
    return this.$connectPromise;
  }

  public connect(): void {
    if (this.$status === ConnectionStatus.CONNECTED) {
      return;
    }
    this.$status = ConnectionStatus.CONNECTED;
    this.$connectPromise = this.$client
      .connect()
      .then((client) => client.db(this.config.database));
    this.$connectPromise.catch((error) => {
      this.$logger.fatal(
        `could not connect to database "${this.$name}"`,
        error,
      );
    });
  }

  public async close(): Promise<void> {
    if (this.$status === ConnectionStatus.DISCONNECTED) {
      return;
    }
    this.$connectPromise = null;
    this.$status = ConnectionStatus.DISCONNECTED;
    return this.$client.close();
  }

  public async database(): Promise<Db> {
    return this._ensureDb();
  }

  public async collection<TSchema = unknown>(
    collectionName: string,
  ): Promise<Collection<TSchema>> {
    const db = await this._ensureDb();
    return db.collection(collectionName);
  }

  public async transaction<TResult>(
    handler: (session: ClientSession, db: Db) => Promise<TResult>,
  ): Promise<TResult> {
    const db = await this._ensureDb();
    let result: TResult;
    await this.$client.withSession(async (session) => {
      return session.withTransaction(async (session) => {
        result = await handler(session, db);
      });
    });
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    return result;
  }
}
