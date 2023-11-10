declare module '@ioc:Zakodium/Mongodb/Odm' {
  export type DecoratorFn = (target: unknown, property: unknown) => void;

  export interface FieldOptions {
    // TODO: Enable options.
    /**
     * Database field name
     */
    // fieldName: string;
    /**
     * Null means do not serialize
     */
    // serializeAs: string | null;
    /**
     * Invoked before serializing process happens
     */
    // serialize?: (value: any, attribute: string, model: LucidRow) => any
    /**
     * Invoked before create or update happens
     */
    // prepare?: (value: any, attribute: string, model: LucidRow) => any
    /**
     * Invoked when row is fetched from the database
     */
    // consume?: (value: any, attribute: string, model: LucidRow) => any
  }

  /**
   * Represents a computed property on the model
   */
  export interface ComputedOptions {
    /**
     * if null, will not serialize
     * default to getter name
     */
    serializeAs: string | null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    meta?: any;
  }

  export type FieldDecorator = (options?: FieldOptions) => DecoratorFn;

  export type ComputedDecorator = (
    options?: Partial<ComputedOptions>,
  ) => DecoratorFn;

  export const field: FieldDecorator;
  export const computed: ComputedDecorator;
}
