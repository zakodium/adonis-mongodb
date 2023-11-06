/* eslint-disable @typescript-eslint/no-explicit-any */

export const proxyHandler: ProxyHandler<any> = {
  get(target: any, prop: string | symbol, receiver: any) {
    if (target[prop] !== undefined) {
      return Reflect.get(target, prop, receiver);
    }
    return Reflect.get(target.$attributes, prop, receiver);
  },
  set(target: any, prop: string | symbol, value: any, receiver: any) {
    if (target[prop] !== undefined) {
      return Reflect.set(target, prop, value, receiver);
    }
    return Reflect.set(target.$attributes, prop, value, receiver);
  },
  ownKeys() {
    throw new Error(
      'Getting model keys is disallowed. If you want to use object spread on the current data, do { ...model.$attributes }',
    );
  },
};
