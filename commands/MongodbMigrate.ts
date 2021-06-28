import { inject } from '@adonisjs/core/build/standalone';
import { ObjectId } from 'mongodb';

import { Database } from '../src/Database';

import MigrationCommand, {
  migrationCollectionName,
  migrationLockCollectionName,
} from './util/MigrationCommand';

interface IMigration {
  _id: ObjectId | undefined;
  name: string;
  date: Date;
  batch: number;
}

export default class MongodbMigrate extends MigrationCommand {
  public static commandName = 'mongodb:migration:run';
  public static description = 'Execute pending migrations';
  public static settings = {
    loadApp: true,
  };

  private async _executeMigration(db: Database): Promise<void> {
    const migrations = await this.getMigrations(db.connection().config);

    const connectionName = this.connection || undefined;
    const connection = db.connection(connectionName);

    const migrationLockColl = await connection.collection(
      migrationLockCollectionName,
    );

    const migrationColl = await connection.collection<IMigration>(
      migrationCollectionName,
    );

    const lock = await migrationLockColl.updateOne(
      {
        _id: 'migration_lock',
      },
      {
        $set: { running: true },
      },
      {
        upsert: true,
      },
    );

    if (lock.modifiedCount === 0 && lock.upsertedCount === 0) {
      this.logger.error('A migration is already running');
      process.exitCode = 1;
      await db.closeConnections();
      return;
    }

    let migrationDocsCursor = migrationColl.find({});
    const migrationDocs = await migrationDocsCursor.toArray();
    const dbMigrationNames = migrationDocs.map((m) => m.name);

    // Keep migrations that are not yet registered
    const unregisteredMigrations = migrations.filter(
      (migration) => !dbMigrationNames.includes(migration.name),
    );

    // Keep migrations that are not yet registered
    let successfullyExecuted = 0;

    // Get the next incremental batch value
    const value = await migrationColl
      .aggregate<{ maxBatch: number }>([
        {
          $project: {
            maxBatch: { $max: '$batch' },
          },
        },
      ])
      .toArray();

    let newBatch = 1;
    if (value.length === 1) {
      newBatch = value[0].maxBatch + 1;
    }

    let lastTransactionError = null;
    for (const { name, file } of unregisteredMigrations) {
      // eslint-disable-next-line @typescript-eslint/no-loop-func
      await connection.transaction(async (session) => {
        try {
          const { Migration, description } = await this.importMigration(file);

          this.logger.info(
            `Executing migration: ${name}${
              description ? ` - ${description}` : ''
            }`,
          );
          const migration = new Migration(connectionName, this.logger, session);
          await migration.execUp();

          await migrationColl.insertOne(
            {
              name,
              date: new Date(),
              batch: newBatch,
            },
            { session },
          );
        } catch (err) {
          lastTransactionError = err;
          await session.abortTransaction();
        }
      });

      if (lastTransactionError) {
        break;
      }

      successfullyExecuted++;
    }

    await migrationLockColl.updateOne(
      {
        _id: 'migration_lock',
        running: true,
      },
      {
        $set: { running: false },
      },
    );

    if (successfullyExecuted > 0) {
      const remainingMigrations =
        unregisteredMigrations.length - successfullyExecuted;
      this.logger.info(
        `Successfully executed ${successfullyExecuted} migrations${
          lastTransactionError ? `, 1 migration failed` : ''
        }${
          remainingMigrations > 0
            ? `, ${
                remainingMigrations - (lastTransactionError ? 1 : 0)
              } pending migrations remaining`
            : ''
        }`,
      );
    } else if (lastTransactionError === null) {
      this.logger.info('No pending migration');
    }

    if (lastTransactionError) {
      this.logger.error('Migration failed');
      // TODO: See if there can be a way in Ace commands to print error stack traces
      // eslint-disable-next-line no-console
      console.error(lastTransactionError);
    }
  }

  @inject(['Zakodium/Mongodb/Database'])
  public async run(db: Database): Promise<void> {
    if (this.connection && !db.hasConnection(this.connection)) {
      this.logger.error(
        `No MongoDB connection registered with name "${this.connection}"`,
      );
      process.exitCode = 1;
      return;
    }

    try {
      await this._executeMigration(db);
    } finally {
      await db.closeConnections();
    }
  }
}
