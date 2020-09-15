import fs from 'fs/promises';
import { join, basename } from 'path';

import { BaseCommand, flags } from '@adonisjs/ace';
import { Logger } from '@poppinss/fancy-logs';
import { ClientSession } from 'mongodb';

import BaseMigration from '@ioc:Mongodb/Migration';
import { MongodbConfig, MongodbConnectionConfig } from '@ioc:Mongodb/Database';

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
        ? [folder, ...config.migrations]
        : [folder];

    const migrationFiles: string[] = (
      await Promise.all(
        folders
          .map((folder) => join(this.application.appRoot, folder))
          .map(async (migrationsPath) => {
            try {
              const files = await fs.readdir(migrationsPath);
              return files.map((file) => join(migrationsPath, file));
            } catch {
              return null;
            }
          }),
      )
    )
      .filter((migrationFile) => migrationFile !== null)
      .flat() as string[];

    let migrationNames = migrationFiles.sort((a, b) =>
      basename(a, '.js').localeCompare(basename(b, '.js')),
    );

    // Check migration file names
    let hadBadName = false;
    migrationNames
      .map((migrationName) => basename(migrationName, '.js'))
      .forEach((migrationName) => {
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
    const filePath = name;
    const module: MigrationModule = await import(filePath);
    const { default: Migration, description } = module;
    if (!Migration || typeof Migration !== 'function') {
      throw new Error(`Migration in ${name} must export a default class`);
    }
    return { Migration, description };
  }
}
