import { promises as fs } from 'fs';
import { join } from 'path';

import { BaseCommand, flags } from '@adonisjs/ace';
import { inject } from '@adonisjs/fold';
import { Logger } from '@poppinss/fancy-logs';

import { MongodbContract } from '@ioc:Mongodb/Database';
import BaseMigration from '@ioc:Mongodb/Migration';
import { ClientSession } from 'mongodb';

const matchTimestamp = /^(?<timestamp>\d+)_.*$/;

interface MigrationModule {
  default: new (
    connection: string | undefined,
    logger: Logger,
    session: ClientSession,
  ) => BaseMigration;
  description?: string;
}

export default class MongodbMigrate extends BaseCommand {
  public static commandName = 'mongodb:migrate';
  public static description = 'Execute pending migrations';
  public static settings = {
    loadApp: true,
  };

  @flags.string({ description: 'Database connection to migrate' })
  public connection: string;

  private async _executeMigration(db: MongodbContract): Promise<void> {
    const folder = 'mongodb/migrations';
    const migrationsPath = join(this.application.appRoot, folder);
    let migrationNames = (await fs.readdir(migrationsPath)).sort((a, b) =>
      a.localeCompare(b),
    );

    // Check migration file names
    let hadBadName = false;
    migrationNames.forEach((migrationName) => {
      const match = matchTimestamp.exec(migrationName);
      const timestamp = Number(match?.groups?.timestamp);
      if (Number.isNaN(timestamp) || timestamp === 0) {
        hadBadName = true;
        this.logger.error(
          `Invalid migration file: ${migrationName}. Name must start with a timestamp`,
        );
      }
    });

    if (hadBadName) {
      process.exitCode = 1;
      return;
    }

    const connectionName = this.connection || undefined;
    const connection = db.connection(connectionName);

    await connection.transaction(async (session) => {
      const migrationColl = await connection.collection('__adonis_mongodb');
      const migrationLockColl = await connection.collection(
        '__adonis_mongdb_lock',
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

        migrationNames = migrationNames.filter(
          (name) => !dbMigrationNames.includes(name),
        );

        let executed = 0;

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

        for (const migrationName of migrationNames) {
          const filePath = join(migrationsPath, migrationName);
          const module: MigrationModule = await import(filePath);
          const { default: Migration, description } = module;
          if (!Migration || typeof Migration !== 'function') {
            this.logger.error(
              `Migration in ${migrationName} must export a default class`,
            );
            process.exitCode = 1;
            return;
          }
          this.logger.info(
            `Executing migration: ${migrationName}${
              description ? ` - ${description}` : ''
            }`,
          );
          const migration = new Migration(connectionName, this.logger, session);
          await migration.execUp();
          executed++;
        }

        if (migrationNames.length > 0) {
          await migrationColl.insertMany(
            migrationNames.map(
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
