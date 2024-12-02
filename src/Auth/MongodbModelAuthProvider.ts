import { esmResolver } from '@poppinss/utils';
import { ObjectId } from 'mongodb';

import type {
  AuthManagerContract,
  ProviderUserContract,
  UserProviderContract,
} from '@ioc:Adonis/Addons/Auth';
import type { HashDriverContract } from '@ioc:Adonis/Core/Hash';
import type {
  MongodbDocument,
  MongodbModel,
  MongodbModelAuthProviderConfig,
} from '@ioc:Zakodium/Mongodb/Odm';

class MongodbModelAuthProviderUser
  implements ProviderUserContract<MongodbDocument<unknown>>
{
  public constructor(
    // `this.user` can be any Model, so we use `any` to avoid indexing issues later.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public user: any,
    private identifierKey: string,
    private identifierKeyType: 'objectid' | 'string' | 'number',
    private hash: HashDriverContract,
  ) {}

  public getId(): string | number | null {
    if (this.user === null) return null;
    const value = this.user[this.identifierKey];
    if (this.identifierKeyType === 'objectid') {
      return value.toString();
    }
    return value;
  }

  public verifyPassword(plainPassword: string): Promise<boolean> {
    if (this.user === null) {
      throw new Error('Cannot "verifyPassword for non-existing user');
    }
    if (!this.user.password) {
      throw new Error(
        'Auth user object must have a password in order to call "verifyPassword"',
      );
    }

    return this.hash.verify(this.user.password, plainPassword);
  }

  public getRememberMeToken(): string | null {
    return null;
  }
  public setRememberMeToken(): void {
    throw new Error('unimplemented setRememberMeToken');
  }
}

class MongodbModelAuthUserProvider
  implements UserProviderContract<MongodbDocument<unknown>>
{
  private uids = ['email'];
  private identifierKey = '_id';
  private identifierKeyType: 'objectid' | 'string' | 'number' = 'objectid';
  private hash: HashDriverContract;

  public constructor(
    private auth: AuthManagerContract,
    private config: MongodbModelAuthProviderConfig<MongodbModel<unknown>>,
  ) {
    if (config.uids) {
      if (config.uids.length === 0) {
        throw new Error('config.uids must have at least one element');
      }
      this.uids = config.uids as string[];
    }

    if (config.identifierKey) {
      this.identifierKey = config.identifierKey as string;
    }

    if (config.identifierKeyType) {
      this.identifierKeyType = config.identifierKeyType;
    }

    const Hash =
      this.auth.application.container.resolveBinding('Adonis/Core/Hash');
    this.hash = config.hashDriver ? Hash.use(config.hashDriver) : Hash;
  }

  private async getModel(): Promise<MongodbModel<unknown>> {
    if (this.config.model) {
      return esmResolver(await this.config.model());
    } else {
      return esmResolver(
        await this.auth.application.container.useAsync('App/Models/User'),
      );
    }
  }

  public async getUserFor(
    user: MongodbDocument<unknown>,
  ): Promise<MongodbModelAuthProviderUser> {
    return new MongodbModelAuthProviderUser(
      user,
      this.identifierKey,
      this.identifierKeyType,
      this.hash,
    );
  }

  public async findById(
    id: string | number,
  ): Promise<MongodbModelAuthProviderUser> {
    const Model = await this.getModel();
    const user = await Model.findByOrFail(
      this.identifierKey,
      this.identifierKeyType === 'objectid' ? new ObjectId(id) : id,
    );
    return new MongodbModelAuthProviderUser(
      user,
      this.identifierKey,
      this.identifierKeyType,
      this.hash,
    );
  }

  public async findByUid(
    uid: string | number,
  ): Promise<MongodbModelAuthProviderUser> {
    const Model = await this.getModel();
    const $or = this.uids.map((uidKey) => ({ [uidKey]: uid }));
    const user = await Model.query({ $or }).first();
    return new MongodbModelAuthProviderUser(
      user,
      this.identifierKey,
      this.identifierKeyType,
      this.hash,
    );
  }

  public async findByRememberMeToken(/* userId: string | number, token: string */): Promise<MongodbModelAuthProviderUser> {
    throw new Error('unimplemented findByRememberMeToken');
    // return new MongodbModelAuthProviderUser(null);
  }

  public updateRememberMeToken(/* authenticatable: MongodbModelAuthProviderUser */): Promise<void> {
    throw new Error('unimplemented updateRememberMeToken');
  }
}

export function getMongodbModelAuthProvider(
  auth: AuthManagerContract,
  _mapping: string,
  config: MongodbModelAuthProviderConfig<MongodbModel<unknown>>,
) {
  return new MongodbModelAuthUserProvider(auth, config);
}
