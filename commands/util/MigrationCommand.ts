import fs from 'fs/promises';
import { join, basename, extname } from 'path';

import { BaseCommand, flags } from '@adonisjs/ace';
import { Logger } from '@poppinss/fancy-logs';
import { ClientSession } from 'mongodb';

import { MongodbConnectionConfig } from '@ioc:Mongodb/Database';
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

  protected async getMigrationFiles(
    config: MongodbConnectionConfig,
  ): Promise<string[]> {
    const folders =
      config.migrations && config.migrations.length > 0
        ? config.migrations
        : [folder];

    const rawMigrationFiles = await Promise.all(
      folders
        .map((folder) => join(this.application.appRoot, folder))
        .map(async (migrationsPath) => {
          try {
            const files = await fs.readdir(migrationsPath);
            return files
              .filter((file) => extname(file) === '.js')
              .map((file) => join(migrationsPath, file));
          } catch {
            return [];
          }
        }),
    );

    const migrationFiles = rawMigrationFiles
      .flat()
      .sort((a, b) => basename(a, '.js').localeCompare(basename(b, '.js')));

    // Check migration file names
    let hadBadName = false;
    migrationFiles
      .map((migrationFile) => basename(migrationFile, '.js'))
      .forEach((migrationFile) => {
        const match = matchTimestamp.exec(migrationFile);
        const timestamp = Number(match?.groups?.timestamp);
        if (Number.isNaN(timestamp) || timestamp === 0) {
          hadBadName = true;
          this.logger.error(
            `Invalid migration file: ${migrationFile}. Name must start with a timestamp`,
          );
        }
      });

    if (hadBadName) {
      throw new Error('some migration files are malformed');
    }

    return migrationFiles;
  }

  protected async importMigration(
    name: string,
  ): Promise<{ Migration: MigrationModule['default']; description?: string }> {
    const module: MigrationModule = await import(name);
    const { default: Migration, description } = module;
    if (!Migration || typeof Migration !== 'function') {
      throw new Error(`Migration in ${name} must export a default class`);
    }
    return { Migration, description };
  }
}
