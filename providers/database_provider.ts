import type { ApplicationService } from '@adonisjs/core/types';

import { Database } from '../src/database/index.js';
import {
  BaseAutoIncrementModel,
  BaseModel,
} from '../src/odm/base_model/index.js';
import type { MongodbConfig } from '../src/types/index.js';

declare module '@adonisjs/core/types' {
  export interface ContainerBindings {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    'zakodium.mongo.db': Database;
  }
}
/**
 * Database service provider
 */
export default class DatabaseServiceProvider {
  constructor(protected app: ApplicationService) {}

  /**
   * Invoked by AdonisJS to register container bindings
   */
  register() {
    this.app.container.singleton(Database, async (resolver) => {
      const config = this.app.config.get<MongodbConfig>('mongodb');
      const logger = await resolver.make('logger');
      return new Database(config, logger);
    });

    this.app.container.alias('zakodium.mongo.db', Database);
  }

  /**
   * Invoked by AdonisJS to extend the framework or pre-configure
   * objects
   */
  async boot() {
    const db = await this.app.container.make('zakodium.mongo.db');
    BaseModel.$setDatabase(db);
    BaseAutoIncrementModel.$setDatabase(db);
  }

  /**
   * Gracefully close connections during shutdown
   */
  async shutdown() {
    const db = await this.app.container.make('zakodium.mongo.db');
    await db.manager.closeAll();
  }
}

//TODO (somewhere): do other stuff from mongo provider
// private registerMigration(): void {
//   this.app.container.singleton('Zakodium/Mongodb/Migration', () => {
//     return createMigration(
//       this.app.container.resolveBinding('Zakodium/Mongodb/Database'),
//     );
//   });
// }
// public boot(): void {
//   if (this.app.container.hasBinding('Adonis/Addons/Auth')) {
//   const Auth = this.app.container.resolveBinding('Adonis/Addons/Auth');
//   Auth.extend('provider', 'mongodb-model', getMongodbModelAuthProvider);
// }
// }
