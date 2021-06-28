import { Logger } from '@poppinss/cliui/build/src/Logger';
import { IndexOptions, ClientSession, Db } from 'mongodb';

import type { ConnectionContract } from '@ioc:Zakodium/Mongodb/Database';

import { Database } from './Database';

enum MigrationType {
  CreateCollection = 'CreateCollection',
  CreateIndex = 'CreateIndex',
  Custom = 'Custom',
}

interface CreateCollectionOperation {
  type: MigrationType.CreateCollection;
  name: string;
}

interface CreateIndexOperation {
  type: MigrationType.CreateIndex;
  name: string;
  index: string | Record<string, unknown>;
  options?: IndexOptions;
}

interface CustomOperation {
  type: MigrationType.Custom;
  callback: (db: Db, session: ClientSession) => Promise<void>;
}

type MigrationOperation =
  | CreateCollectionOperation
  | CreateIndexOperation
  | CustomOperation;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function createMigration(Database: Database): any {
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
      this.$connection = Database.manager.get(
        connection || Database.primaryConnectionName,
      ).connection;
      this.$logger = logger;
      this.$session = session;
    }

    public createCollections(collectionNames: string[]): void {
      collectionNames.forEach((collectionName) =>
        this.createCollection(collectionName),
      );
    }

    public createCollection(collectionName: string): void {
      this.$operations.push({
        type: MigrationType.CreateCollection,
        name: collectionName,
      });
    }

    public createIndex(
      collectionName: string,
      index: string | Record<string, unknown>,
      options?: IndexOptions,
    ): void {
      this.$operations.push({
        type: MigrationType.CreateIndex,
        name: collectionName,
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
      await this._createIndexes();
      await this._executeDeferred();
    }

    private async _listCollections() {
      if (this.$collectionList) return this.$collectionList;
      const db = await this.$connection.database();
      const cursor = db.listCollections(undefined, {
        nameOnly: true,
      });
      const list = await cursor.toArray();
      this.$collectionList = list.map((element) => element.name);
      return this.$collectionList;
    }

    private async _createCollections(): Promise<void> {
      const db = await this.$connection.database();
      for (const op of this.$operations.filter(isCreateCollection)) {
        this.$logger.info(`Creating collection ${op.name}`);
        await db.createCollection(op.name, { session: this.$session });
      }
    }

    private async _executeDeferred(): Promise<void> {
      const db = await this.$connection.database();
      for (const op of this.$operations.filter(isCustom)) {
        await op.callback(db, this.$session);
      }
    }

    private async _createIndexes(): Promise<void> {
      const db = await this.$connection.database();
      const collections = await this._listCollections();
      for (const op of this.$operations.filter(isCreateIndex)) {
        this.$logger.info(`Creating index on ${op.name}`);
        await db.createIndex(op.name, op.index, {
          ...op.options,
          // index creation will fail if collection pre-exists the transaction
          session: collections.includes(op.name) ? undefined : this.$session,
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

function isCustom(op: MigrationOperation): op is CustomOperation {
  return op.type === MigrationType.Custom;
}
