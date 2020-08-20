import CliTable from 'cli-table3';

import MigrationCommand from './util/MigrationCommand';

export default class MongodbListMigrations extends MigrationCommand {
  public static commandName = 'mongodb:migration:status';
  public static description = 'Show pending migrations';
  public static settings = {
    loadApp: true,
  };

  public async handle(): Promise<void> {
    const migrationNames = await this.getMigrationFiles();

    const table = new CliTable({
      head: ['Name', 'Status', 'Batch', 'Message'],
    });

    /**
     * Push a new row to the table
     */
    migrationNames.forEach((migrationName) => {
      table.push([
        migrationName,
        this.colors.yellow('pending'),
        'NA',
        '',
      ] as any);
    });

    // eslint-disable-next-line no-console
    console.log(table.toString());
  }
}
