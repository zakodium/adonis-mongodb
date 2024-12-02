import type {
  ComputedDecorator,
  ComputedOptions,
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

/**
 * Define computed property on a model. The decorator needs a
 * proper model class inheriting the base model
 */
export const computed: ComputedDecorator = (options?: ComputedOptions) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return function decorateAsComputed(target: any, property: string) {
    const Model = target.constructor as MongodbModel<unknown>;

    Model.boot();
    Model.$addComputed(property, options ?? {});
  };
};
