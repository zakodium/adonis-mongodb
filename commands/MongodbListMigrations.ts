import { inject } from '@adonisjs/core/build/standalone';
import CliTable from 'cli-table3';

import { DatabaseContract } from '@ioc:Zakodium/Mongodb/Database';

import MigrationCommand from './util/MigrationCommand';

export default class MongodbListMigrations extends MigrationCommand {
  public static commandName = 'mongodb:migration:status';
  public static description = 'Show pending migrations';
  public static settings = {
    loadApp: true,
  };

  @inject(['Zakodium/Mongodb/Database'])
  public async run(db: DatabaseContract): Promise<void> {
    try {
      const connection = await this.getConnection(db);
      const database = await connection.database();
      const coll = database.collection('__adonis_mongodb');
      const migrations = await this.getMigrations(connection.config);

      const migrationDocuments = await coll.find({}).toArray();

      const table = new CliTable({
        head: ['Name', 'Status', 'Batch', 'Message'],
      });

      const imports = await Promise.all(
        migrations.map(({ file }) => this.importMigration(file)),
      );

      /**
       * Push a new row to the table
       */
      for (const [idx, { name, file }] of migrations.entries()) {
        const document = migrationDocuments.find((doc) => doc.name === name);

        const { description } = imports[idx];
        table.push([
          file,
          document
            ? this.colors.green('completed')
            : this.colors.yellow('pending'),
          document ? document.batch : 'NA',
          description || '',
        ]);
      }

      // eslint-disable-next-line no-console
      console.log(table.toString());
    } finally {
      await db.manager.closeAll();
    }
  }
}
