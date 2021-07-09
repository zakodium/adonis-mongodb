/* eslint-disable @typescript-eslint/no-explicit-any */

export const proxyHandler = {
  get(target: any, prop: string) {
    if (typeof target[prop] !== 'undefined') {
      return Reflect.get(target, prop);
    }
    return Reflect.get(target.$currentData, prop);
  },
  set(target: any, prop: string, value: any) {
    if (typeof target[prop] !== 'undefined') {
      return Reflect.set(target, prop, value);
    }
    return Reflect.set(target.$currentData, prop, value);
  },
};
