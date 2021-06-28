import Env from '@ioc:Adonis/Core/Env';
import { MongodbConfig } from '@ioc:Zakodium/Mongodb/Database';

const mongodbConfig: MongodbConfig = {
  connection: Env.get('MONGODB_CONNECTION'),
  connections: {
    mongodb: {
      url: Env.get('MONGODB_URL'),
      database: Env.get('MONGODB_DATABASE'),
    },
  },
};

export default mongodbConfig;
