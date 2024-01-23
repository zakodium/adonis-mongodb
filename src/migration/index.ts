import type {
  ClientSession,
  CreateIndexesOptions,
  Db,
  DropIndexesOptions,
  IndexSpecification,
} from 'mongodb';

import { Connection } from '../database/connection.js';
import type { Database } from '../database/index.js';

// TODO: import logger type used by commands.
// import { Logger } from '@poppinss/cliui/build/src/Logger';
type Logger = any;

interface CreateCollectionOperation {
  type: 'CreateCollection';
  collectionName: string;
}

interface DropIndexOperation {
  type: 'DropIndex';
  collectionName: string;
  indexName: string;
  options?: DropIndexesOptions;
}

interface CreateIndexOperation {
  type: 'CreateIndex';
  collectionName: string;
  index: IndexSpecification;
  options?: CreateIndexesOptions;
}

interface CustomOperation {
  type: 'Custom';
  callback: (db: Db, session: ClientSession) => Promise<void>;
}

type MigrationOperation =
  | CreateCollectionOperation
  | DropIndexOperation
  | CreateIndexOperation
  | CustomOperation;

export abstract class Migration {
  private $operations: MigrationOperation[] = [];
  private $connection: Connection;
  private $logger: Logger;
  private $collectionList: string[];

  public constructor(
    db: Database,
    connection: string | undefined,
    logger: Logger,
  ) {
    this.$connection = db.connection(connection);
    this.$logger = logger;
  }

  public createCollections(collectionNames: string[]): void {
    for (const collectionName of collectionNames) {
      this.createCollection(collectionName);
    }
  }

  public createCollection(collectionName: string): void {
    this.$operations.push({
      type: 'CreateCollection',
      collectionName,
    });
  }

  public dropIndex(
    collectionName: string,
    indexName: string,
    options?: Omit<DropIndexesOptions, 'session'>,
  ): void {
    this.$operations.push({
      type: 'DropIndex',
      collectionName,
      indexName,
      options,
    });
  }

  public createIndex(
    collectionName: string,
    index: IndexSpecification,
    options?: Omit<CreateIndexesOptions, 'session'>,
  ): void {
    this.$operations.push({
      type: 'CreateIndex',
      collectionName,
      index,
      options,
    });
  }

  public defer(callback: (db: Db, session: ClientSession) => Promise<void>) {
    this.$operations.push({
      type: 'Custom',
      callback,
    });
  }

  public async execUp(session: ClientSession): Promise<void> {
    this.up();
    await this._createCollections(session);
    await this._dropIndexes(session);
    await this._createIndexes(session);
    await this._executeDeferred(session);
  }

  private async _listCollections() {
    if (this.$collectionList) return this.$collectionList;
    const db = await this.$connection.database();
    const list = await db
      .listCollections(undefined, {
        nameOnly: true,
      })
      .toArray();
    this.$collectionList = list.map((element) => element.name);
    return this.$collectionList;
  }

  private async _createCollections(session: ClientSession): Promise<void> {
    const db = await this.$connection.database();
    for (const op of this.$operations.filter(isCreateCollection)) {
      this.$logger.info(`Creating collection ${op.collectionName}`);
      // eslint-disable-next-line no-await-in-loop
      await db.createCollection(op.collectionName, {
        session,
      });
    }
  }

  private async _executeDeferred(session: ClientSession): Promise<void> {
    const db = await this.$connection.database();
    for (const op of this.$operations.filter(isCustom)) {
      // eslint-disable-next-line no-await-in-loop
      await op.callback(db, session);
    }
  }

  private async _dropIndexes(session: ClientSession): Promise<void> {
    const db = await this.$connection.database();
    for (const op of this.$operations.filter(isDropIndex)) {
      this.$logger.info(
        `Dropping index ${op.indexName} on ${op.collectionName}`,
      );
      const collection = db.collection(op.collectionName);
      // Index deletion cannot be done in a transaction.
      // eslint-disable-next-line no-await-in-loop
      await collection.dropIndex(op.indexName, { ...op.options, session });
    }
  }

  private async _createIndexes(session: ClientSession): Promise<void> {
    const db = await this.$connection.database();
    const collections = await this._listCollections();
    for (const op of this.$operations.filter(isCreateIndex)) {
      this.$logger.info(`Creating index on ${op.collectionName}`);
      // eslint-disable-next-line no-await-in-loop
      await db.createIndex(op.collectionName, op.index, {
        ...op.options,
        // Index creation will fail if collection pre-exists the transaction.
        session: collections.includes(op.collectionName) ? undefined : session,
      });
    }
  }

  public abstract up(): void;
  public afterUpSuccess?(): unknown;
}

function isCreateCollection(
  op: MigrationOperation,
): op is CreateCollectionOperation {
  return op.type === 'CreateCollection';
}

function isCreateIndex(op: MigrationOperation): op is CreateIndexOperation {
  return op.type === 'CreateIndex';
}

function isDropIndex(op: MigrationOperation): op is DropIndexOperation {
  return op.type === 'DropIndex';
}

function isCustom(op: MigrationOperation): op is CustomOperation {
  return op.type === 'Custom';
}
