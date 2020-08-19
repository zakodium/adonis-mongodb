import { Logger } from '@poppinss/fancy-logs';
import { IndexOptions, ClientSession, Db } from 'mongodb';

import { ConnectionContract } from '@ioc:Mongodb/Database';

import { Mongodb } from './Mongodb';

enum MigrationType {
  CreateCollection,
  CreateIndex,
  Custom,
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
  callback: (db: Db, session?: ClientSession) => Promise<void>;
}

type MigrationOperation =
  | CreateCollectionOperation
  | CreateIndexOperation
  | CustomOperation;

export default function createMigration(Database: Mongodb): any {
  abstract class Migration {
    private $operations: MigrationOperation[] = [];
    private $connection: ConnectionContract;
    private $logger: Logger;
    private $session?: ClientSession;

    public constructor(
      connection: string | undefined,
      logger: Logger,
      session?: ClientSession,
    ) {
      this.$connection = Database.connection(connection);
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
      await this._executeDefered();
    }

    private async _createCollections(): Promise<void> {
      const db = await this.$connection.database();
      for (const op of this.$operations.filter(isCreateCollection)) {
        this.$logger.info(`Creating collection ${op.name}`);
        await db.createCollection(op.name);
      }
    }

    private async _executeDefered(): Promise<void> {
      const db = await this.$connection.database();
      for (const op of this.$operations.filter(isCustom)) {
        await op.callback(db, this.$session);
      }
    }

    private async _createIndexes(): Promise<void> {
      const db = await this.$connection.database();
      for (const op of this.$operations.filter(isCreateIndex)) {
        this.$logger.info(`Creating index on ${op.name}`);
        await db.createIndex(op.name, op.index, {
          ...op.options,
          session: this.$session,
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
