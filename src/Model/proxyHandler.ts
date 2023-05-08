/* eslint-disable @typescript-eslint/no-explicit-any */

export const proxyHandler: ProxyHandler<any> = {
  get(target: any, prop: string | symbol) {
    if (target[prop] !== undefined) {
      return Reflect.get(target, prop);
    }
    return Reflect.get(target.$attributes, prop);
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
