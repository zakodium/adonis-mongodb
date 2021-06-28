import { readdir } from 'fs/promises';
import { join, extname } from 'path';

import { BaseCommand, flags } from '@adonisjs/core/build/standalone';
import { Logger } from '@poppinss/cliui/build/src/Logger';
import { ClientSession } from 'mongodb';

import type { MongodbConnectionConfig } from '@ioc:Zakodium/Mongodb/Database';
import type BaseMigration from '@ioc:Zakodium/Mongodb/Migration';

import transformMigrations, {
  MigrationDescription,
} from './transformMigrations';

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

export default abstract class MigrationCommand extends BaseCommand {
  public static settings = {
    loadApp: true,
  };

  public static commandName = 'commandName';
  public static description = 'description';

  @flags.string({ description: 'Database connection to use for the migration' })
  public connection: string;

  protected async getMigrations(
    config: MongodbConnectionConfig,
  ): Promise<MigrationDescription[]> {
    const folders =
      config.migrations && config.migrations.length > 0
        ? config.migrations
        : [folder];

    const rawMigrationFiles = await Promise.all(
      folders
        .map((folder) => join(this.application.appRoot, folder))
        .map(async (migrationsPath) => {
          try {
            const files = await readdir(migrationsPath);
            return files
              .filter(
                (file) => extname(file) === '.js' || extname(file) === '.ts',
              )
              .map((file) => join(migrationsPath, file));
          } catch {
            return [];
          }
        }),
    );

    return transformMigrations(rawMigrationFiles, this.logger);
  }

  protected async importMigration(
    file: string,
  ): Promise<{ Migration: MigrationModule['default']; description?: string }> {
    const module: MigrationModule = await import(file);
    const { default: Migration, description } = module;
    if (!Migration || typeof Migration !== 'function') {
      throw new Error(`Migration in ${file} must export a default class`);
    }
    return { Migration, description };
  }
}
