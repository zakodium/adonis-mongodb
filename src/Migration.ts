import { Logger } from '@poppinss/cliui/build/src/Logger';
import {
  CreateIndexesOptions,
  ClientSession,
  Db,
  IndexSpecification,
  DropIndexesOptions,
} from 'mongodb';

import type {
  ConnectionContract,
  DatabaseContract,
} from '@ioc:Zakodium/Mongodb/Database';

enum MigrationType {
  CreateCollection = 'CreateCollection',
  DropIndex = 'DropIndex',
  CreateIndex = 'CreateIndex',
  Custom = 'Custom',
}

interface CreateCollectionOperation {
  type: MigrationType.CreateCollection;
  collectionName: string;
}

interface DropIndexOperation {
  type: MigrationType.DropIndex;
  collectionName: string;
  indexName: string;
  options?: DropIndexesOptions;
}

interface CreateIndexOperation {
  type: MigrationType.CreateIndex;
  collectionName: string;
  index: IndexSpecification;
  options?: CreateIndexesOptions;
}

interface CustomOperation {
  type: MigrationType.Custom;
  callback: (db: Db, session: ClientSession) => Promise<void>;
}

type MigrationOperation =
  | CreateCollectionOperation
  | DropIndexOperation
  | CreateIndexOperation
  | CustomOperation;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function createMigration(Database: DatabaseContract): any {
  abstract class Migration {
    private $operations: MigrationOperation[] = [];
    private $connection: ConnectionContract;
    private $logger: Logger;
    private $session: ClientSession;
    private $collectionList: string[];

    public constructor(
      connection: string | undefined,
      logger: Logger,
      session: ClientSession,
    ) {
      this.$connection = Database.connection(connection);
      this.$logger = logger;
      this.$session = session;
    }

    public createCollections(collectionNames: string[]): void {
      for (const collectionName of collectionNames) {
        this.createCollection(collectionName);
      }
    }

    public createCollection(collectionName: string): void {
      this.$operations.push({
        type: MigrationType.CreateCollection,
        collectionName,
      });
    }

    public dropIndex(
      collectionName: string,
      indexName: string,
      options?: DropIndexesOptions,
    ): void {
      this.$operations.push({
        type: MigrationType.DropIndex,
        collectionName,
        indexName,
        options,
      });
    }

    public createIndex(
      collectionName: string,
      index: IndexSpecification,
      options?: CreateIndexesOptions,
    ): void {
      this.$operations.push({
        type: MigrationType.CreateIndex,
        collectionName,
        index,
        options,
      });
    }

    public defer(callback: (db: Db, session: ClientSession) => Promise<void>) {
      this.$operations.push({
        type: MigrationType.Custom,
        callback,
      });
    }

    public async execUp(): Promise<void> {
      this.up();
      await this._createCollections();
      await this._dropIndexes();
      await this._createIndexes();
      await this._executeDeferred();
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

    private async _createCollections(): Promise<void> {
      const db = await this.$connection.database();
      for (const op of this.$operations.filter(isCreateCollection)) {
        this.$logger.info(`Creating collection ${op.collectionName}`);
        await db.createCollection(op.collectionName, {
          session: this.$session,
        });
      }
    }

    private async _executeDeferred(): Promise<void> {
      const db = await this.$connection.database();
      for (const op of this.$operations.filter(isCustom)) {
        await op.callback(db, this.$session);
      }
    }

    private async _dropIndexes(): Promise<void> {
      const db = await this.$connection.database();
      for (const op of this.$operations.filter(isDropIndex)) {
        this.$logger.info(
          `Dropping index ${op.indexName} on ${op.collectionName}`,
        );
        const collection = db.collection(op.collectionName);
        // Index deletion cannot be done in a transaction.
        await collection.dropIndex(op.indexName, { ...op.options });
      }
    }

    private async _createIndexes(): Promise<void> {
      const db = await this.$connection.database();
      const collections = await this._listCollections();
      for (const op of this.$operations.filter(isCreateIndex)) {
        this.$logger.info(`Creating index on ${op.collectionName}`);
        await db.createIndex(op.collectionName, op.index, {
          ...op.options,
          // Index creation will fail if collection pre-exists the transaction.
          session: collections.includes(op.collectionName)
            ? undefined
            : this.$session,
        });
      }
    }

    public abstract up(): void;
  }

  return Migration;
}

function isCreateCollection(
  op: MigrationOperation,
): op is CreateCollectionOperation {
  return op.type === MigrationType.CreateCollection;
}

function isCreateIndex(op: MigrationOperation): op is CreateIndexOperation {
  return op.type === MigrationType.CreateIndex;
}

function isDropIndex(op: MigrationOperation): op is DropIndexOperation {
  return op.type === MigrationType.DropIndex;
}

function isCustom(op: MigrationOperation): op is CustomOperation {
  return op.type === MigrationType.Custom;
}
