import { IndexOptions } from 'mongodb';
import { Logger } from '@poppinss/fancy-logs';
import { ConnectionContract } from '@ioc:Mongodb/Database';

import { Mongodb } from './Mongodb';

enum MigrationType {
  CreateCollection,
  CreateIndex,
}

interface CreateCollectionOperation {
  type: MigrationType.CreateCollection;
  name: string;
}

interface CreateIndexOperation {
  type: MigrationType.CreateIndex;
  name: string;
  index: string | object;
  options?: IndexOptions;
}

type MigrationOperation = CreateCollectionOperation | CreateIndexOperation;

export default function createMigration(Database: Mongodb): any {
  abstract class Migration {
    private $operations: MigrationOperation[] = [];
    private $connection: ConnectionContract;
    private $logger: Logger;

    public constructor(connection: string | undefined, logger: Logger) {
      this.$connection = Database.connection(connection);
      this.$logger = logger;
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
      index: string | object,
      options?: IndexOptions,
    ): void {
      this.$operations.push({
        type: MigrationType.CreateIndex,
        name: collectionName,
        index,
        options,
      });
    }

    public async execUp(): Promise<void> {
      this.up();
      await this._createCollections();
      await this._createIndexes();
    }

    private async _createCollections(): Promise<void> {
      const db = await this.$connection.database();
      for (const op of this.$operations.filter(isCreateCollection)) {
        this.$logger.info(`Creating collection ${op.name}`);
        await db.createCollection(op.name);
      }
    }

    private async _createIndexes(): Promise<void> {
      const db = await this.$connection.database();
      for (const op of this.$operations.filter(isCreateIndex)) {
        this.$logger.info(`Creating index on ${op.name}`);
        await db.createIndex(op.name, op.index, op.options);
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
