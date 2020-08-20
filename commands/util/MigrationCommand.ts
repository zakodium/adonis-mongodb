import { join } from 'path';
import fs from 'fs/promises';
import { BaseCommand, flags } from '@adonisjs/ace';
import { Logger } from '@poppinss/fancy-logs';
import { ClientSession } from 'mongodb';
import BaseMigration from '@ioc:Mongodb/Migration';

const matchTimestamp = /^(?<timestamp>\d+)_.*$/;
const folder = 'mongodb/migrations';

export const migrationCollectionName = '__adonis_mongodb';
export const migrationLockCollectionName = '__adonis_mongodb_lock';

interface MigrationModule {
  default: new (
    connection: string | undefined,
    logger: Logger,
    session: ClientSession,
  ) => BaseMigration;
  description?: string;
}

export default abstract class MongodbMakeMigration extends BaseCommand {
  public static settings = {
    loadApp: true,
  };

  public static commandName = 'commandName';
  public static description = 'description';

  @flags.string({ description: 'Database connection to use for the migration' })
  public connection: string;

  protected getMigrationFilePath(file: string) {
    return join(this.application.appRoot, folder, file);
  }

  protected async getMigrationFiles(): Promise<string[]> {
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
      throw new Error('some migration files are malformed');
    }
    return migrationNames;
  }

  protected async importMigration(
    name: string,
  ): Promise<{ Migration: MigrationModule['default']; description?: string }> {
    const filePath = this.getMigrationFilePath(name);
    const module: MigrationModule = await import(filePath);
    const { default: Migration, description } = module;
    if (!Migration || typeof Migration !== 'function') {
      throw new Error(`Migration in ${name} must export a default class`);
    }
    return { Migration, description };
  }
}
