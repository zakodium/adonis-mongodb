import { inject } from '@adonisjs/core/build/standalone';
import { ObjectId } from 'mongodb';

import { DatabaseContract } from '@ioc:Zakodium/Mongodb/Database';
import Migration from '@ioc:Zakodium/Mongodb/Migration';

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

interface MigrationLock {
  _id: string;
  running: boolean;
}

export default class MongodbMigrate extends MigrationCommand {
  public static commandName = 'mongodb:migration:run';
  public static description = 'Execute pending migrations';
  public static settings = {
    loadApp: true,
  };

  private async _executeMigration(db: DatabaseContract): Promise<void> {
    const connection = await this.getConnection(db);
    const migrations = await this.getMigrations(connection.config);

    const migrationLockColl = await connection.collection<MigrationLock>(
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
      this.exitCode = 1;
      return;
    }

    const migrationDocs = await migrationColl.find({}).toArray();
    const dbMigrationNames = new Set(migrationDocs.map((m) => m.name));

    // Keep migrations that are not yet registered
    const unregisteredMigrations = migrations.filter(
      (migration) => !dbMigrationNames.has(migration.name),
    );

    // Keep migrations that are not yet registered
    let successfullyExecuted = 0;

    // Get the next incremental batch value
    const value = await migrationColl
      .find({})
      .sort({ batch: -1 })
      .project<{ batch: number }>({ batch: 1 })
      .limit(1)
      .toArray();

    let newBatch = 1;
    if (value.length === 1) {
      newBatch = value[0].batch + 1;
    }

    let lastMigrationError = null;
    for (const { name, file } of unregisteredMigrations) {
      let migration: Migration;
      try {
        const { Migration: MigrationConstructor, description } =
          await this.importMigration(file);
        this.logger.info(
          `Executing migration: ${name}${
            description ? ` - ${description}` : ''
          }`,
        );
        migration = new MigrationConstructor(connection.name, this.logger);
      } catch (error) {
        lastMigrationError = error;
        break;
      }

      // eslint-disable-next-line @typescript-eslint/no-loop-func
      await connection.transaction(async (session) => {
        try {
          await migration.execUp(session);

          await migrationColl.insertOne(
            {
              _id: new ObjectId(),
              name,
              date: new Date(),
              batch: newBatch,
            },
            { session },
          );
        } catch (error) {
          lastMigrationError = error;
          await session.abortTransaction();
        }
      });

      if (lastMigrationError) {
        break;
      }

      if (migration.afterUpSuccess) {
        try {
          await migration.afterUpSuccess();
        } catch (error) {
          this.logger.warning(`Migration's afterUpSuccess call failed`);
          // TODO: See if there can be a way in Ace commands to print error stack traces
          // eslint-disable-next-line no-console
          console.warn(error);
        }
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
          lastMigrationError ? `, 1 migration failed` : ''
        }${
          remainingMigrations > 0
            ? `, ${
                remainingMigrations - (lastMigrationError ? 1 : 0)
              } pending migrations remaining`
            : ''
        }`,
      );
    } else if (lastMigrationError === null) {
      this.logger.info('No pending migration');
    }

    if (lastMigrationError) {
      this.logger.error('Migration failed');
      // TODO: See if there can be a way in Ace commands to print error stack traces
      // eslint-disable-next-line no-console
      console.error(lastMigrationError);
      this.exitCode = 1;
    }
  }

  @inject(['Zakodium/Mongodb/Database'])
  public async run(db: DatabaseContract): Promise<void> {
    try {
      await this._executeMigration(db);
    } finally {
      await db.manager.closeAll();
    }
  }
}
