import { ObjectId } from 'mongodb';

import { ApplicationContract } from '@ioc:Adonis/Core/Application';
import {
  BaseModel as BaseModelType,
  BaseAutoIncrementModel as BaseAutoIncrementModelType,
} from '@ioc:Zakodium/Mongodb/Odm';

import { getMongodbModelAuthProvider } from '../src/Auth/MongodbModelAuthProvider';
import { Database } from '../src/Database';
import createMigration from '../src/Migration';
import { BaseModel, BaseAutoIncrementModel } from '../src/Model/Model';
import { field } from '../src/Odm/decorators';

export default class MongodbProvider {
  public constructor(protected app: ApplicationContract) {}

  private registerDatabase(): void {
    this.app.container.singleton('Zakodium/Mongodb/Database', () => {
      const { config, logger } = this.app;
      return new Database(config.get('mongodb', {}), logger);
    });
  }

  public register(): void {
    this.registerDatabase();
    this.app.container.singleton('Zakodium/Mongodb/Odm', () => {
      BaseModel.$setDatabase(
        this.app.container.use('Zakodium/Mongodb/Database'),
      );
      BaseAutoIncrementModel.$setDatabase(
        this.app.container.use('Zakodium/Mongodb/Database'),
      );

      return {
        ObjectId,
        BaseModel: BaseModel as typeof BaseModelType,
        BaseAutoIncrementModel:
          BaseAutoIncrementModel as typeof BaseAutoIncrementModelType,
        field,
      };
    });

    this.app.container.singleton('Zakodium/Mongodb/Migration', () => {
      return createMigration(
        this.app.container.use('Zakodium/Mongodb/Database'),
      );
    });
  }

  public boot(): void {
    if (this.app.container.hasBinding('Adonis/Addons/Auth')) {
      const Auth = this.app.container.use('Adonis/Addons/Auth');
      Auth.extend('provider', 'mongodb-model', getMongodbModelAuthProvider);
    }
  }

  public async shutdown(): Promise<void> {
    const Database = this.app.container.use('Zakodium/Mongodb/Database');
    return Database.manager.closeAll();
  }
}
