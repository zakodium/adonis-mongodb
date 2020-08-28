import { IocContract } from '@adonisjs/fold';
import { ObjectId } from 'mongodb';

import createMigration from '../src/Migration';
import { Model, AutoIncrementModel } from '../src/Model/Model';
import { Mongodb } from '../src/Mongodb';

export default class MongodbProvider {
  private $container: IocContract;

  public constructor(container: IocContract) {
    this.$container = container;
  }

  public register(): void {
    this.$container.singleton('Mongodb/Database', () => {
      const config = this.$container
        .use('Adonis/Core/Config')
        .get('mongodb', {});
      const Logger = this.$container.use('Adonis/Core/Logger');
      return new Mongodb(config, Logger);
    });
    this.$container.singleton('Mongodb/Model', () => {
      Model.$setDatabase(this.$container.use('Mongodb/Database'));
      AutoIncrementModel.$setDatabase(this.$container.use('Mongodb/Database'));

      return { Model, AutoIncrementModel };
    });

    this.$container.singleton('Mongodb/Migration', () => {
      return createMigration(this.$container.use('Mongodb/Database'));
    });
    this.$container.bind('Mongodb/ObjectId', () => ObjectId);
  }

  public boot(): void {
    // All bindings are ready, feel free to use them
  }

  public async shutdown(): Promise<void> {
    const Database = this.$container.use('Mongodb/Database');
    return Database.closeConnections();
  }

  public ready(): void {
    // App is ready
  }
}
