import { inject } from '@adonisjs/core/build/standalone';
import { ObjectId } from 'mongodb';

import { Mongodb } from '../src/Mongodb';

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

  private async _executeMigration(db: Mongodb): Promise<void> {
    const migrations = await this.getMigrations(db.connection().config);

    const connectionName = this.connection || undefined;
    const connection = db.connection(connectionName);

    await connection.transaction(async (session) => {
      const migrationLockColl = await connection.collection(
        migrationLockCollectionName,
      );

      const migrationColl = await connection.collection<IMigration>(
        migrationCollectionName,
      );

      const lock = await migrationLockColl.updateOne(
        {
          _id: 'migration_lock',
          running: false,
        },
        {
          $set: { running: true },
        },
        {
          upsert: true,
        },
      );

      if (lock.matchedCount === 0 && lock.upsertedCount === 0) {
        this.logger.error('A migration is already running');
        process.exitCode = 1;
        await db.closeConnections();
        return;
      }

      try {
        let migrationDocsCursor = migrationColl.find({});
        const migrationDocs = await migrationDocsCursor.toArray();
        const dbMigrationNames = migrationDocs.map((m) => m.name);

        // Keep migrations that are not yet registered
        const unregisteredMigrations = migrations.filter(
          (migration) => !dbMigrationNames.includes(migration.name),
        );

        // Keep migrations that are not yet registered
        let executed = 0;

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

        for (const { name, file } of unregisteredMigrations) {
          const { Migration, description } = await this.importMigration(file);

          this.logger.info(
            `Executing migration: ${name}${
              description ? ` - ${description}` : ''
            }`,
          );
          const migration = new Migration(connectionName, this.logger, session);
          await migration.execUp();
          executed++;
        }

        if (unregisteredMigrations.length > 0) {
          await migrationColl.insertMany(
            unregisteredMigrations.map(
              ({ name }) => ({
                name,
                date: new Date(),
                batch: newBatch,
              }),
              {
                session,
              },
            ),
          );
        }

        if (executed > 0) {
          this.logger.info(`Executed ${executed} migrations`);
        } else {
          this.logger.info('No pending migration');
        }
      } finally {
        await migrationLockColl.updateOne(
          {
            _id: 'migration_lock',
            running: true,
          },
          {
            $set: { running: false },
          },
        );
      }
    });
  }

  @inject(['Mongodb/Database'])
  public async run(db: Mongodb): Promise<void> {
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
