import { inject } from '@adonisjs/fold';

import { MongodbContract } from '@ioc:Mongodb/Database';

import MigrationCommand, {
  migrationCollectionName,
  migrationLockCollectionName,
} from './util/MigrationCommand';

export default class MongodbMigrate extends MigrationCommand {
  public static commandName = 'mongodb:migration:run';
  public static description = 'Execute pending migrations';
  public static settings = {
    loadApp: true,
  };

  private async _executeMigration(db: MongodbContract): Promise<void> {
    let migrationFiles = await this.getMigrationFiles();
    const connectionName = this.connection || undefined;
    const connection = db.connection(connectionName);

    await connection.transaction(async (session) => {
      const migrationLockColl = await connection.collection(
        migrationLockCollectionName,
      );

      const migrationColl = await connection.collection(
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
        migrationFiles = migrationFiles.filter(
          (name) => !dbMigrationNames.includes(name),
        );

        let executed = 0;

        // Get the next incremental batch value
        const value = await migrationColl
          .aggregate([
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

        for (const migrationName of migrationFiles) {
          const { Migration, description } = await this.importMigration(
            migrationName,
          );

          this.logger.info(
            `Executing migration: ${migrationName}${
              description ? ` - ${description}` : ''
            }`,
          );
          if (description) {
            this.logger.info(description);
          }
          const migration = new Migration(connectionName, this.logger, session);
          await migration.execUp();
          executed++;
        }

        if (migrationFiles.length > 0) {
          await migrationColl.insertMany(
            migrationFiles.map(
              (migrationName) => ({
                name: migrationName,
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
        // session.endSession();
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
  public async handle(db: MongodbContract): Promise<void> {
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
