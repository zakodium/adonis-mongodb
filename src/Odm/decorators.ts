import {
  FieldDecorator,
  FieldOptions,
  MongodbModel,
} from '@ioc:Zakodium/Mongodb/Odm';

export const field: FieldDecorator = (options?: FieldOptions) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return function decorateField(target: any, property: string) {
    const Model = target.constructor as MongodbModel<unknown>;
    Model.boot();
    Model.$addField(property, options);
  };
};
