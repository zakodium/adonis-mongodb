import { join } from 'path';

import { BaseCommand, args, flags } from '@adonisjs/core/build/standalone';

export default class MongodbMakeMigration extends BaseCommand {
  public static commandName = 'mongodb:make:migration';
  public static description = 'Make a new migration file';
  public static settings = {
    loadApp: true,
  };

  @args.string({ description: 'Name of the migration file' })
  public name: string;

  @flags.string({ description: 'Database connection to use for the migration' })
  public connection: string;

  public async run(): Promise<void> {
    const { name } = this;
    if (name.includes('/')) {
      this.logger.error('name argument should not contain any slash');
      process.exitCode = 1;
      return;
    }

    const folder = 'mongodb/migrations';

    const stub = join(__dirname, '../../templates/migration.txt');

    this.generator
      .addFile(name, { prefix: String(Date.now()), pattern: 'snakecase' })
      .stub(stub)
      .destinationDir(folder)
      .appRoot(this.application.makePathFromCwd())
      .apply({
        className: `${name[0].toUpperCase()}${name.slice(1)}Migration`,
      });
    await this.generator.run();
  }
}
