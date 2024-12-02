/* eslint-disable @typescript-eslint/no-explicit-any */
import type { BaseModel } from './Model';

export const proxyHandler: ProxyHandler<any> = {
  get(target: any, prop: string | symbol, receiver: any) {
    const Model = target.constructor as typeof BaseModel;
    if (Model.$hasComputed(prop as string)) {
      return Reflect.get(target, prop, receiver);
    }

    if (target[prop] !== undefined) {
      return Reflect.get(target, prop, receiver);
    }

    return Reflect.get(target.$attributes, prop, receiver);
  },
  set(target: any, prop: string | symbol, value: any) {
    if (target[prop] !== undefined) {
      return Reflect.set(target, prop, value);
    }
    return Reflect.set(target.$attributes, prop, value);
  },
  ownKeys() {
    throw new Error(
      'Getting model keys is disallowed. If you want to use object spread on the current data, do { ...model.$attributes }',
    );
  },
};
