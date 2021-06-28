declare module '@ioc:Adonis/Core/Application' {
  import { DatabaseContract } from '@ioc:Zakodium/Mongodb/Database';
  import Migration from '@ioc:Zakodium/Mongodb/Migration';
  import * as Model from '@ioc:Zakodium/Mongodb/Model';
  import ObjectId from '@ioc:Zakodium/Mongodb/ObjectId';

  export interface ContainerBindings {
    'Zakodium/Mongodb/Database': DatabaseContract;
    'Zakodium/Mongodb/Model': typeof Model;
    'Zakodium/Mongodb/Migration': typeof Migration;
    'Zakodium/Mongodb/ObjectId': typeof ObjectId;
  }
}
