import { inject } from '@adonisjs/fold';
import CliTable from 'cli-table3';

import { MongodbContract } from '@ioc:Mongodb/Database';

import MigrationCommand from './util/MigrationCommand';

export default class MongodbListMigrations extends MigrationCommand {
  public static commandName = 'mongodb:migration:status';
  public static description = 'Show pending migrations';
  public static settings = {
    loadApp: true,
  };

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
      const database = await db.connection().database();
      const coll = database.collection('__adonis_mongodb');
      const migrationNames = await this.getMigrationFiles(
        db.connection().$config,
      );

      const migrationDocuments = await coll.find({}).toArray();

      const table = new CliTable({
        head: ['Name', 'Status', 'Batch', 'Message'],
      });

      const imports = await Promise.all(
        migrationNames.map((migrationName) =>
          this.importMigration(migrationName),
        ),
      );

      /**
       * Push a new row to the table
       */
      migrationNames.forEach((migrationName, idx) => {
        const document = migrationDocuments.find(
          (doc) => doc.name === migrationName,
        );

        const { description } = imports[idx];
        table.push([
          migrationName,
          document
            ? this.colors.green('completed')
            : this.colors.yellow('pending'),
          document ? document.batch : 'NA',
          description || '',
        ] as any);
      });

      // eslint-disable-next-line no-console
      console.log(table.toString());
    } finally {
      void db.closeConnections();
    }
  }
}
