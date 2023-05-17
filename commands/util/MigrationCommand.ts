import { readdir } from 'node:fs/promises';
import path from 'node:path';

import { BaseCommand, flags } from '@adonisjs/core/build/standalone';
import { Logger } from '@poppinss/cliui/build/src/Logger';

import type {
  ConnectionContract,
  DatabaseContract,
  MongodbConnectionConfig,
} from '@ioc:Zakodium/Mongodb/Database';
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

  protected async getConnection(
    db: DatabaseContract,
  ): Promise<ConnectionContract> {
    if (this.connection && !db.manager.has(this.connection)) {
      this.logger.error(
        `No MongoDB connection registered with name "${this.connection}"`,
      );
      this.exitCode = 1;
      await this.exit();
    }
    return db.connection(this.connection);
  }

  protected async getMigrations(
    config: MongodbConnectionConfig,
  ): Promise<MigrationDescription[]> {
    const folders =
      config.migrations && config.migrations.length > 0
        ? config.migrations
        : [folder];

    const rawMigrationFiles = await Promise.all(
      folders
        .map((folder) => path.join(this.application.appRoot, folder))
        .map(async (migrationsPath) => {
          try {
            const files = await readdir(migrationsPath);
            return files
              .filter((file) => {
                return (
                  // Only include code and exclude type declaration files.
                  /\.[cm]?[jt]s$/.test(file) && !/\.d\.[cm]?ts$/.test(file)
                );
              })
              .map((file) => path.join(migrationsPath, file));
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
