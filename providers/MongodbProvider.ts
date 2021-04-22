import { ObjectId } from 'mongodb';

import { ApplicationContract } from '@ioc:Adonis/Core/Application';

import { getMongodbModelAuthProvider } from '../src/Auth/MongodbModelAuthProvider';
import createMigration from '../src/Migration';
import { Model, AutoIncrementModel } from '../src/Model/Model';
import { Mongodb } from '../src/Mongodb';

export default class MongodbProvider {
  public static needsApplication = true;

  public constructor(protected app: ApplicationContract) {}

  public register(): void {
    this.app.container.singleton('Mongodb/Database', () => {
      return new Mongodb(this.app.config.get('mongodb', {}), this.app.logger);
    });
    this.app.container.singleton('Mongodb/Model', () => {
      Model.$setDatabase(this.app.container.use('Mongodb/Database'));
      AutoIncrementModel.$setDatabase(
        this.app.container.use('Mongodb/Database'),
      );

      return { Model, AutoIncrementModel };
    });

    this.app.container.singleton('Mongodb/Migration', () => {
      return createMigration(this.app.container.use('Mongodb/Database'));
    });
    this.app.container.bind('Mongodb/ObjectId', () => ObjectId);
  }

  public boot(): void {
    if (this.app.container.hasBinding('Adonis/Addons/Auth')) {
      const Auth = this.app.container.use('Adonis/Addons/Auth');
      Auth.extend('provider', 'mongodb-model', getMongodbModelAuthProvider);
    }
  }

  public async shutdown(): Promise<void> {
    const Database = this.app.container.use('Mongodb/Database');
    return Database.closeConnections();
  }

  public ready(): void {
    // App is ready
  }
}
