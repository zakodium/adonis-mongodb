import { inject } from '@adonisjs/fold';
import CliTable from 'cli-table3';

import { Mongodb } from '../src/Mongodb';

import MigrationCommand from './util/MigrationCommand';

export default class MongodbListMigrations extends MigrationCommand {
  public static commandName = 'mongodb:migration:status';
  public static description = 'Show pending migrations';
  public static settings = {
    loadApp: true,
  };

  @inject(['Mongodb/Database'])
  public async handle(db: Mongodb): Promise<void> {
    if (this.connection && !db.hasConnection(this.connection)) {
      this.logger.error(
        `No MongoDB connection registered with name "${this.connection}"`,
      );
      process.exitCode = 1;
      return;
    }
    try {
      const database = await db.connection().database();
      const coll = database.collection('__adonis_mongodb');
      const migrationFiles = await this.getMigrationFiles(
        db.connection().config,
      );

      const migrationDocuments = await coll.find({}).toArray();

      const table = new CliTable({
        head: ['Name', 'Status', 'Batch', 'Message'],
      });

      const imports = await Promise.all(
        migrationFiles.map((migrationFile) =>
          this.importMigration(migrationFile),
        ),
      );

      /**
       * Push a new row to the table
       */
      migrationFiles.forEach((migrationFile, idx) => {
        const document = migrationDocuments.find(
          (doc) => doc.name === migrationFile,
        );

        const { description } = imports[idx];
        table.push([
          migrationFile,
          document
            ? this.colors.green('completed')
            : this.colors.yellow('pending'),
          document ? document.batch : 'NA',
          description || '',
        ]);
      });

      // eslint-disable-next-line no-console
      console.log(table.toString());
    } finally {
      await db.closeConnections();
    }
  }
}
