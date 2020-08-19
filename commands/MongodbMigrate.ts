import { promises as fs } from 'fs';
import { join } from 'path';

import { BaseCommand, flags } from '@adonisjs/ace';
import { inject } from '@adonisjs/fold';
import { Logger } from '@poppinss/fancy-logs';

import { MongodbContract } from '@ioc:Mongodb/Database';
import BaseMigration from '@ioc:Mongodb/Migration';

const matchTimestamp = /^(?<timestamp>\d+)_.*$/;

interface MigrationModule {
  default: new (
    connection: string | undefined,
    logger: Logger,
  ) => BaseMigration;
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
    const migrationNames = (await fs.readdir(migrationsPath)).sort((a, b) =>
      a.localeCompare(b),
    );

    let hadBadName = false;
    migrationNames.forEach((migration) => {
      if (!migration.match(matchTimestamp)) {
        this.logger.error(
          `Invalid migration file: ${migration}. Name must start with a timestamp.`,
        );
        hadBadName = true;
      }
    });
    if (hadBadName) {
      process.exitCode = 1;
      return;
    }

    const connectionName = this.connection || undefined;
    const connection = db.connection(connectionName);

    const migrationColl = await connection.collection('__adonis_mongodb');

    const lock = await migrationColl.updateOne(
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
      let migrationDoc = await migrationColl.findOne({
        _id: 'migration_last',
      });

      if (!migrationDoc) {
        migrationDoc = {
          _id: 'migration_last',
          last: 0,
          date: new Date(),
        };
        await migrationColl.insertOne(migrationDoc);
      }

      let executed = 0;

      for (const migrationName of migrationNames) {
        const match = matchTimestamp.exec(migrationName);
        const timestamp = Number(match?.groups?.timestamp);
        if (Number.isNaN(timestamp) || timestamp === 0) {
          throw new Error('unexpected: no timestamp in migration filename');
        }

        if (timestamp <= migrationDoc.last) {
          continue;
        }

        const filePath = join(migrationsPath, migrationName);
        const module: MigrationModule = await import(filePath);
        const { default: Migration } = module;
        if (!Migration || typeof Migration !== 'function') {
          this.logger.error(
            `Migration in ${migrationName} must export a default class`,
          );
          process.exitCode = 1;
          return;
        }
        this.logger.info(`Executing migration: ${migrationName}`);
        const migration = new Migration(connectionName, this.logger);
        await migration.execUp();

        await migrationColl.updateOne(
          {
            _id: 'migration_last',
          },
          {
            $set: {
              last: timestamp,
              date: new Date(),
            },
          },
        );

        executed++;
      }

      if (executed > 0) {
        this.logger.info(`Executed ${executed} migrations`);
      } else {
        this.logger.info('No pending migration');
      }
    } finally {
      await migrationColl.updateOne(
        {
          _id: 'migration_lock',
          running: true,
        },
        {
          $set: { running: false },
        },
      );
    }
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

    await this._executeMigration(db);
    await db.closeConnections();
  }
}
