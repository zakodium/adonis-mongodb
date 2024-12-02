declare module '@ioc:Adonis/Core/Application' {
  import type { DatabaseContract } from '@ioc:Zakodium/Mongodb/Database';
  import type Migration from '@ioc:Zakodium/Mongodb/Migration';
  import type * as Odm from '@ioc:Zakodium/Mongodb/Odm';

  export interface ContainerBindings {
    /* eslint-disable @typescript-eslint/naming-convention */
    'Zakodium/Mongodb/Database': DatabaseContract;
    'Zakodium/Mongodb/Odm': typeof Odm;
    'Zakodium/Mongodb/Migration': typeof Migration;
    /* eslint-enable @typescript-eslint/naming-convention */
  }
}
